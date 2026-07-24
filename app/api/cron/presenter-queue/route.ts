import { createLog } from '@/app/lib/utils/api/createLog'
import { resend } from '@/app/lib/resend'
import prisma from '@/prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { presenterQueueTemplate } from '@/app/lib/email/presenter-queue.template'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import { buildSchedule, getUpcomingMeetingDates } from '@/app/lib/utils/presenter-engine.utils'
import { fmtDate } from '@/app/lib/utils/date.utils'
import { getAllUpcomingThursdays } from '@/app/lib/utils/attendance.utils'

const BATCH_SIZE = 2
const DELAY_MS = 1000

async function sendPresenterQueue(req: NextRequest) {
  const BASE_URL =
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://coastalreferralxchange.com'
  const normalizedUrl = `${BASE_URL}/api/cron/presenter-queue`

  try {
    const [members, queue, cancelledMeetings, visitorDays] = await Promise.all([
      prisma.user.findMany({
        where: { chapterId, membershipStatus: 'ACTIVE' },
        select: { id: true, name: true, email: true }
      }),
      prisma.presenterQueue.findMany({
        where: { chapterId },
        orderBy: { position: 'asc' },
        select: {
          userId: true,
          position: true,
          createdAt: true,
          user: { select: { name: true, company: true } }
        }
      }),
      prisma.cancelledMeeting.findMany({ where: { chapterId }, select: { date: true } }),
      prisma.visitorDay.findMany({ where: { chapterId }, select: { date: true } })
    ])

    const cancelledDates = cancelledMeetings.map((m) => m.date.toISOString())
    const visitorDates = visitorDays.map((v) => v.date.toISOString())

    const startIndex = 0

    const dates = getUpcomingMeetingDates(cancelledDates, visitorDates, 52)
    const scheduled = buildSchedule(
      queue.map((q) => ({ userId: q.userId, name: q.user.name ?? '', position: q.position })),
      dates.map((d) => new Date(`${d}T12:00:00`)),
      startIndex
    )

    const allThursdays = getAllUpcomingThursdays(52)

    let scheduledIndex = 0
    const schedule = allThursdays.slice(0, 8).map((dateStr) => {
      if (cancelledDates.some((d) => d.slice(0, 10) === dateStr)) {
        return {
          name: 'No Meeting',
          company: 'Cancelled',
          date: fmtDate(`${dateStr}T12:00:00`),
          isNext: false,
          type: 'off' as const
        }
      }
      if (visitorDates.some((d) => d.slice(0, 10) === dateStr)) {
        return {
          name: 'Visitor Day',
          company: 'Open to guests',
          date: fmtDate(`${dateStr}T12:00:00`),
          isNext: false,
          type: 'visitor' as const
        }
      }

      const s = scheduled[scheduledIndex]
      const isNext = scheduledIndex === 0
      scheduledIndex++

      return {
        name: s?.name ?? '',
        company: queue.find((q) => q.userId === s?.userId)?.user.company ?? '',
        date: fmtDate(`${dateStr}T12:00:00`),
        isNext,
        type: 'presenter' as const
      }
    })

    const results = []

    for (let i = 0; i < members.length; i += BATCH_SIZE) {
      const batch = members.slice(i, i + BATCH_SIZE)

      const batchResults = await Promise.all(
        batch.map(async (member) => {
          try {
            const result = await resend.emails.send({
              from: `Coastal Referral Exchange <core@coastalreferralxchange.com>`,
              to: member.email,
              subject: `Presenter Schedule — This Week & Upcoming`,
              html: presenterQueueTemplate(
                member.name.split(' ')[0] || member.email.split('@')[0],
                schedule,
                `${BASE_URL}/dashboard`
              )
            })
            console.log(`✅ Sent to ${member.email}`)
            return { success: true, email: member.email, result }
          } catch (error) {
            console.error(`❌ Failed to send to ${member.email}:`, error)
            return {
              success: false,
              email: member.email,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        })
      )

      results.push(...batchResults)

      if (i + BATCH_SIZE < members.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
      }
    }

    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length
    const failedEmails = results.filter((r) => !r.success).map((r) => ({ email: r.email, error: r.error }))

    await createLog('info', `Presenter queue emails sent — ${successful}/${members.length}`, {
      location: ['app route - GET /api/cron/presenter-queue'],
      name: 'PresenterQueueEmailsSent',
      timestamp: new Date().toISOString(),
      url: normalizedUrl,
      method: req.method
    })

    if (failed > 0) {
      await createLog('error', `Some presenter queue emails failed`, {
        location: ['app route - GET /api/cron/presenter-queue'],
        name: 'PresenterQueueEmailsPartialFailure',
        timestamp: new Date().toISOString(),
        metadata: { failedCount: failed, failures: failedEmails }
      })
    }

    return NextResponse.json({ success: true, sent: successful, failed }) // ← was missing
  } catch (error) {
    await createLog('error', `Presenter queue cron failed`, {
      location: ['app route - GET /api/cron/presenter-queue'],
      name: 'PresenterQueueCronError',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json({ success: false, error: 'Failed to send presenter queue emails' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    return await sendPresenterQueue(req)
  } catch (error) {
    console.error('Unhandled error in presenter queue route:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    return await sendPresenterQueue(req)
  } catch (error) {
    console.error('Unhandled error in presenter queue route:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
