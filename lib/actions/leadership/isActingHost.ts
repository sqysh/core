import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'

export async function isActingHost(userId: string) {
  const term = await prisma.leadershipTerm.findFirst({
    where: { chapterId, isActive: true, position: 'HOST' },
    select: { holderId: true }
  })
  return term?.holderId === userId
}
