'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth/auth'

export async function restoreMeeting(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    await prisma.cancelledMeeting.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to restore meeting' }
  }
}
