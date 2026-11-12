import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { getStageData } from '@/lib/actions/stage/getStageData'
import { PresenterRemoteClient } from './PresenterRemoteClient'

export const dynamic = 'force-dynamic'

export default async function PresentPage() {
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=%2Fstage%2Fpresent')
  const res = await getStageData()
  const p = res.data?.presentation
  if (!p || (p.presenter.id !== session.user.id && session.user.role !== 'SUPER_USER')) redirect('/dashboard')
  return <PresenterRemoteClient presentation={p} />
}
