// The TV (Greg's laptop). Your check-in board becomes the stage's idle state;
// everything else is driven by the host's remote over Pusher.
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { getStageData } from '@/lib/actions/stage/getStageData'
import { getThisWeeksMatchups } from '@/lib/actions/matchups/getThisWeeksMatchups'
import StageClient from '@/app/(authenticated)/(active)/stage/StageClient'
import AttendanceBoard from './AttendanceBoard'

export const dynamic = 'force-dynamic'

export default async function AttendancePage() {
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=%2Fattendance')

  const res = await getStageData()
  if (!res.success || !res.data) redirect('/dashboard')

  async function loadMatchups() {
    'use server'
    return getThisWeeksMatchups()
  }

  return (
    <StageClient
      segments={res.data.segments}
      presentation={res.data.presentation}
      matchups={res.data.matchups}
      guidingLight={res.data.guidingLight}
      todayWinner={res.data.todayWinner}
      education={res.data.education}
      coDirectors={res.data.coDirectors}
      eventCoordinator={res.data.eventCoordinator}
      membership={res.data.membership}
      members={res.data.members}
      openRoundId={res.data.openRoundId}
      isSuperUser={res.data.isSuperUser}
      board={<AttendanceBoard />}
      loadMatchups={loadMatchups}
    />
  )
}
