import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { getStageData } from '@/lib/actions/stage/getStageData'
import { PresenterRemoteClient } from './PresenterRemoteClient'
import { HOST_ROLES } from '@/lib/constants/roles.constants'

export const dynamic = 'force-dynamic'

export default async function PresentPage() {
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=%2Fpresent')
  const res = await getStageData()
  const p = res.data?.presentation
  if (!p || (p.presenter.id !== session.user.id && !HOST_ROLES.has(session.user.role))) redirect('/dashboard')
  return <PresenterRemoteClient presentation={p} />
}
