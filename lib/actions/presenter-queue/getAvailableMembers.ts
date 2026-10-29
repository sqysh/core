import prisma from '@/prisma/client'
import { auth } from '../../auth/auth'
import { chapterId } from '../../constants/api/chapterId'

export async function getAvailableMembers(): Promise<{
  success: boolean
  data?: { id: string; name: string; company: string }[]
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const inQueue = await prisma.presenterQueue.findMany({
      where: { chapterId },
      select: { userId: true }
    })
    const inQueueIds = new Set(inQueue.map((q) => q.userId))

    console.log('chapterId', chapterId)
    console.log('inQueue count', inQueueIds.size)

    const total = await prisma.user.count({ where: { chapterId, membershipStatus: 'ACTIVE' } })
    console.log('active in chapter', total)

    const members = await prisma.user.findMany({
      where: {
        chapterId,
        membershipStatus: 'ACTIVE',
        id: { notIn: [...inQueueIds] }
      },
      select: { id: true, name: true, company: true },
      orderBy: { name: 'asc' }
    })

    return {
      success: true,
      data: members.map((m) => ({
        id: m.id,
        name: m.name ?? '',
        company: m.company ?? ''
      }))
    }
  } catch (error) {
    return { success: false, error: 'Failed to load members' }
  }
}
