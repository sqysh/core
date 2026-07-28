'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth/auth'
import { chapterId } from '../../constants/api/chapterId'

export async function addToQueue(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const last = await prisma.presenterQueue.findFirst({
      where: { chapterId },
      orderBy: { position: 'desc' },
      select: { position: true }
    })

    await prisma.presenterQueue.create({
      data: { userId, chapterId, position: (last?.position ?? -1) + 1 }
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to add member to queue' }
  }
}
