'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { LeadershipPosition } from '@prisma/client'
import { pusher } from '@/lib/pusher/pusher'
import { ELECTED_POSITIONS } from '@/lib/constants/leadership.constants'

export async function submitBallot(picks: Record<LeadershipPosition, string>) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  const year = new Date().getFullYear()

  const election = await prisma.election.findUnique({
    where: { chapterId_year: { chapterId, year } },
    select: { id: true, status: true }
  })

  if (!election) return { success: false, error: 'No election found' }
  if (election.status !== 'VOTING_OPEN') return { success: false, error: 'Voting is closed' }

  const missing = ELECTED_POSITIONS.filter((p) => !picks[p])
  if (missing.length) return { success: false, error: 'Every position needs a pick' }

  const already = await prisma.ballot.findFirst({
    where: { electionId: election.id, voterId: session.user.id },
    select: { id: true }
  })
  if (already) return { success: false, error: 'You already voted' }

  await prisma.ballot.createMany({
    data: ELECTED_POSITIONS.map((position) => ({
      electionId: election.id,
      voterId: session.user.id,
      position,
      votedForId: picks[position]
    })),
    skipDuplicates: true
  })

  const voterCount = await prisma.ballot
    .findMany({
      where: { electionId: election.id },
      select: { voterId: true },
      distinct: ['voterId']
    })
    .then((rows) => rows.length)

  await pusher.trigger('election-status', 'ballot-submitted', {
    voterId: session.user.id,
    voterCount
  })

  return { success: true }
}
