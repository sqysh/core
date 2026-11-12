import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { getStageData } from '@/lib/actions/stage/getStageData'
import { HostRemoteClient } from './HostRemoteClient'
import { initiateGuidingLight } from '@/lib/actions/guiding-light/initiateGuidingLight'
import { generateWeeklyMatches } from '@/lib/actions/1-2-1/generateWeeklyMatches'
import { HOST_ROLES } from '@/lib/constants/roles.constants'

export const dynamic = 'force-dynamic'

export default async function StageRemotePage() {
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=%2Fstage%2Fremote')
  if (!HOST_ROLES.has(session.user.role)) redirect('/dashboard')

  const res = await getStageData()
  if (!res.success || !res.data) redirect('/dashboard')

  async function onOpenRound() {
    'use server'
    return initiateGuidingLight()
  }

  async function onGenerateMatchups() {
    'use server'
    return generateWeeklyMatches()
  }

  return (
    <HostRemoteClient
      segments={res.data.segments}
      presentation={res.data.presentation}
      names={res.data.names}
      onOpenRound={onOpenRound}
      onGenerateMatchups={onGenerateMatchups}
      glRevealed={!!res.data.todayWinner}
    />
  )
}
