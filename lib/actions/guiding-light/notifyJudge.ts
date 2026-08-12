'use server'

import { auth } from '@/lib/auth/auth'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { pusher } from '@/lib/pusher/pusher'

export async function notifyJudge() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }

  const round = await prisma.guidingLight.findFirst({
    where: { chapterId, status: 'OPEN' },
    orderBy: { meetingDate: 'desc' },
    select: { id: true, judgedById: true }
  })

  if (!round) return { success: false, error: 'No open round' }

  await pusher.trigger('guiding-light', 'round-opened', {
    guidingLightId: round.id,
    judgeId: round.judgedById
  })

  return { success: true }
}
