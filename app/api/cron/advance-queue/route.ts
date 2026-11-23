import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import { toDateKey } from '@/lib/utils/date.utils'
import { claimKey, claimRun, parseCampaignFlags, runPeriod } from '@/lib/email/campaign'
import { prismaClaimStore } from '@/lib/email/campaignStore'
import { requireCron } from '@/lib/email/requireCron'

// Sends no email, but it reorders the presenter queue: a second delivery of the same cron on the same day would
// advance it twice. Authorized like the email jobs, ?dryRun=1 shows who would move, and one run per day is claimed.
export async function GET(req: NextRequest) {
  const denied = requireCron(req)
  if (denied) return denied
  const flags = parseCampaignFlags(req.url)
  let release = async () => {}
  try {
    const queue = await prisma.presenterQueue.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, position: true, user: { select: { name: true } } }
    })

    if (!queue.length) return NextResponse.json({ success: true, message: 'No queue' })

    // Check if yesterday (Thursday) was a real meeting
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const lastThursday = new Date(now)
    lastThursday.setDate(now.getDate() - 1)

    const key = toDateKey(lastThursday)
    const cancelledDates = (await prisma.cancelledMeeting.findMany({ select: { date: true } })).map((m) =>
      toDateKey(m.date)
    )
    const visitorDates = (await prisma.visitorDay.findMany({ select: { date: true } })).map((v) => toDateKey(v.date))

    if (cancelledDates.includes(key) || visitorDates.includes(key)) {
      return NextResponse.json({ success: true, message: 'No meeting yesterday — queue not advanced' })
    }

    // Move first person to last position using temp to avoid unique constraint
    const first = queue[0]

    if (flags.dryRun) {
      return NextResponse.json({ dryRun: true, wouldMoveToEnd: first.user.name, queueLength: queue.length })
    }
    if (!flags.force) {
      const claim = await claimRun(prismaClaimStore, claimKey('advance-queue', runPeriod()))
      if (!claim.claimed) {
        return NextResponse.json({ success: true, skipped: true, message: 'Queue already advanced today (add ?force=1 to do it again on purpose)' })
      }
      release = claim.release
    }

    const offset = 1000

    await prisma.$transaction(async (tx) => {
      // Step 1 — shift all to large offset
      for (const q of queue) {
        await tx.presenterQueue.update({
          where: { id: q.id },
          data: { position: q.position + offset }
        })
      }

      // Step 2 — set real positions (first goes to last)
      const reordered = [...queue.slice(1), queue[0]]
      for (let i = 0; i < reordered.length; i++) {
        await tx.presenterQueue.update({
          where: { id: reordered[i].id },
          data: { position: i }
        })
      }
    })

    return NextResponse.json({ success: true, message: `${first.user.name} moved to end of queue` })
  } catch (error) {
    await release() // a run that failed may be tried again
    console.error('advance queue error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
