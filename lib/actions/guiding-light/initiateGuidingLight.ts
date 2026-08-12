'use server'

import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { auth } from '@/lib/auth/auth'
import { pusher } from '@/lib/pusher/pusher'

export async function initiateGuidingLight() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }

  // Get last week's winner to be the judge
  const last = await prisma.guidingLight.findFirst({
    where: { chapterId, status: 'REVEALED' },
    orderBy: { meetingDate: 'desc' },
    select: { winnerId: true }
  })

  const today = new Date()
  const record = await prisma.guidingLight.create({
    data: {
      chapterId,
      meetingDate: today,
      judgedById: last?.winnerId ?? null,
      status: 'OPEN'
    }
  })

  // Fire pusher event to the judge's phone
  await pusher.trigger('guiding-light', 'round-opened', {
    guidingLightId: record.id,
    judgeId: last?.winnerId ?? null
  })

  return { success: true, data: record }
}
