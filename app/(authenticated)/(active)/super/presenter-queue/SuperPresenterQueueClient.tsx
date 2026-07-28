'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { QueueMember } from '@/types/presenter-queue.types'
import { addToQueue } from '@/lib/actions/presenter-queue/addToQueue'
import { reorderQueue } from '@/lib/actions/presenter-queue/reorderQueue'
import { fmtDate } from '@/lib/utils/date.utils'
import { getInitials } from '@/lib/utils/shared.utils'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Props {
  initialQueue: QueueMember[]
  availableMembers: { id: string; name: string; company: string }[]
  dates: string[]
  startIndex: number
  currentUserId: string
}

// ─── Sub-components ──────────────────────────────────────────────────────────
const COLS = 'grid grid-cols-[2fr_1fr_1fr_80px] gap-4 px-4'
const HEADS = ['Member', 'Company', 'Scheduled', 'Position']

function TableHead() {
  return (
    <div className={`${COLS} py-2.5 bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark`}>
      {HEADS.map((h) => (
        <span key={h} className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-on-dark">
          {h}
        </span>
      ))}
    </div>
  )
}

function PresentingNextBanner({ m, date }: { m: QueueMember; date: string }) {
  return (
    <div className="mb-6 border border-primary-light/25 dark:border-primary-dark/25 overflow-hidden">
      {/* label row */}
      <div className="flex items-center gap-2 px-4 py-2 bg-primary-light/5 dark:bg-primary-dark/5 border-b border-primary-light/15 dark:border-primary-dark/15">
        <svg
          className="w-3 h-3 text-primary-light dark:text-primary-dark shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M12 18.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
        <span className="text-[9.5px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
          Presenting Next
        </span>
      </div>
      {/* detail row */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-bg-light dark:bg-bg-dark">
        <div>
          <p className="font-sora font-black text-[15px] text-text-light dark:text-text-dark">{m.name}</p>
          <p className="text-[11px] font-mono text-muted-light dark:text-muted-dark mt-0.5">{m.company}</p>
        </div>
        <div className="text-right">
          <p className="text-[13px] font-mono font-bold text-primary-light dark:text-primary-dark">
            {/* days until — reuse whatever lastSeenLabel equivalent you have, or calculate inline */}
            {date}
          </p>
        </div>
      </div>
    </div>
  )
}

function QueueRow({
  m,
  position,
  date,
  totalCount,
  sortedIndex,
  loadingId,
  isSqysh,
  onMove
}: {
  m: QueueMember
  position: number
  date: string
  totalCount: number
  sortedIndex: number
  loadingId: string | null
  isSqysh: boolean
  onMove: (id: string, newIndex: number) => void
}) {
  return (
    <motion.div
      layout
      transition={{ duration: 0.18 }}
      className={`${COLS} items-center py-3.5 border-b border-border-light dark:border-border-dark last:border-0 transition-colors
        ${
          isSqysh
            ? 'bg-primary-light/5 dark:bg-primary-dark/5'
            : 'bg-bg-light dark:bg-bg-dark hover:bg-surface-light dark:hover:bg-surface-dark'
        }`}
    >
      {/* Name + avatar */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-5 text-center font-mono text-[11px] text-muted-light dark:text-muted-dark shrink-0">
          {position}
        </span>
        <div
          className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-sm overflow-hidden border
          ${
            isSqysh
              ? 'bg-primary-light/15 dark:bg-primary-dark/15 border-primary-light/40 dark:border-primary-dark/40'
              : 'bg-primary-light/10 dark:bg-primary-dark/10 border-primary-light/20 dark:border-primary-dark/20'
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-primary-light dark:text-primary-dark">
            {getInitials(m.name)}
          </span>
        </div>
        <div className="min-w-0">
          <p
            className={`font-sora font-bold text-[13px] truncate
            ${isSqysh ? 'text-primary-light dark:text-primary-dark' : 'text-text-light dark:text-text-dark'}`}
          >
            {m.name}
          </p>
          {isSqysh && (
            <p className="text-[9px] font-mono tracking-[0.15em] uppercase text-primary-light/60 dark:text-primary-dark/60">
              you
            </p>
          )}
        </div>
      </div>

      {/* Company */}
      <p className="text-[12px] font-mono text-muted-light dark:text-muted-dark truncate">{m.company}</p>

      {/* Scheduled date */}
      <p
        className={`text-[11px] font-mono ${isSqysh ? 'text-primary-light dark:text-primary-dark' : 'text-muted-light dark:text-muted-dark'}`}
      >
        {date}
      </p>

      {/* Position select */}
      <select
        value={sortedIndex}
        onChange={(e) => onMove(m.id, Number(e.target.value))}
        disabled={!!loadingId}
        className="h-6 w-full text-f10 font-mono bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark focus:outline-none focus:border-primary-light dark:focus:border-primary-dark"
      >
        {Array.from({ length: totalCount }, (_, idx) => (
          <option key={idx} value={idx}>
            {idx + 1}
          </option>
        ))}
      </select>
    </motion.div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function SuperPresenterQueueClient({
  initialQueue,
  availableMembers,
  dates,
  startIndex,
  currentUserId
}: Props) {
  const sorted = [...initialQueue].sort((a, b) => a.position - b.position)

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

  async function add(memberId: string) {
    const res = await addToQueue(memberId)
    if (res.success) router.refresh()
    setShowAdd(false)
  }

  const next = sorted[0]

  return (
    <div className="p-6">
      {/* ── Page header ── */}
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
            Super · Admin
          </p>
          <h1 className="font-sora font-black text-[26px] text-text-light dark:text-text-dark tracking-tight">
            Presenter Queue
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-on-dark">{sorted.length} in queue</span>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="h-4 px-3 text-[10px] font-mono tracking-[0.15em] uppercase border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors"
          >
            {showAdd ? 'Cancel' : '+ Add'}
          </button>
        </div>
      </div>

      {/* ── Presenting next banner ── */}
      {next && <PresentingNextBanner m={next} date={getDateForIndex(0)} />}

      {/* ── Add member dropdown ── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="border border-border-light dark:border-border-dark">
              <div className="px-4 py-2.5 bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark">
                <span className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-on-dark">
                  Add to end of queue
                </span>
              </div>
              {availableMembers?.length === 0 ? (
                <p className="px-4 py-3 text-[12.5px] font-nunito text-muted-light dark:text-muted-dark">
                  All active members are already in the queue.
                </p>
              ) : (
                <div className="divide-y divide-border-light dark:divide-border-dark max-h-48 overflow-y-auto">
                  {availableMembers?.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => add(m.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left bg-bg-light dark:bg-bg-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                    >
                      <span className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark">
                        {m.name}
                      </span>
                      <span className="text-[11px] font-mono text-muted-light dark:text-muted-dark">{m.company}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Queue table ── */}
      <div className="border border-border-light dark:border-border-dark overflow-hidden">
        <TableHead />
        {sorted.length === 0 ? (
          <p className="px-4 py-8 text-[12.5px] font-nunito text-muted-light dark:text-muted-dark text-center">
            No members in queue.
          </p>
        ) : (
          sorted.map((m, i) => (
            <QueueRow
              key={m.id}
              m={m}
              position={i + 1}
              date={getDateForIndex(i)}
              totalCount={sorted.length}
              sortedIndex={i}
              loadingId={loadingId}
              isSqysh={m.userId === currentUserId}
              onMove={moveTo}
            />
          ))
        )}
      </div>
    </div>
  )
}
