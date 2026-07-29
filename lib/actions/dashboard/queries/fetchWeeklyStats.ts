import prisma from '@/prisma/client'

export async function fetchWeeklyStats(userId: string, startOfWeek: Date) {
  const [parleyThisWeek, treasureMapsThisWeek, anchorsThisWeek] = await Promise.all([
    prisma.parley.count({
      where: {
        OR: [{ requesterId: userId }, { recipientId: userId }],
        scheduledAt: { gte: startOfWeek }
      }
    }),
    prisma.treasureMap.count({
      where: {
        OR: [{ giverId: userId }, { receiverId: userId }],
        createdAt: { gte: startOfWeek }
      }
    }),
    prisma.anchor.findMany({
      where: {
        OR: [{ giverId: userId }, { receiverId: userId }],
        closedDate: { gte: startOfWeek }
      },
      select: { businessValue: true }
    })
  ])
  return {
    parleyThisWeek,
    treasureMapsThisWeek,
    anchorsThisWeek
  }
}
