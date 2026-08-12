'use server'

import { auth } from '@/lib/auth/auth'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { pusher } from '@/lib/pusher/pusher'

export async function refireReveal() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }

  const round = await prisma.guidingLight.findFirst({
    where: { chapterId, status: 'REVEALED' },
    orderBy: { meetingDate: 'desc' },
    select: {
      id: true,
      judgedById: true,
      winner: { select: { id: true, name: true, company: true, profileImage: true } },
      judgedBy: { select: { id: true, name: true } }
    }
  })

  if (!round?.winner) return { success: false, error: 'No revealed round found' }

  await pusher.trigger('guiding-light', 'winner-selected', {
    guidingLightId: round.id,
    winner: round.winner,
    judgedBy: round.judgedBy,
    judgeId: round.judgedById
  })

  return { success: true }
}
