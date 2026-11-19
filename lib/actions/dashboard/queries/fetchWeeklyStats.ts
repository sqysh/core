import prisma from '@/prisma/client'

export async function fetchWeeklyStats(userId: string, startOfWeek: Date) {
  const [oneTwoOneThisWeek, referralsThisWeek, closedBusinessesThisWeek] = await Promise.all([
    prisma.oneTwoOne.count({
      where: {
        OR: [{ requesterId: userId }, { recipientId: userId }],
        scheduledAt: { gte: startOfWeek }
      }
    }),
    prisma.referral.count({
      where: {
        OR: [{ giverId: userId }, { receiverId: userId }],
        createdAt: { gte: startOfWeek }
      }
    }),
    prisma.closedBusiness.findMany({
      where: {
        OR: [{ giverId: userId }, { receiverId: userId }],
        closedDate: { gte: startOfWeek }
      },
      select: { businessValue: true }
    })
  ])
  return {
    oneTwoOneThisWeek,
    referralsThisWeek,
    closedBusinessesThisWeek
  }
}
