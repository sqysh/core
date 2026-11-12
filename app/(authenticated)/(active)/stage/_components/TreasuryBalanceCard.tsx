'use client'

import { setBankBalance } from '@/lib/actions/treasury/setBankBalance'
import { formatCurrency } from '@/lib/utils/currency.utils'
import { useState, useTransition } from 'react'

export function TreasuryBalanceCard({ initial }: { initial: number | null }) {
  const [value, setValue] = useState(initial != null ? String(initial) : '')
  const [saved, setSaved] = useState<number | null>(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function save() {
    const amount = Number(value.replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Enter a valid amount')
      return
    }
    setError(null)
    start(async () => {
      const res = await setBankBalance(amount)
      if (!res.success) setError(res.error)
      else setSaved(amount)
    })
  }

  return (
    <div className="border border-indigo-500/40">
      <div className="px-4 pt-4 pb-3">
        <p className="text-f10 font-mono tracking-[0.12em] uppercase text-indigo-500">Treasurer</p>
        <p className="mt-1 font-sora text-[18px] font-black tracking-tight text-text-light dark:text-text-dark">
          Bank balance for the TV
        </p>
        <p className="mt-1 font-nunito text-f12 text-muted-light dark:text-muted-dark">
          {saved != null
            ? `Showing ${formatCurrency(saved)}. Update it before your report.`
            : 'Type the current balance so it shows on the board.'}
        </p>
        <div className="mt-3 flex gap-2">
          <div className="flex flex-1 items-center border border-border-light focus-within:border-indigo-500 dark:border-border-dark">
            <span className="pl-3 font-sora text-[17px] font-bold text-muted-light dark:text-muted-dark">$</span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full bg-transparent px-2 py-2.5 font-sora text-[17px] font-bold text-text-light outline-none dark:text-text-dark"
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="shrink-0 bg-indigo-500 px-5 font-sora text-[14px] font-black text-white disabled:opacity-60"
          >
            {pending ? 'Saving' : 'Save'}
          </button>
        </div>
        {error && <p className="mt-2 font-nunito text-f12 text-red-500">{error}</p>}
      </div>
    </div>
  )
}
