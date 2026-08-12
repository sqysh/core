'use server'

import { auth } from '@/lib/auth/auth'
import { pusher } from '@/lib/pusher/pusher'
import prisma from '@/prisma/client'
import { sendGuidingLightWinnerEmail } from './sendGuidingLightWinnerEmail'

export async function selectGuidingLightWinner(guidingLightId: string, winnerId: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  const record = await prisma.$transaction(async (tx) => {
    await tx.guidingLightNominee.deleteMany({ where: { guidingLightId } })

    // Set winner and reveal
    return tx.guidingLight.update({
      where: { id: guidingLightId },
      data: { winnerId, status: 'REVEALED' },
      select: {
        id: true,
        winner: { select: { id: true, name: true, company: true, profileImage: true, email: true } },
        judgedBy: { select: { name: true } },
        judgedById: true
      }
    })
  })

  await pusher.trigger('guiding-light', 'winner-selected', {
    guidingLightId: record.id,
    winner: record.winner,
    judgedBy: record.judgedBy,
    judgeId: record.judgedById
  })

  await sendGuidingLightWinnerEmail({
    winnerName: record.winner.name,
    winnerEmail: record.winner.email,
    judgedByName: record.judgedBy?.name ?? 'the group',
    meetingDate: new Date()
  })

  return { success: true, data: record }
}
