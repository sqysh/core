'use client'

import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useSounds } from '@/lib/hooks/useSounds'
import { buildYearOfThursdays } from '@/lib/utils/attendance.utils'
import { AttendanceSquareEl } from './AttendanceSquareEl'
import Link from 'next/link'
import { History } from 'lucide-react'
import { fmtDate } from '@/lib/utils/date.utils'
import { UserAttendanceRow } from '@/types/attendance.types'
import { useAppStore } from '@/lib/store/appStore'
import { AttendanceCorrectionModal } from '@/components/member/attendance/AttendanceCorrectionModal'
import { LinkBody } from '@/components/_shared/LinkBody'

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

const LEGEND = [
  { label: 'Attended', swatch: 'bg-primary-light dark:bg-primary-dark' },
  { label: 'Reinstated', swatch: 'bg-primary-light/45 dark:bg-primary-dark/45' },
  { label: 'Missed', swatch: 'border-2 border-slate-400 dark:border-slate-600' },
  { label: 'Off', swatch: 'border border-dashed border-border-light dark:border-border-dark' }
] as const

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
  const { openMembershipPaymentSetupModal } = useAppStore()

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
      openMembershipPaymentSetupModal()
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
        <div className="px-4 py-3.5 border-b border-border-light dark:border-border-dark flex items-center justify-between gap-3">
          <p className="text-f10 font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">
            Your attendance
          </p>
          <p className="text-[15px] font-mono font-bold text-primary-light dark:text-primary-dark">
            {attended} / {total} · {pct}%
          </p>
        </div>

        {/* Full year heat strip — the focal point */}
        <div className="px-4 py-4 border-b border-border-light dark:border-border-dark">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
            <p className="text-f10 font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">
              The year ahead · 52 Thursdays
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] font-mono text-muted-light dark:text-muted-dark">
              {LEGEND.map(({ label, swatch }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className={`w-3.5 h-3.5 shrink-0 ${swatch}`} aria-hidden="true" />
                  {label}
                </span>
              ))}
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
          className="flex items-center gap-3 px-4 h-14 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
        >
          <LinkBody
            icon={<History size={16} className="text-muted-light dark:text-muted-dark shrink-0" aria-hidden="true" />}
            spinnerClass="w-4 h-4 text-muted-light dark:text-muted-dark"
          >
            <p className="text-[14px] font-mono text-text-light dark:text-text-dark flex-1 group-hover:text-primary-light dark:group-hover:text-primary-dark transition-colors">
              View full history
            </p>
            <span className="text-[14px] font-mono text-muted-light dark:text-muted-dark group-hover:text-primary-light dark:group-hover:text-primary-dark transition-colors">
              →
            </span>
          </LinkBody>
        </Link>
      </div>
    </>
  )
}
