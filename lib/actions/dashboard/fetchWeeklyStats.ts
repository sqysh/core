import prisma from '@/prisma/client'

export function fetchWeeklyStats(userId: string, startOfWeek: Date) {
  return Promise.all([
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
  ]).then(([parleyThisWeek, treasureMapsThisWeek, anchorsThisWeek]) => ({
    parleyThisWeek,
    treasureMapsThisWeek,
    anchorsThisWeek
  }))
}
