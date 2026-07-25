'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth/auth'
import { chapterId } from '../../constants/api/chapterId'

export async function cancelMeeting(data: {
  date: string
  reason?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    await prisma.cancelledMeeting.create({
      data: {
        date: new Date(data.date),
        reason: data.reason || null,
        chapterId
      }
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to cancel meeting' }
  }
}
