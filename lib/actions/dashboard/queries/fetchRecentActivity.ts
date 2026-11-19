import prisma from '@/prisma/client'

export async function fetchRecentActivity(userId: string) {
  const [recentOneTwoOnes, recentMaps, recentClosedBusinesses] = await Promise.all([
    prisma.oneTwoOne.findMany({
      where: { OR: [{ requesterId: userId }, { recipientId: userId }] },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        requesterId: true,
        requester: { select: { name: true } },
        recipient: { select: { name: true } }
      }
    }),
    prisma.referral.findMany({
      where: { OR: [{ giverId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        giverId: true,
        clientName: true,
        clientPhone: true,
        giver: { select: { name: true } },
        receiver: { select: { name: true } }
      }
    }),
    prisma.closedBusiness.findMany({
      where: { OR: [{ giverId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        businessValue: true,
        receiverId: true,
        giver: { select: { name: true } },
        receiver: { select: { name: true } }
      }
    })
  ])
  return {
    recentOneTwoOnes,
    recentMaps,
    recentClosedBusinesses
  }
}
