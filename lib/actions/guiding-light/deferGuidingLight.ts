'use server'

import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { pusher } from '@/lib/pusher/pusher'
import { etDateISO } from '@/lib/utils/date.utils'
import { canRunRound } from './canRunRound'

// No Guiding Light this week: record it as deferred. The judge stays whoever won last
// (initiateGuidingLight reads the last REVEALED winner), so next week picks up where
// this one left off.
// guidingLightId defers that specific unfinished round (the super page); without it, today's.
export async function deferGuidingLight(guidingLightId?: string) {
  if (!(await canRunRound())) return { success: false, error: 'Unauthorized' }

  const todayStart = new Date(`${await etDateISO()}T00:00:00Z`)
  const today = await prisma.guidingLight.findFirst({
    where: guidingLightId ? { id: guidingLightId, chapterId } : { chapterId, meetingDate: { gte: todayStart } },
    orderBy: { meetingDate: 'desc' },
    select: { id: true, status: true, judgedById: true }
  })
  if (today?.status === 'REVEALED') return { success: false, error: 'Today’s Guiding Light is already picked' }

  const last = await prisma.guidingLight.findFirst({
    where: { chapterId, status: 'REVEALED' },
    orderBy: { meetingDate: 'desc' },
    select: { winnerId: true }
  })

  if (today) {
    await prisma.$transaction([
      prisma.guidingLightNominee.deleteMany({ where: { guidingLightId: today.id } }),
      prisma.guidingLight.update({ where: { id: today.id }, data: { status: 'DEFERRED' } })
    ])
    // an open round may be on the judge's phone
    await pusher.trigger('guiding-light', 'round-reset', { guidingLightId: today.id })
    return { success: true }
  }

  await prisma.guidingLight.create({
    data: { chapterId, meetingDate: new Date(), judgedById: last?.winnerId ?? null, status: 'DEFERRED' }
  })
  return { success: true }
}
