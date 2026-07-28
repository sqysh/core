import prisma from '@/prisma/client'
import { toDateKey } from '../../utils/date.utils'

export async function getClosestVisitorDay(): Promise<string | null> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const visitorDay = await prisma.visitorDay.findFirst({
    where: {
      date: { gte: today }
    },
    orderBy: { date: 'asc' },
    select: { date: true }
  })

  if (!visitorDay) return null

  // Return as YYYY-MM-DD to pre-fill the visit date input
  return toDateKey(visitorDay.date)
}
