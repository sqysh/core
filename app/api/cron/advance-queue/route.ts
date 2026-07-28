import { NextResponse } from 'next/server'
import prisma from '@/prisma/client'
import { toDateKey } from '@/lib/utils/date.utils'

export async function GET() {
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
    console.error('advance queue error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
