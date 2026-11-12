'use client'

import { getTreasurerBoard } from '@/lib/actions/treasury/getTreasurerBoard'
import { TreasurerBoard } from '@/lib/constants/stage.constants'
import { useEffect, useState } from 'react'

export function TreasurerRoster() {
  const [board, setBoard] = useState<TreasurerBoard | null>(null)

  useEffect(() => {
    getTreasurerBoard().then((res) => res.success && setBoard(res.data))
  }, [])

  if (!board) return null
  const missing = board.members.filter((m) => !m.hasCard)

  return (
    <div className="border border-indigo-500/40 bg-bg-light dark:bg-bg-dark">
      <div className="px-4 pt-4 pb-3">
        <p className="text-f10 font-mono tracking-[0.12em] uppercase text-indigo-500">Treasurer · private</p>
        <p className="mt-1 font-sora text-[18px] font-black tracking-tight text-text-light dark:text-text-dark">
          Needs a card ({missing.length} of {board.total})
        </p>
        {missing.length === 0 ? (
          <p className="mt-2 font-nunito text-f12 text-emerald-600 dark:text-emerald-400">
            Everyone has a card on file.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {missing.map((m) => (
              <li key={m.id} className="font-nunito text-f13 text-text-light dark:text-text-dark">
                {m.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
