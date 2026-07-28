import prisma from '@/prisma/client'

export function fetchAllTimeStats(userId: string) {
  return Promise.all([
    prisma.parley.count({
      where: { OR: [{ requesterId: userId }, { recipientId: userId }] }
    }),
    prisma.treasureMap.count({
      where: { OR: [{ giverId: userId }, { receiverId: userId }] }
    }),
    prisma.anchor.findMany({
      where: { OR: [{ giverId: userId }, { receiverId: userId }] },
      select: { businessValue: true }
    })
  ]).then(([totalParleys, totalTreasureMaps, totalAnchors]) => ({
    totalParleys,
    totalTreasureMaps,
    totalAnchors
  }))
}
