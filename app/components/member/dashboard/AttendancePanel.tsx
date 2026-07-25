'use client'

import { motion } from 'framer-motion'
import { AttendanceCorrectionModal } from '../attendance/AttendanceCorrectionModal'
import { useMemo, useState } from 'react'
import { useSounds } from '@/app/lib/hooks/useSounds'
import { buildYearOfThursdays } from '@/app/lib/utils/attendance.utils'
import { AttendanceSquareEl } from '../attendance/AttendanceSquareEl'
import Link from 'next/link'
import { History } from 'lucide-react'
import { fmtDate } from '@/app/lib/utils/date.utils'
import { store } from '@/app/lib/redux/store'
import { setOpenMembershipPaymentSetupModal } from '@/app/lib/redux/slices/appSlice'
import { UserAttendanceRow } from '@/types/attendance.types'

export interface AttendancePanelProps {
  rows: UserAttendanceRow[]
  attended: number
  total: number
  exclusions: { date: string; reason: string }[]
  membership: {
    annualOrder: any
    quarterlyOrder: any
    paymentMethod: any
  }
  memberCreatedAt: Date
}

export function AttendancePanel({
  rows,
  attended,
  total,
  exclusions,
  membership,
  memberCreatedAt
}: AttendancePanelProps) {
  const quarterlyDone = !!membership.quarterlyOrder
  const annualDone = !!membership.annualOrder
  const bothDone = annualDone && quarterlyDone

  const [correctionRow, setCorrectionRow] = useState<{ meetingId: string; date: string } | null>(null)
  const { play } = useSounds({ enabled: true })

  // Start the year from May 14, 2026 (when we started tracking attendance)
  const yearStart = useMemo(() => new Date(Date.UTC(2026, 4, 14)), [])
  const squares = useMemo(
    () => buildYearOfThursdays(yearStart, rows, exclusions, memberCreatedAt),
    [yearStart, rows, exclusions, memberCreatedAt]
  )

  const pct = total > 0 ? Math.round((attended / total) * 100) : 0

  // Only show missed meetings in the detail list — strip them out of the full row list
  const missedRows = useMemo(() => rows.filter((r) => !r.attended && r.meetingId), [rows])

  function handleReinstateClick(meetingId: string, date: string) {
    play('se9')
    if (bothDone) {
      setCorrectionRow({ meetingId, date })
    } else {
      store.dispatch(setOpenMembershipPaymentSetupModal())
    }
  }

  return (
    <>
      <AttendanceCorrectionModal
        open={correctionRow !== null}
        onClose={() => setCorrectionRow(null)}
        meetingId={correctionRow?.meetingId ?? ''}
        date={correctionRow?.date ?? ''}
      />

      <div className="border border-border-light dark:border-border-dark">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex items-center justify-between gap-3">
          <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark">
            Your Attendance
          </p>
          <p className="text-f10 font-mono tracking-widest uppercase text-primary-light dark:text-primary-dark">
            {attended} / {total} · {pct}%
          </p>
        </div>

        {/* Full year heat strip — the focal point */}
        <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2.5">
            <p className="text-[9px] font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark">
              The Year Ahead · 52 Thursdays
            </p>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9px] font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 dark:bg-green-400 shrink-0" aria-hidden="true" />
                Attended
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-500 dark:bg-amber-400 shrink-0" aria-hidden="true" />
                Reinstated
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 dark:bg-red-400 shrink-0" aria-hidden="true" />
                Missed
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="w-2 h-2 border border-border-light dark:border-border-dark flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  <span className="w-0.5 h-0.5 bg-muted-light/60 dark:bg-muted-dark/60 rounded-full" />
                </span>
                Off
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-0.5">
            {squares.map((sq, i) => (
              <AttendanceSquareEl
                key={`${sq.date}-${i}`}
                sq={sq}
                index={i}
                onMissedClick={(s) => handleReinstateClick(s.meetingId!, s.date)}
              />
            ))}
          </div>
        </div>

        {/* View history link */}
        <Link
          href="/attendance/history"
          className="flex items-center gap-3 px-4 py-3 border-b border-border-light dark:border-border-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
        >
          <History size={13} className="text-muted-light dark:text-muted-dark shrink-0" aria-hidden="true" />
          <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark flex-1 group-hover:text-primary-light dark:group-hover:text-primary-dark transition-colors">
            View Full History
          </p>
          <span className="text-f10 font-mono text-muted-light dark:text-muted-dark group-hover:text-primary-light dark:group-hover:text-primary-dark transition-colors">
            →
          </span>
        </Link>

        {/* Missed meetings section — only renders when there are missed rows */}
        {missedRows.length > 0 && (
          <>
            <div className="px-4 py-2 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark">
              <p className="text-[9px] font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark">
                Missed · {missedRows.length} {missedRows.length === 1 ? 'meeting' : 'meetings'}
              </p>
            </div>
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {missedRows.map((row, i) => (
                <motion.div
                  key={row.meetingId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  className="flex items-center gap-3 px-4 py-2.5 border-l-2 border-l-red-500/40 dark:border-l-red-400/40"
                >
                  <p className="text-[13px] font-sora font-semibold leading-tight flex-1 text-muted-light dark:text-muted-dark">
                    {fmtDate(row.date)}
                  </p>
                  <button
                    onClick={() => handleReinstateClick(row.meetingId, row.date)}
                    className="text-f10 font-mono tracking-widest uppercase text-text-light/50 dark:text-text-dark/50 hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                  >
                    Reinstate →
                  </button>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
