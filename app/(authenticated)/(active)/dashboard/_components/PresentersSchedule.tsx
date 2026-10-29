'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Mic } from 'lucide-react'
import { ScheduledPresenter } from '@/types/presenter-queue.types'
import { getInitials } from '@/lib/utils/shared.utils'
import { daysUntil, fmtDate } from '@/lib/utils/date.utils'
import { useState } from 'react'

const VISIBLE = 5

function isPastTodaysMeeting() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).formatToParts(new Date())

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return hour * 60 + minute >= 8 * 60 + 30
}

export default function PresenterSchedule({
  schedule,
  className = ''
}: {
  schedule: ScheduledPresenter[]
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)

  if (!schedule.length) return null

  const next = schedule.find((s) => s.type === 'presenter') ?? schedule[0]
  const visible = schedule.slice(0, VISIBLE)
  const hidden = schedule.slice(VISIBLE)

  const todayISO = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())

  const alreadyPresented = next.date.slice(0, 10) === todayISO && isPastTodaysMeeting()

  return (
    <div className={className}>
      {/* ── Next up hero ── */}
      <div className="border border-border-light dark:border-border-dark mb-3">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
          <Mic size={16} className="text-primary-light dark:text-primary-dark shrink-0" aria-hidden="true" />
          <p className="text-f10 font-mono tracking-[0.12em] uppercase text-primary-light dark:text-primary-dark">
            {alreadyPresented ? 'Presented today' : 'Presenting next'}
          </p>
        </div>
        <div className="px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-sora font-black text-[22px] text-text-light dark:text-text-dark tracking-tight leading-none mb-1.5 truncate">
              {next.isYou ? (alreadyPresented ? 'You' : 'You!') : next.name}
            </p>
            <p className="text-[14px] font-nunito text-muted-light dark:text-muted-dark truncate">{next.company}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-sora font-black text-[17px] text-primary-light dark:text-primary-dark">
              {daysUntil(next.date)}
            </p>
            <p className="text-[14px] font-mono text-muted-light dark:text-muted-dark mt-0.5">{fmtDate(next.date)}</p>
          </div>
        </div>
        {next.isYou && (
          <div className="px-4 py-3 bg-primary-light/8 dark:bg-primary-dark/8 border-t border-primary-light/20 dark:border-primary-dark/20">
            <p className="text-[15px] font-nunito text-primary-light dark:text-primary-dark font-medium">
              {alreadyPresented
                ? "Nice work — that's your slot done for this rotation."
                : "You're up next — prepare your 10-minute presentation."}
            </p>
          </div>
        )}
      </div>

      {/* ── Full list ── */}
      <div className="border border-border-light dark:border-border-dark">
        <ul className="divide-y divide-border-light dark:divide-border-dark">
          {visible.map((s, i) => (
            <PresenterRow key={s.userId + s.date} presenter={s} index={i} />
          ))}
        </ul>

        <AnimatePresence initial={false}>
          {expanded && hidden.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <ul className="border-t border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
                {hidden.map((s, i) => (
                  <PresenterRow key={s.userId + s.date} presenter={s} index={i} />
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {hidden.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full h-12 flex items-center justify-center gap-2 px-4 border-t border-border-light dark:border-border-dark text-[14px] font-mono text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            {expanded ? 'Show less' : `Show ${hidden.length} more`}
            <span aria-hidden="true">{expanded ? '−' : '+'}</span>
          </button>
        )}
      </div>
    </div>
  )
}

function PresenterRow({ presenter: s, index: i }: { presenter: ScheduledPresenter; index: number }) {
  const isOff = s.type === 'off'
  const isVisitor = s.type === 'visitor_day'

  return (
    <motion.li
      className={`flex items-center gap-3 px-3 py-3 transition-colors ${
        s.isYou
          ? 'bg-primary-light/5 dark:bg-primary-dark/5'
          : isOff
            ? 'bg-surface-light dark:bg-surface-dark'
            : isVisitor
              ? 'bg-primary-light/3 dark:bg-primary-dark/3'
              : 'bg-bg-light dark:bg-bg-dark'
      }`}
    >
      <div
        className={`w-8 h-8 shrink-0 flex items-center justify-center border text-[12px] font-mono font-bold ${
          isOff
            ? 'border-dashed border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark'
            : isVisitor
              ? 'border-primary-light/40 dark:border-primary-dark/40 text-primary-light dark:text-primary-dark'
              : s.isYou
                ? 'bg-primary-light/10 dark:bg-primary-dark/10 border-primary-light/30 dark:border-primary-dark/30 text-primary-light dark:text-primary-dark'
                : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark'
        }`}
      >
        {isOff ? '—' : isVisitor ? '★' : getInitials(s.name)}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`text-[15px] font-sora font-bold truncate ${
            isOff
              ? 'text-muted-light dark:text-muted-dark'
              : isVisitor
                ? 'text-primary-light dark:text-primary-dark'
                : s.isYou
                  ? 'text-primary-light dark:text-primary-dark'
                  : 'text-text-light dark:text-text-dark'
          }`}
        >
          {s.name}
          {s.isYou ? ' (You)' : ''}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-[14px] font-mono text-muted-light dark:text-muted-dark">{fmtDate(s.date)}</p>
        {s.isNext && (
          <p className="text-f10 font-mono uppercase tracking-[0.12em] text-primary-light dark:text-primary-dark mt-0.5">
            Next
          </p>
        )}
      </div>
    </motion.li>
  )
}
