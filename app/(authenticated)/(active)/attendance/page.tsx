import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { getStageData } from '@/lib/actions/stage/getStageData'
import StageClient from '@/app/(authenticated)/(active)/stage/StageClient'
import AttendanceBoard from './AttendanceBoard'

export const dynamic = 'force-dynamic'

export default async function AttendancePage() {
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=%2Fattendance')

  const res = await getStageData()
  if (!res.success || !res.data) redirect('/dashboard')

  return (
    <StageClient
      segments={res.data.segments}
      presentation={res.data.presentation}
      matchups={res.data.matchups}
      board={<AttendanceBoard />}
    />
  )
}
