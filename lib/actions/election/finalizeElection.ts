'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { LeadershipPosition } from '@prisma/client'

export async function finalizeElection(roster: Partial<Record<LeadershipPosition, string[]>>) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'SUPER_USER') {
    return { success: false, error: 'Unauthorized' }
  }

  const year = new Date().getFullYear()

  const election = await prisma.election.findUnique({
    where: { chapterId_year: { chapterId, year } },
    select: { id: true, status: true }
  })
  if (!election) return { success: false, error: 'No election found' }
  if (election.status === 'COMPLETE') return { success: false, error: 'Election already finalized' }

  const startDate = new Date(Date.UTC(year + 1, 0, 1))
  const endDate = new Date(Date.UTC(year + 1, 11, 31, 23, 59, 59))

  const rows = Object.entries(roster).flatMap(([position, holderIds]) =>
    (holderIds ?? []).map((holderId) => ({
      chapterId,
      position: position as LeadershipPosition,
      holderId,
      startDate,
      endDate,
      isActive: true
    }))
  )

  if (!rows.length) return { success: false, error: 'Roster is empty' }

  await prisma.$transaction([
    // The outgoing term ends when the new one begins
    prisma.leadershipTerm.updateMany({ where: { chapterId, isActive: true }, data: { isActive: false } }),
    prisma.leadershipTerm.createMany({ data: rows }),
    prisma.election.update({ where: { id: election.id }, data: { status: 'COMPLETE' } })
  ])

  return { success: true, seats: rows.length }
}
