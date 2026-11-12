import { getTreasurerBoard } from '@/lib/actions/treasury/getTreasurerBoard'
import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import { TREASURY_ROLES } from '@/lib/constants/stage.constants'
import TreasurerClient from './TreasurerClient'

export const dynamic = 'force-dynamic'

export default async function TreasurerPage() {
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=%2Ftreasurer')
  if (!TREASURY_ROLES.has(session.user.role)) redirect('/dashboard')

  const res = await getTreasurerBoard()
  const balance = res.success ? res.data.balance : null

  return <TreasurerClient balance={balance} />
}
