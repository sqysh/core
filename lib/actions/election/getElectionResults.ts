'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { POSITION_ORDER, POSITIONS, APPOINTED_EMAIL } from '@/lib/constants/leadership.constants'
import { LeadershipPosition } from '@prisma/client'

export interface PositionResult {
  position: LeadershipPosition
  label: string
  seats: number
  appointed: boolean
  tied: boolean
  winners: { id: string; name: string; company: string; profileImage: string | null; votes: number }[]
  runnersUp: { name: string; votes: number }[]
  tieCandidates: { id: string; name: string; company: string; profileImage: string | null; votes: number }[]
}

export async function getElectionResults() {
  const session = await auth()
  if (!session?.user?.id) return { success: false as const, error: 'Unauthorized' }

  const year = new Date().getFullYear()

  const election = await prisma.election.findUnique({
    where: { chapterId_year: { chapterId, year } },
    select: { id: true }
  })
  if (!election) return { success: false as const, error: 'No election found' }

  const [tally, members] = await Promise.all([
    prisma.ballot.groupBy({
      by: ['position', 'votedForId'],
      where: { electionId: election.id },
      _count: { votedForId: true }
    }),
    prisma.user.findMany({
      where: { chapterId, membershipStatus: 'ACTIVE' },
      select: { id: true, name: true, company: true, profileImage: true, email: true }
    })
  ])

  const byId = new Map(members.map((m) => [m.id, m]))
  const appointee = members.find((m) => m.email === APPOINTED_EMAIL)

  const results: PositionResult[] = POSITION_ORDER.map((position) => {
    const meta = POSITIONS[position]

    if (!meta.isElected) {
      return {
        position,
        label: meta.label,
        seats: meta.seats,
        appointed: true,
        tied: false,
        tieCandidates: [],
        winners: appointee
          ? [
              {
                id: appointee.id,
                name: appointee.name,
                company: appointee.company,
                profileImage: appointee.profileImage,
                votes: 0
              }
            ]
          : [],
        runnersUp: []
      }
    }

    // Name as the tiebreak keeps the order stable across reloads
    const ranked = tally
      .filter((t) => t.position === position)
      .map((t) => ({ member: byId.get(t.votedForId), votes: t._count.votedForId }))
      .filter((r): r is { member: NonNullable<typeof r.member>; votes: number } => !!r.member)
      .sort((a, b) => b.votes - a.votes || a.member.name.localeCompare(b.member.name))

    const winners = ranked.slice(0, meta.seats)
    const rest = ranked.slice(meta.seats)

    const lastSeatVotes = winners.length === meta.seats ? winners[winners.length - 1].votes : 0
    const tiedWith = rest.filter((r) => r.votes === lastSeatVotes)
    const tied = tiedWith.length > 0

    return {
      position,
      label: meta.label,
      seats: meta.seats,
      appointed: false,
      tied,
      // Everyone level on the final seat, including whoever currently holds it
      tieCandidates: tied
        ? [winners[winners.length - 1], ...tiedWith].map((c) => ({
            id: c.member.id,
            name: c.member.name,
            company: c.member.company,
            profileImage: c.member.profileImage,
            votes: c.votes
          }))
        : [],
      winners: winners.map((w) => ({
        id: w.member.id,
        name: w.member.name,
        company: w.member.company,
        profileImage: w.member.profileImage,
        votes: w.votes
      })),
      runnersUp: rest.slice(0, 3).map((r) => ({ name: r.member.name, votes: r.votes }))
    }
  })

  return { success: true as const, results }
}
