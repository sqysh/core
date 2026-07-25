'use server'

import { auth } from '@/app/lib/auth/auth'
import { chapterId } from '../../constants/api/chapterId'
import prisma from '@/prisma/client'
import { UserAttendanceRow } from '@/types/attendance.types'

export async function getUserAttendance(): Promise<{
  success: boolean
  data?: {
    rows: UserAttendanceRow[]
    attended: number
    total: number
  }
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  try {
    const meetings = await prisma.meeting.findMany({
      where: { chapterId },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        attendances: {
          where: { userId: session.user.id },
          select: { id: true }
        }
      }
    })

    const corrections = await prisma.order.findMany({
      where: {
        userId: session.user.id,
        type: 'ATTENDANCE_CORRECTION'
      },
      select: { meetingId: true }
    })

    const correctedMeetingIds = new Set(corrections.map((c) => c.meetingId).filter(Boolean))

    const rows: UserAttendanceRow[] = meetings.map((m) => ({
      meetingId: m.id,
      date: m.date.toISOString().slice(0, 10),
      attended: m.attendances.length > 0,
      reinstated: correctedMeetingIds.has(m.id)
    }))

    const attended = rows.filter((r) => r.attended).length

    return {
      success: true,
      data: { rows, attended, total: rows.length }
    }
  } catch (err) {
    console.error('[getUserAttendance]', err)
    return { success: false, error: 'Failed to load attendance' }
  }
}
