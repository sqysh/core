import prisma from '@/prisma/client'

export async function getCancelledMeetings() {
  const now = new Date()

  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1)

  const cancelledMeetings = await prisma.cancelledMeeting.findMany({
    where: {
      date: {
        gte: startOfYear,
        lt: startOfNextYear
      }
    },
    select: {
      date: true,
      reason: true
    },
    orderBy: {
      date: 'asc'
    }
  })

  return cancelledMeetings
}
