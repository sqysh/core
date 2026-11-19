import prisma from '@/prisma/client'

export async function fetchAllTimeStats(userId: string) {
  const [totalOneTwoOnes, totalReferrals, totalClosedBusinesses] = await Promise.all([
    prisma.oneTwoOne.count({
      where: { OR: [{ requesterId: userId }, { recipientId: userId }] }
    }),
    prisma.referral.count({
      where: { OR: [{ giverId: userId }, { receiverId: userId }] }
    }),
    prisma.closedBusiness.findMany({
      where: { OR: [{ giverId: userId }, { receiverId: userId }] },
      select: { businessValue: true }
    })
  ])
  return {
    totalOneTwoOnes,
    totalReferrals,
    totalClosedBusinesses
  }
}
