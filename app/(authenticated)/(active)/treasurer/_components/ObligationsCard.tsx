'use client'

import { addObligation } from '@/lib/actions/treasury/addObligation'
import { getTreasurerBoard } from '@/lib/actions/treasury/getTreasurerBoard'
import { removeObligation } from '@/lib/actions/treasury/removeObligation'
import { TreasuryObligationItem } from '@/lib/constants/stage.constants'
import { formatCurrency } from '@/lib/utils/currency.utils'
import { fmtDate } from '@/lib/utils/date.utils'
import { Plus, X } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'

export function ObligationsCard() {
  const [items, setItems] = useState<TreasuryObligationItem[]>([])
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [due, setDue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    getTreasurerBoard().then((res) => res.success && setItems(res.data.obligations))
  }, [])

  function add() {
    const amt = Number(amount.replace(/[^0-9.]/g, ''))
    if (!label.trim()) return setError('Add a label')
    if (!Number.isFinite(amt) || amt < 0) return setError('Enter a valid amount')
    setError(null)
    start(async () => {
      const res = await addObligation(label.trim(), amt, due ? new Date(due).toISOString() : null)
      if (!res.success) return setError(res.error)
      setItems((prev) => [...prev, res.data])
      setLabel('')
      setAmount('')
      setDue('')
    })
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((o) => o.id !== id)) // optimistic
    start(async () => {
      const res = await removeObligation(id)
      if (!res.success) setError(res.error)
    })
  }

  const total = items.reduce((s, o) => s + o.amount, 0)

  return (
    <div className="border border-indigo-500/40 bg-bg-light dark:bg-bg-dark">
      <div className="px-4 pt-4 pb-3">
        <p className="text-f10 font-mono tracking-[0.12em] uppercase text-indigo-500">Treasurer</p>
        <p className="mt-1 font-sora text-[18px] font-black tracking-tight text-text-light dark:text-text-dark">
          Obligations{' '}
          {items.length > 0 && <span className="text-muted-light dark:text-muted-dark">· {formatCurrency(total)}</span>}
        </p>
        <p className="mt-1 font-nunito text-f12 text-muted-light dark:text-muted-dark">
          Money the chapter owes. Shows on the board live.
        </p>

        {items.length > 0 && (
          <ul className="mt-3 flex flex-col divide-y divide-border-light dark:divide-border-dark">
            {items.map((o) => (
              <li key={o.id} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1 truncate font-nunito text-f13 text-text-light dark:text-text-dark">
                  {o.label}
                </span>
                {o.dueDate && (
                  <span className="font-mono text-f11 text-muted-light dark:text-muted-dark">{fmtDate(o.dueDate)}</span>
                )}
                <span className="font-sora text-f13 font-bold tabular-nums text-text-light dark:text-text-dark">
                  {formatCurrency(o.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(o.id)}
                  aria-label={`Remove ${o.label}`}
                  className="shrink-0 text-muted-light hover:text-red-500 dark:text-muted-dark"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-col gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="What for (e.g. holiday party deposit)"
            className="border border-border-light bg-transparent px-3 py-2.5 font-nunito text-f13 text-text-light outline-none focus:border-indigo-500 dark:border-border-dark dark:text-text-dark"
          />
          <div className="flex gap-2">
            <div className="flex flex-1 items-center border border-border-light focus-within:border-indigo-500 dark:border-border-dark">
              <span className="pl-3 font-sora text-f13 font-bold text-muted-light dark:text-muted-dark">$</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="w-full bg-transparent px-2 py-2.5 font-sora text-f13 font-bold text-text-light outline-none dark:text-text-dark"
              />
            </div>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="border border-border-light bg-transparent px-3 py-2.5 font-nunito text-f12 text-text-light outline-none scheme-light focus:border-indigo-500 dark:border-border-dark dark:text-text-dark dark:scheme-dark"
            />
            <button
              type="button"
              onClick={add}
              disabled={pending}
              className="flex shrink-0 items-center gap-1 bg-indigo-500 px-4 font-sora text-f13 font-black text-white disabled:opacity-60"
            >
              <Plus size={15} /> Add
            </button>
          </div>
        </div>
        {error && <p className="mt-2 font-nunito text-f12 text-red-500">{error}</p>}
      </div>
    </div>
  )
}
