'use server'

import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { pusher } from '@/lib/pusher/pusher'
import { etDateISO } from '@/lib/utils/date.utils'
import { canRunRound } from './canRunRound'

// judgeId lets the host take the judge seat herself instead of the last winner.
export async function initiateGuidingLight({ judgeId }: { judgeId?: string } = {}) {
  const userId = await canRunRound()
  if (!userId) return { success: false, error: 'Unauthorized' }

  // Get last week's winner to be the judge
  const last = await prisma.guidingLight.findFirst({
    where: { chapterId, status: 'REVEALED' },
    orderBy: { meetingDate: 'desc' },
    select: { winnerId: true }
  })

  // a round already started (or deferred) today is picked back up, not duplicated
  const todayStart = new Date(`${await etDateISO()}T00:00:00Z`)
  const existing = await prisma.guidingLight.findFirst({
    where: { chapterId, status: { in: ['OPEN', 'DEFERRED'] }, meetingDate: { gte: todayStart } },
    orderBy: { meetingDate: 'desc' },
    select: { id: true, judgedById: true }
  })

  const judge = judgeId ?? existing?.judgedById ?? last?.winnerId ?? null
  const record = existing
    ? await prisma.guidingLight.update({ where: { id: existing.id }, data: { status: 'OPEN', judgedById: judge } })
    : await prisma.guidingLight.create({
        data: { chapterId, meetingDate: new Date(), judgedById: judge, status: 'OPEN' }
      })

  // Fire pusher event to the judge's phone
  await pusher.trigger('guiding-light', 'round-opened', {
    guidingLightId: record.id,
    judgeId: judge
  })

  return { success: true, data: record }
}
