import prisma from '@/prisma/client'
import { User } from '@/types/user.types'

export async function getOtherActiveMembers(user: Pick<User, 'chapterId' | 'id'>) {
  const members = await prisma.user.findMany({
    where: {
      chapterId: user.chapterId ?? undefined,
      id: { not: user.id },
      membershipStatus: 'ACTIVE'
    },
    select: { id: true, name: true, industry: true, phone: true, email: true, weeklyTreasureWishlist: true },
    orderBy: { name: 'asc' }
  })

  return members
}
