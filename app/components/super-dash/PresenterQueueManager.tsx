'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { QueueMember } from '@/types/presenter-queue'
import { addToQueue } from '@/app/lib/actions/presenter-queue/addToQueue'
import { getInitials } from '@/app/lib/utils/common/getInitials'
import { reorderQueue } from '@/app/lib/actions/presenter-queue/reorderQueue'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  initialQueue: QueueMember[]
  availableMembers: { id: string; name: string; company: string }[]
  dates: string[]
  startIndex: number
}

export function fmtDate(iso: string) {
  const d = iso.includes('T') ? new Date(iso) : new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York'
  })
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function PresenterQueueManager({ initialQueue, availableMembers, dates, startIndex }: Props) {
  const sorted = [...initialQueue].sort((a, b) => a.position - b.position)
  const queue = sorted

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const router = useRouter()

  async function moveTo(id: string, newPosition: number) {
    setLoadingId(id)
    const res = await reorderQueue(id, newPosition)
    if (res.success) router.refresh()
    setLoadingId(null)
  }

  function getDateForIndex(rawIndex: number) {
    const offset = (rawIndex - startIndex + sorted.length) % sorted.length
    return dates[offset] ? fmtDate(dates[offset]) : '—'
  }

  // ── Add ───────────────────────────────────────────────────────────────────────
  async function add(memberId: string, name: string, company: string) {
    const res = await addToQueue(memberId)
    if (res.success) {
      router.refresh()
    }
    setShowAdd(false)
  }

  return (
    <div className="border border-border-light dark:border-border-dark">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center gap-3">
          <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
          <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
            Presenter Queue
          </p>
        </div>
      </div>

      {/* ── Add member dropdown ── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-border-light dark:border-border-dark"
          >
            <div className="px-4 py-3 bg-surface-light dark:bg-surface-dark">
              <p className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mb-2">
                Add to end of queue
              </p>
              {availableMembers?.length === 0 ? (
                <p className="text-[12.5px] font-nunito text-muted-light dark:text-muted-dark py-1">
                  All active members are already in the queue.
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-border-light dark:divide-border-dark max-h-48 overflow-y-auto border border-border-light dark:border-border-dark">
                  {availableMembers?.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => add(m.id, m.name, m.company)}
                      className="flex items-center justify-between px-3 py-2.5 text-left bg-bg-light dark:bg-bg-dark hover:bg-primary-light/5 dark:hover:bg-primary-dark/5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                    >
                      <span className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark">
                        {m.name}
                      </span>
                      <span className="text-f10 font-mono text-muted-light dark:text-muted-dark">{m.company}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Queue list ── */}
      <div className="divide-y divide-border-light dark:divide-border-dark max-h-130 overflow-y-auto">
        {queue.length === 0 && (
          <p className="px-4 py-6 text-sm font-nunito text-muted-light dark:text-muted-dark text-center">
            No members in queue — initialize or add members above.
          </p>
        )}

        {queue.map((m, i) => {
          const sortedIndex = sorted.findIndex((q) => q.id === m.id)

          return (
            <motion.div
              key={m.id}
              layout
              transition={{ duration: 0.18 }}
              className={`flex items-center gap-3 px-4 py-3 transition-colors bg-bg-light dark:bg-bg-dark hover:bg-surface-light dark:hover:bg-surface-dark`}
            >
              {/* position number */}
              <span className="w-5 text-center font-mono text-[11px] text-muted-light dark:text-muted-dark shrink-0">
                {i + 1}
              </span>

              {/* avatar */}
              <div className="w-7 h-7 shrink-0 flex items-center justify-center bg-primary-light/10 dark:bg-primary-dark/10 border border-primary-light/20 dark:border-primary-dark/20 text-f10 font-mono font-bold text-primary-light dark:text-primary-dark">
                {getInitials(m.name)}
              </div>

              {/* name + company */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark truncate">{m.name}</p>
                <p className="text-f10 font-mono text-muted-light dark:text-muted-dark truncate">{m.company}</p>
              </div>

              {/* scheduled date */}
              <span className="text-[11px] font-mono text-muted-light dark:text-muted-dark shrink-0 hidden xs:block">
                {getDateForIndex(i)}
              </span>

              {/* action buttons */}
              <div className="flex items-center gap-0.5 shrink-0">
                <select
                  value={sortedIndex}
                  onChange={(e) => moveTo(m.id, Number(e.target.value))}
                  disabled={!!loadingId}
                  className="h-6 text-f10 font-mono bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark focus:outline-none focus:border-primary-light dark:focus:border-primary-dark"
                >
                  {sorted.map((_, idx) => (
                    <option key={idx} value={idx}>
                      {idx + 1}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
