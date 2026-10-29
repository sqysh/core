'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { pusher } from '@/lib/pusher/pusher'
import { ELECTED_POSITIONS, POSITIONS } from '@/lib/constants/leadership.constants'
import { LeadershipPosition, QuestionAnswer } from '@prisma/client'
import { BALLOT_QUESTIONS } from '@/lib/constants/questions.constants'

export async function submitBallot(
  picks: Record<LeadershipPosition, string[]>,
  answers: Record<string, QuestionAnswer>
) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  const year = new Date().getFullYear()

  const election = await prisma.election.findUnique({
    where: { chapterId_year: { chapterId, year } },
    select: { id: true, status: true }
  })

  if (!election) return { success: false, error: 'No election found' }
  if (election.status !== 'VOTING_OPEN') return { success: false, error: 'Voting is closed' }

  for (const position of ELECTED_POSITIONS) {
    const chosen = picks[position] ?? []
    const seats = POSITIONS[position].seats
    if (chosen.length !== seats) {
      return { success: false, error: `${POSITIONS[position].label} needs ${seats} ${seats === 1 ? 'pick' : 'picks'}` }
    }
    if (new Set(chosen).size !== chosen.length) {
      return { success: false, error: `Duplicate pick in ${POSITIONS[position].label}` }
    }
  }

  for (const q of BALLOT_QUESTIONS) {
    if (!answers[q.key]) return { success: false, error: `Please answer: ${q.title}` }
  }

  const already = await prisma.ballot.findFirst({
    where: { electionId: election.id, voterId: session.user.id },
    select: { id: true }
  })
  if (already) return { success: false, error: 'You already voted' }

  await prisma.ballot.createMany({
    data: ELECTED_POSITIONS.flatMap((position) =>
      picks[position].map((votedForId) => ({
        electionId: election.id,
        voterId: session.user.id,
        position,
        votedForId
      }))
    ),
    skipDuplicates: true
  })

  await prisma.questionResponse.createMany({
    data: BALLOT_QUESTIONS.map((q) => ({
      electionId: election.id,
      voterId: session.user.id,
      questionKey: q.key,
      answer: answers[q.key]
    })),
    skipDuplicates: true
  })

  const voterCount = await prisma.ballot
    .findMany({ where: { electionId: election.id }, select: { voterId: true }, distinct: ['voterId'] })
    .then((rows) => rows.length)

  await pusher.trigger('election-status', 'ballot-submitted', { voterId: session.user.id, voterCount })

  return { success: true }
}
