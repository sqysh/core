'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
import { getPolls } from '@/lib/actions/poll/getPolls'

export function PollsDashboardCard() {
  const [openCount, setOpenCount] = useState<number | null>(null)

  useEffect(() => {
    getPolls()
      .then((r) => {
        if (r.success) setOpenCount(r.data.filter((p) => p.status === 'OPEN').length)
      })
      .catch(() => {})
  }, [])

  const hasOpen = !!openCount && openCount > 0

  return (
    <Link
      href="/polls"
      className="group flex items-center gap-4 border border-border-light bg-bg-light p-4 transition-colors hover:border-primary-light dark:border-border-dark dark:bg-bg-dark dark:hover:border-primary-dark"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center border border-border-light text-primary-light dark:border-border-dark dark:text-primary-dark">
        <BarChart3 size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-sora text-[15px] font-black text-text-light dark:text-text-dark">Group vote</span>
        <span className="block font-nunito text-f12 text-muted-light dark:text-muted-dark">
          {hasOpen ? `${openCount} open right now, tap to vote or start one` : 'Start a poll for the group'}
        </span>
      </span>
      {hasOpen ? (
        <span className="shrink-0 bg-primary-light px-2 py-0.5 font-mono text-f11 font-bold text-white dark:bg-primary-dark">
          {openCount}
        </span>
      ) : (
        <span className="shrink-0 font-mono text-f11 tracking-widest uppercase text-muted-light group-hover:text-primary-light dark:text-muted-dark dark:group-hover:text-primary-dark">
          New
        </span>
      )}
    </Link>
  )
}
