'use client'

import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'
import { ScheduledPresenter } from '@/types/presenter-queue.types'
import { daysUntil, fmtDate } from '../../../lib/utils/date.utils'
import { getInitials } from '../../../lib/utils/shared.utils'

export default function PresenterSchedule({
  schedule,
  className = ''
}: {
  schedule: ScheduledPresenter[]
  className?: string
}) {
  if (!schedule.length) return null

  const next = schedule.find((s) => s.type === 'presenter') ?? schedule[0]

  return (
    <div className={className}>
      {/* ── Next up hero ── */}
      <div className="border border-border-light dark:border-border-dark mb-3">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
          <Mic size={12} className="text-primary-light dark:text-primary-dark" aria-hidden="true" />
          <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
            Presenting Next
          </p>
        </div>
        <div className="px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-sora font-black text-[18px] text-text-light dark:text-text-dark tracking-tight leading-none mb-1">
              {next.isYou ? 'You!' : next.name}
            </p>
            <p className="text-[12px] font-nunito text-muted-light dark:text-muted-dark">{next.company}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-sora font-black text-[15px] text-primary-light dark:text-primary-dark">
              {daysUntil(next.date)}
            </p>
            <p className="text-f10 font-mono text-muted-light dark:text-muted-dark">{fmtDate(next.date)}</p>
          </div>
        </div>
        {next.isYou && (
          <div className="px-4 py-2.5 bg-primary-light/8 dark:bg-primary-dark/8 border-t border-primary-light/20 dark:border-primary-dark/20">
            <p className="text-[12px] font-nunito text-primary-light dark:text-primary-dark font-medium">
              You're up next — prepare your 10-minute presentation.
            </p>
          </div>
        )}
      </div>

      {/* ── Full list ── */}
      <ul className="border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
        {schedule.map((s, i) => (
          <PresenterRow key={s.userId + s.date} presenter={s} index={i} />
        ))}
      </ul>
    </div>
  )
}

function PresenterRow({ presenter: s, index: i }: { presenter: ScheduledPresenter; index: number }) {
  const isOff = s.type === 'off'
  const isVisitor = s.type === 'visitor_day'

  return (
    <motion.li
      className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors ${
        s.isYou
          ? 'bg-primary-light/5 dark:bg-primary-dark/5'
          : isOff
            ? 'bg-red-50 dark:bg-red-400/5 opacity-60'
            : isVisitor
              ? 'bg-amber-50 dark:bg-amber-400/5'
              : 'bg-bg-light dark:bg-bg-dark'
      }`}
    >
      <div
        className={`w-6 h-6 shrink-0 flex items-center justify-center border text-f9 font-mono font-bold ${
          isOff
            ? 'bg-red-50 dark:bg-red-400/5 border-red-200 dark:border-red-400/20 text-red-400'
            : isVisitor
              ? 'bg-amber-50 dark:bg-amber-400/5 border-amber-200 dark:border-amber-400/20 text-amber-500'
              : s.isYou
                ? 'bg-primary-light/10 dark:bg-primary-dark/10 border-primary-light/30 dark:border-primary-dark/30 text-primary-light dark:text-primary-dark'
                : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark'
        }`}
      >
        {isOff ? '✕' : isVisitor ? '★' : getInitials(s.name)}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`text-[12.5px] font-sora font-bold truncate ${
            isOff
              ? 'text-red-400 dark:text-red-400'
              : isVisitor
                ? 'text-amber-600 dark:text-amber-400'
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
        <p className="text-f10 font-mono text-muted-light dark:text-muted-dark">{fmtDate(s.date)}</p>
        {s.isNext && (
          <p className="text-f9 font-mono uppercase tracking-widest text-primary-light dark:text-primary-dark">Next</p>
        )}
      </div>
    </motion.li>
  )
}
