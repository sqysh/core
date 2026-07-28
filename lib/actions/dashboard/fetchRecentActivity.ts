import prisma from '@/prisma/client'

export function fetchRecentActivity(userId: string) {
  return Promise.all([
    prisma.parley.findMany({
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
    prisma.treasureMap.findMany({
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
    prisma.anchor.findMany({
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
  ]).then(([recentParleys, recentMaps, recentAnchors]) => ({
    recentParleys,
    recentMaps,
    recentAnchors
  }))
}
