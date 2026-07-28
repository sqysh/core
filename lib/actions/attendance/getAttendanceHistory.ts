'use server'

import prisma from '@/prisma/client'
import { chapterId } from '../../constants/api/chapterId'
import { auth } from '../../auth/auth'

export interface AttendanceMember {
  id: string
  name: string
}

export interface AttendanceRow {
  id: string
  date: string // YYYY-MM-DD
  attendedIds: string[]
  checkedInTimes: Record<string, string>
  reinstatedUserIds: Set<string>
}

export async function getAttendanceHistory(): Promise<{
  success: boolean
  data?: {
    members: AttendanceMember[]
    rows: AttendanceRow[]
  }
  error?: string
}> {
  const session = await auth()
  try {
    const [members, meetings, corrections] = await Promise.all([
      prisma.user
        .findMany({
          where: { chapterId, membershipStatus: 'ACTIVE' },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        })
        .catch(() => []),

      prisma.meeting
        .findMany({
          where: { chapterId },
          orderBy: { date: 'desc' },
          select: {
            id: true,
            date: true,
            attendances: {
              select: { userId: true, createdAt: true }
            }
          }
        })
        .catch(() => []),
      prisma.order.findMany({
        where: {
          userId: session.user.id,
          type: 'ATTENDANCE_CORRECTION'
        },
        select: { meetingId: true, userId: true }
      })
    ])

    const rows: AttendanceRow[] = meetings.map((m) => ({
      id: m.id,
      date: m.date.toISOString().slice(0, 10),
      attendedIds: m.attendances.map((a) => a.userId),
      reinstatedUserIds: new Set(corrections.filter((c) => c.meetingId === m.id).map((c) => c.userId)),
      checkedInTimes: Object.fromEntries(
        m.attendances.map((a) => [
          a.userId,
          a.createdAt.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/New_York'
          })
        ])
      )
    }))

    return {
      success: true,
      data: { members, rows }
    }
  } catch (err) {
    console.error('[getAttendanceHistory]', err)
    return { success: false, error: 'Failed to load attendance history' }
  }
}
