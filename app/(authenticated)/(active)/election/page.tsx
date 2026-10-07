import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import ElectionStageClient from './ElectionStageClient'

export const dynamic = 'force-dynamic'

export default async function ElectionStagePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const year = new Date().getFullYear()

  const election = await prisma.election.findUnique({
    where: { chapterId_year: { chapterId, year } },
    select: { id: true, status: true }
  })

  if (!election) redirect('/dashboard')

  const [members, voted] = await Promise.all([
    prisma.user.findMany({
      where: { chapterId, membershipStatus: 'ACTIVE' },
      select: { id: true, name: true, company: true, profileImage: true },
      orderBy: { name: 'asc' }
    }),
    prisma.ballot.findMany({
      where: { electionId: election.id },
      select: { voterId: true },
      distinct: ['voterId']
    })
  ])

  return (
    <ElectionStageClient
      year={year}
      members={members}
      initialVotedIds={voted.map((v) => v.voterId)}
      isSuperUser={session.user.role === 'SUPER_USER'}
    />
  )
}
