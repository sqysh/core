'use server'

import { auth } from '@/app/lib/auth'
import prisma from '@/prisma/client'
import { chapterId } from '../../constants/api/chapterId'
import { pusher } from '../../pusher/pusher'
import { createLog } from '../../utils/api/createLog'
import { toDateKey } from '../../utils/date.utils'

export async function checkIn({ date }: { date?: string } = {}): Promise<{
  success: boolean
  alreadyCheckedIn?: boolean
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, company: true }
    })

    if (!user) return { success: false, error: 'User not found' }

    const hasDateParam = !!date

    if (!hasDateParam) {
      const now = new Date()
      const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))

      const day = estTime.getDay()
      const hour = estTime.getHours()
      const minute = estTime.getMinutes()
      const totalMinutes = hour * 60 + minute

      const isThursday = day === 4
      const isInWindow = totalMinutes >= 7 * 60 && totalMinutes <= 8 * 60 + 30

      if (!isThursday || !isInWindow) {
        return {
          success: false,
          error: 'Check-in is only available on Thursdays between 7:00 AM and 8:30 AM EST.'
        }
      }
    }

    // Get or create today's meeting
    const targetDate = date ? new Date(`${date}T12:00:00`) : new Date()
    const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())

    const meeting = await prisma.meeting.upsert({
      where: { chapterId_date: { chapterId, date: start } },
      create: { chapterId, date: start },
      update: {},
      select: { id: true }
    })

    // Check if already checked in
    const existing = await prisma.attendance.findUnique({
      where: { meetingId_userId: { meetingId: meeting.id, userId: user.id } }
    })

    if (existing) {
      return { success: true, alreadyCheckedIn: true }
    }

    // Create attendance record
    await prisma.attendance.create({
      data: { meetingId: meeting.id, userId: user.id }
    })

    // Broadcast to TV
    await pusher.trigger('meeting-attendance', 'check-in', {
      userId: user.id,
      name: user.name,
      company: user.company,
      checkedInAt: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/New_York'
      })
    })

    await createLog('info', `${user.name} checked in`, {
      action: 'CHECK_IN',
      userId: user.id,
      date: toDateKey(start)
    })

    return { success: true, alreadyCheckedIn: false }
  } catch (err) {
    console.error('[checkIn]', err)
    return { success: false, error: 'Failed to check in. Please try again.' }
  }
}
