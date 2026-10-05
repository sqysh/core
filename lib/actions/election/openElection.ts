'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { pusher } from '@/lib/pusher/pusher'

export async function openElection() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'SUPER_USER') {
    return { success: false, error: 'Unauthorized' }
  }

  const year = new Date().getFullYear()

  const existing = await prisma.election.findUnique({
    where: { chapterId_year: { chapterId, year } },
    select: { id: true, status: true }
  })

  if (existing && existing.status !== 'VOTING_OPEN') {
    return { success: false, error: `Election for ${year} is already ${existing.status.toLowerCase()}` }
  }

  // Re-firing on an open election is intentional, it re-routes anyone who missed the first event
  const election =
    existing ??
    (await prisma.election.create({
      data: { chapterId, year, status: 'VOTING_OPEN' },
      select: { id: true, status: true }
    }))

  await pusher.trigger('election', 'voting-opened', { electionId: election.id, year })

  return { success: true, electionId: election.id, reopened: !!existing }
}
