'use server'

import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { etDateISO } from '@/lib/utils/date.utils'
import { canRunRound } from './canRunRound'
import { selectGuidingLightWinner } from './selectGuidingLightWinner'

// The host picks the Guiding Light herself from the remote: the same pick and TV
// reveal as the judge's phone, on today's open round.
export async function hostPickWinner(winnerId: string) {
  if (!(await canRunRound())) return { success: false, error: 'Unauthorized' }

  const todayStart = new Date(`${await etDateISO()}T00:00:00Z`)
  const round = await prisma.guidingLight.findFirst({
    where: { chapterId, status: 'OPEN', meetingDate: { gte: todayStart } },
    orderBy: { meetingDate: 'desc' },
    select: { id: true }
  })
  if (!round) return { success: false, error: 'No open round today' }

  return selectGuidingLightWinner(round.id, winnerId)
}
