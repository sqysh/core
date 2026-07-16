'use server'

import prisma from '@/prisma/client'
import { auth } from '@/app/lib/auth'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import { createLog } from '@/app/lib/utils/api/createLog'

export async function createMeeting(dateISO: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (session?.user?.role !== 'SUPER_USER') return { success: false, error: 'Not allowed' }

    // Normalize to local midnight, matching how check-in creates meetings.
    const [y, m, d] = dateISO.split('-').map(Number)
    const date = new Date(y, m - 1, d)

    // Don't create a duplicate for a date that already has a meeting.
    const existing = await prisma.meeting.findFirst({
      where: { chapterId, date }
    })
    if (existing) return { success: false, error: 'A meeting already exists for that date' }

    await prisma.meeting.create({ data: { chapterId, date } })

    await createLog('info', 'Meeting created manually', {
      action: 'MEETING_CREATED',
      userId: session.user.id,
      date: dateISO
    })

    return { success: true }
  } catch (error) {
    await createLog('error', 'createMeeting failed', {
      name: 'CreateMeetingError',
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: 'Failed to create meeting' }
  }
}
