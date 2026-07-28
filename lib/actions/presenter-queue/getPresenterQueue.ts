import { QueueMember } from '@/types/presenter-queue.types'
import { auth } from '../../auth/auth'
import prisma from '@/prisma/client'
import { chapterId } from '../../constants/api/chapterId'

export async function getPresenterQueue(): Promise<{
  success: boolean
  data?: QueueMember[]
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const queue = await prisma.presenterQueue.findMany({
      where: { chapterId },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        userId: true,
        position: true,
        user: { select: { name: true, company: true, industry: true } }
      }
    })

    return {
      success: true,
      data: queue.map((q) => ({
        id: q.id,
        userId: q.userId,
        name: q.user.name ?? '',
        company: q.user.company ?? '',
        industry: q.user.industry ?? '',
        position: q.position
      }))
    }
  } catch (error) {
    return { success: false, error: 'Failed to load queue' }
  }
}
