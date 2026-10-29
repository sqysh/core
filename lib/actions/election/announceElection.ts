'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { pusher } from '@/lib/pusher/pusher'

export async function announceElection() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'SUPER_USER') {
    return { success: false, error: 'Unauthorized' }
  }

  const year = new Date().getFullYear()

  const election = await prisma.election.findUnique({
    where: { chapterId_year: { chapterId, year } },
    select: { id: true, status: true }
  })

  if (!election) return { success: false, error: 'No election found. Open it first.' }
  if (election.status !== 'VOTING_OPEN') return { success: false, error: 'Voting is closed' }

  await pusher.trigger('election', 'voting-opened', { electionId: election.id, year })

  return { success: true }
}
