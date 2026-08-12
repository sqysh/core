import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import StageClient from './StageClient'

export const dynamic = 'force-dynamic'

export default async function StagePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const openRound = await prisma.guidingLight.findFirst({
    where: { chapterId, status: { in: ['OPEN', 'REVEALED'] } },
    orderBy: { meetingDate: 'desc' },
    select: { id: true, judgedById: true, judgedBy: { select: { name: true } } }
  })

  const members = await prisma.user.findMany({
    where: { chapterId, membershipStatus: 'ACTIVE', NOT: { id: openRound.judgedById ?? '' } },
    select: {
      id: true,
      name: true,
      company: true,
      title: true,
      profileImage: true,
      weeklyTreasureWishlist: true
    },
    orderBy: { name: 'asc' }
  })

  const isSuperUser = session.user.role === 'SUPER_USER'

  return (
    <StageClient
      members={members}
      isSuperUser={isSuperUser}
      openRoundId={openRound?.id ?? null}
      judgeName={openRound?.judgedBy?.name ?? null}
    />
  )
}
