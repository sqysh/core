import prisma from '@/prisma/client'

export async function fetchAllTimeStats(userId: string) {
  const [totalParleys, totalTreasureMaps, totalAnchors] = await Promise.all([
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
  ])
  return {
    totalParleys,
    totalTreasureMaps,
    totalAnchors
  }
}
