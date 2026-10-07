import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import BallotClient from './BallotClient'
import { LeadershipPosition } from '@prisma/client'
import { APPOINTED_EMAIL } from '@/lib/constants/leadership.constants'

export const dynamic = 'force-dynamic'

export default async function BallotPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const year = new Date().getFullYear()

  const election = await prisma.election.findUnique({
    where: { chapterId_year: { chapterId, year } },
    select: { id: true, status: true }
  })

  if (!election || election.status !== 'VOTING_OPEN') redirect('/dashboard')

  const appointee = await prisma.user.findUnique({
    where: { email: APPOINTED_EMAIL },
    select: { id: true, name: true }
  })

  const [members, existing, terms] = await Promise.all([
    prisma.user.findMany({
      where: {
        chapterId,
        membershipStatus: 'ACTIVE',
        ...(appointee && { id: { not: appointee.id } })
      },
      select: { id: true, name: true, company: true, profileImage: true },
      orderBy: { name: 'asc' }
    }),
    prisma.ballot.findFirst({
      where: { electionId: election.id, voterId: session.user.id },
      select: { id: true }
    }),
    prisma.leadershipTerm.findMany({
      where: { chapterId, isActive: true },
      select: { position: true, holder: { select: { id: true, name: true } } }
    })
  ])

  const currentHolders = terms.reduce<Partial<Record<LeadershipPosition, { id: string; name: string }[]>>>((acc, t) => {
    ;(acc[t.position] ??= []).push({ id: t.holder.id, name: t.holder.name })
    return acc
  }, {})

  return (
    <BallotClient
      members={members}
      year={year}
      alreadyVoted={!!existing}
      currentHolders={currentHolders}
      appointeeName={appointee?.name ?? ''}
    />
  )
}
