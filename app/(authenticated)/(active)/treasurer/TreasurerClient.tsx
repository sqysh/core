import React from 'react'
import { TreasuryBalanceCard } from './_components/TreasuryBalanceCard'
import { ObligationsCard } from './_components/ObligationsCard'
import { TreasurerRoster } from './_components/TreasurerRoster'

export default function TreasurerClient({ balance }: { balance: number }) {
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
