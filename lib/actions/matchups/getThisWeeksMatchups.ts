'use server'

import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { Matchup } from '@/lib/constants/stage.constants'

// The 1-2-1s to put on the TV: parleys scheduled from this morning through the
// next seven days that haven't happened yet. "Find your partner, get it on the
// calendar before you leave."
export async function getThisWeeksMatchups(): Promise<Matchup[]> {
  const todayISO = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
  const from = new Date(`${todayISO}T00:00:00Z`)
  const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000)

  const parleys = await prisma.parley.findMany({
    where: {
      chapterId,
      completed: false,
      status: { not: 'CANCELLED' },
      scheduledAt: { gte: from, lt: to }
    },
    orderBy: { scheduledAt: 'asc' },
    select: {
      requester: { select: { id: true, name: true, company: true } },
      recipient: { select: { id: true, name: true, company: true } }
    }
  })

  return parleys.map((p) => ({
    a: { id: p.requester.id, name: p.requester.name ?? '', company: p.requester.company ?? null },
    b: { id: p.recipient.id, name: p.recipient.name ?? '', company: p.recipient.company ?? null }
  }))
}
