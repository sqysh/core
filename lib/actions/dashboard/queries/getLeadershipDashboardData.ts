import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'

export async function getLeadershipDashboardData() {
  const terms = await prisma.leadershipTerm.findMany({
    where: { chapterId, isActive: true },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      position: true,
      startDate: true,
      holder: { select: { id: true, name: true, company: true, profileImage: true } }
    }
  })

  if (terms.length === 0) return { season: null, seats: [], totalSeats: 0 }

  const y = terms[0].startDate.getUTCFullYear()

  return {
    season: `${y}-${y + 1}`,
    totalSeats: terms.length,
    seats: terms.map((t) => ({
      id: t.id,
      position: t.position,
      holder: t.holder
    }))
  }
}
