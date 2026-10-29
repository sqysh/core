'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'

export async function recordPastRound(input: {
  meetingDate: string // YYYY-MM-DD
  judgedById: string
  winnerId: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }
    if (session.user.role !== 'SUPER_USER') return { success: false, error: 'Forbidden' }

    const { meetingDate, judgedById, winnerId } = input
    if (!meetingDate || !judgedById || !winnerId) return { success: false, error: 'Missing fields' }
    if (judgedById === winnerId) return { success: false, error: 'Judge and winner must differ' }

    await prisma.guidingLight.create({
      data: {
        chapterId,
        meetingDate: new Date(`${meetingDate}T12:00:00Z`),
        judgedById,
        winnerId,
        status: 'REVEALED'
      }
    })

    return { success: true }
  } catch (error) {
    console.error('recordPastRound failed', error)
    return { success: false, error: 'Failed to record round' }
  }
}
