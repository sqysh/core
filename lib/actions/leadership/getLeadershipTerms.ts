'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'

export async function getLeadershipTerms() {
  const session = await auth()
  if (!session?.user?.id) return []

  const terms = await prisma.leadershipTerm.findMany({
    where: { chapterId },
    orderBy: [{ startDate: 'desc' }, { position: 'asc' }],
    select: {
      id: true,
      position: true,
      startDate: true,
      isActive: true,
      holder: { select: { id: true, name: true, company: true, profileImage: true } }
    }
  })

  return terms.map((t) => {
    const y = t.startDate.getUTCFullYear()
    return { ...t, startDate: t.startDate.toISOString(), season: `${y}-${y + 1}` }
  })
}
