'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { pusher } from '@/lib/pusher/pusher'
import { LeadershipPosition } from '@prisma/client'

export async function resolveTie(position: LeadershipPosition, winnerId: string) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'SUPER_USER') {
    return { success: false, error: 'Unauthorized' }
  }

  const year = new Date().getFullYear()
  const election = await prisma.election.findUnique({
    where: { chapterId_year: { chapterId, year } },
    select: { id: true }
  })
  if (!election) return { success: false, error: 'No election found' }

  await pusher.trigger('election-status', 'tie-resolved', { position, winnerId })

  return { success: true }
}
