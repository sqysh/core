'use server'

import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { Matchup } from '@/lib/constants/stage.constants'

// The 1-2-1s to put on the TV: the pairs auto-matched for today's meeting. This
// mirrors the /matchups page query exactly (the same rows generateWeeklyMatches
// writes), so the TV shows what the host just generated.
export async function getThisWeeksMatchups(): Promise<Matchup[]> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const parleys = await prisma.parley.findMany({
    where: { chapterId, createdAt: { gte: start }, notes: 'Auto-matched weekly 1-2-1' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      requester: { select: { id: true, name: true, company: true, profileImage: true } },
      recipient: { select: { id: true, name: true, company: true, profileImage: true } }
    }
  })

  const shape = (u: { id: string; name: string | null; company: string | null; profileImage: string | null }) => ({
    id: u.id,
    name: u.name ?? '',
    company: u.company ?? '',
    profileImage: u.profileImage
  })

  return parleys.map((p) => ({ id: p.id, requester: shape(p.requester), recipient: shape(p.recipient) }))
}
