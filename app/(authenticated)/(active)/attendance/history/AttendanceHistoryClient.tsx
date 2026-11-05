'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { AttendanceHistoryClientProps } from '@/types/attendance.types'
import { groupByMonth } from '@/lib/utils/attendance.utils'
import { YearHeatMap } from '@/app/(authenticated)/(active)/attendance/history/_components/YearHeatMap'
import { AttendanceCorrectionModal } from '@/components/member/attendance/AttendanceCorrectionModal'
import { useState } from 'react'
import { HistoryRowEl } from '@/app/(authenticated)/(active)/attendance/history/_components/HistoryRowEl'
import { LinkBody } from '@/components/_shared/LinkBody'

function Stat({ value, sub, highlight }: { value: string | number; sub: string; highlight?: boolean }) {
  return (
    <div>
      <p
        className={`font-sora text-[28px] font-black leading-none tabular-nums sm:text-[32px] ${
          highlight ? 'text-primary-light dark:text-primary-dark' : 'text-text-light dark:text-text-dark'
        }`}
      >
        {value}
      </p>
      <p className="mt-1.5 text-f9 font-mono tracking-widest text-muted-light dark:text-muted-dark">{sub}</p>
    </div>
  )
}

export function AttendanceHistoryClient({ userName, rows, summary, squares }: AttendanceHistoryClientProps) {
  const grouped = groupByMonth(rows)
  const firstName = userName.split(' ')[0]
  const [correctionRow, setCorrectionRow] = useState<{ meetingId: string; date: string } | null>(null)
  return (
    <>
      <AttendanceCorrectionModal
        open={correctionRow !== null}
        onClose={() => setCorrectionRow(null)}
        meetingId={correctionRow?.meetingId ?? ''}
        date={correctionRow?.date ?? ''}
      />

      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <main className="max-w-170 mx-auto px-4 pb-12">
          <div className="pt-7 pb-6 border-b border-border-light dark:border-border-dark mb-6 sm:mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
            >
              <LinkBody icon={<ArrowLeft size={13} />} label="Dashboard" spinnerClass="w-[13px] h-[13px]" />
            </Link>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
                <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
                  Attendance History
                </p>
              </div>
              <h1 className="font-sora font-black text-3xl sm:text-4xl text-text-light dark:text-text-dark leading-[1.05] tracking-tight">
                Your Record, {firstName}
              </h1>
              <p className="font-nunito text-sm sm:text-base text-muted-light dark:text-muted-dark mt-3 leading-relaxed max-w-2xl">
                Every Thursday since we started tracking. Holidays and cancelled meetings don't count toward your
                percentage.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mb-6 sm:mb-8"
          >
            <p className="font-sora text-[40px] font-black leading-none tabular-nums text-primary-light dark:text-primary-dark sm:text-[48px]">
              {summary.percentage}%
            </p>
            <p className="mt-2 text-f9 font-mono tracking-widest text-muted-light dark:text-muted-dark">
              {summary.attended + summary.reinstated} of {summary.countedTotal} Thursdays
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.075 }}
            className="mb-6 sm:mb-8 border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4 sm:p-5"
          >
            <YearHeatMap squares={squares} setCorrectionRow={setCorrectionRow} />
          </motion.div>

          {/* Monthly groups */}
          {grouped.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="border border-border-light dark:border-border-dark px-4 py-8 text-center"
            >
              <p className="font-sora font-bold text-sm text-text-light dark:text-text-dark mb-1">No history yet</p>
              <p className="text-[12px] font-nunito text-muted-light dark:text-muted-dark">
                Check in on a Thursday and your record will start filling in.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-6"
            >
              {grouped.map((group, gi) => (
                <div key={group.monthLabel}>
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="block w-3 h-px bg-muted-light/40 dark:bg-muted-dark/40 shrink-0"
                      aria-hidden="true"
                    />
                    <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark">
                      {group.monthLabel}
                    </p>
                  </div>

                  <div className="border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
                    {group.rows.map((row, ri) => (
                      <HistoryRowEl key={`${row.date}-${ri}`} row={row} index={gi * 10 + ri} />
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </main>
      </div>
    </>
  )
}
