import { getTreasurerBoard } from '@/lib/actions/treasury/getTreasurerBoard'
import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import { TreasuryBalanceCard } from '../stage/_components/TreasuryBalanceCard'
import { ObligationsCard, TreasurerRoster } from '../stage/_components/TreasurerStage'
import { TREASURY_ROLES } from '@/lib/constants/stage.constants'

export const dynamic = 'force-dynamic'

export default async function TreasurerPage() {
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=%2Ftreasurer')
  if (!TREASURY_ROLES.has(session.user.role)) redirect('/dashboard')

  const res = await getTreasurerBoard()
  const balance = res.success ? res.data.balance : null

  return (
    <div className="min-h-screen bg-bg-light p-4 dark:bg-bg-dark">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <TreasuryBalanceCard initial={balance} />
        <ObligationsCard />
        <TreasurerRoster />
      </div>
    </div>
  )
}
