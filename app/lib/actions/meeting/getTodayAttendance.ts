'use server'

import prisma from '@/prisma/client'
import { chapterId } from '../../constants/api/chapterId'

export async function getTodayAttendance(): Promise<string[]> {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

  const meeting = await prisma.meeting
    .findFirst({
      where: { chapterId, date: { gte: start, lt: end } },
      select: {
        attendances: {
          orderBy: { createdAt: 'asc' },
          select: {
            user: { select: { id: true, name: true, company: true } }
          }
        }
      }
    })
    .catch(() => null)

  if (!meeting) return []

  return meeting.attendances.map((a: { user: { id: any } }) => a.user.id)
}
