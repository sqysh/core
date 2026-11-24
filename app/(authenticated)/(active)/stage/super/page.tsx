import { redirect } from 'next/navigation'
import { loadHarbor } from '@/lib/harbor/loadHarbor'
import { auth } from '@/lib/auth/auth'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { getStageData } from '@/lib/actions/stage/getStageData'
import { SuperRemoteClient } from './SuperRemoteClient'
import { initiateGuidingLight } from '@/lib/actions/guiding-light/initiateGuidingLight'
import { generateWeeklyMatches } from '@/lib/actions/matchups/generateWeeklyMatches'

export const dynamic = 'force-dynamic'

export default async function StageSuperPage() {
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=%2Fstage%2Fsuper')
  if (session.user.role !== 'SUPER_USER') redirect('/dashboard')

  const res = await getStageData()
  if (!res.success || !res.data) redirect('/dashboard')

  const members = await prisma.user.findMany({
    where: { chapterId, membershipStatus: 'ACTIVE' },
    select: { id: true, name: true, company: true, title: true, profileImage: true, weeklyTreasureWishlist: true },
    orderBy: { name: 'asc' }
  })

  async function onOpenRound() {
    'use server'
    return initiateGuidingLight()
  }

  async function onGenerateMatchups() {
    'use server'
    return generateWeeklyMatches()
  }

  // the harbor at the top of the remote, on their own boat
  const harbor = await loadHarbor()
  if (!harbor.members.some((m) => m.id === session.user.id))
    harbor.members.push({ id: session.user.id, name: session.user.name ?? '', company: '', profileImage: null })

  return (
    <SuperRemoteClient
      harbor={harbor}
      me={session.user.id}
      presentation={res.data.presentation}
      names={res.data.names}
      members={members}
      openRoundId={res.data.openRoundId}
      onOpenRound={onOpenRound}
      onGenerateMatchups={onGenerateMatchups}
    />
  )
}
