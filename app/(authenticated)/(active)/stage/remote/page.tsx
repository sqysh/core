import { redirect } from 'next/navigation'
import { loadHarbor } from '@/lib/harbor/loadHarbor'
import { auth } from '@/lib/auth/auth'
import { getStageData } from '@/lib/actions/stage/getStageData'
import { HostRemoteClient } from './HostRemoteClient'
import { initiateGuidingLight } from '@/lib/actions/guiding-light/initiateGuidingLight'
import { generateWeeklyMatches } from '@/lib/actions/matchups/generateWeeklyMatches'
import { hostPickWinner } from '@/lib/actions/guiding-light/hostPickWinner'
import { deferGuidingLight } from '@/lib/actions/guiding-light/deferGuidingLight'
import { getGuidingLightDeferral } from '@/lib/actions/guiding-light/getGuidingLightDeferral'
import { isActingHost } from '@/lib/actions/leadership/isActingHost'

export const dynamic = 'force-dynamic'

export default async function StageRemotePage() {
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=%2Fstage%2Fremote')

  const isHost = await isActingHost(session.user.id)
  if (!isHost && session.user.role !== 'SUPER_USER') redirect('/dashboard')

  const res = await getStageData()
  if (!res.success || !res.data) redirect('/dashboard')

  async function onOpenRound() {
    'use server'
    return initiateGuidingLight()
  }

  async function onDeferRound() {
    'use server'
    return deferGuidingLight()
  }

  // no judge today: the host sits in the judge seat and picks herself
  const hostId = session.user.id
  async function onChooseSelf() {
    'use server'
    return initiateGuidingLight({ judgeId: hostId })
  }

  async function onPickWinner(winnerId: string) {
    'use server'
    return hostPickWinner(winnerId)
  }

  const deferral = await getGuidingLightDeferral()

  async function onGenerateMatchups() {
    'use server'
    return generateWeeklyMatches()
  }

  // the harbor at the top of the remote, on their own boat
  const harbor = await loadHarbor()
  if (!harbor.members.some((m) => m.id === session.user.id))
    harbor.members.push({ id: session.user.id, name: session.user.name ?? '', company: '', profileImage: null })

  return (
    <HostRemoteClient
      harbor={harbor}
      me={session.user.id}
      segments={res.data.segments}
      presentation={res.data.presentation}
      names={res.data.names}
      onOpenRound={onOpenRound}
      onGenerateMatchups={onGenerateMatchups}
      onDeferRound={onDeferRound}
      onChooseSelf={onChooseSelf}
      onPickWinner={onPickWinner}
      members={res.data.members.map((m) => ({ ...m, company: m.company ?? '' }))}
      deferral={deferral}
      glRevealed={!!res.data.todayWinner}
    />
  )
}
