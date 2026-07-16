'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, TrendingUp, CalendarOff } from 'lucide-react'
import { AttendanceHistoryClientProps } from '@/types/attendance.types'
import { groupByMonth } from '@/app/lib/utils/attendance.utils'
import { YearHeatMap } from '@/app/components/dashboard/YearHeatMap'
import { AttendanceCorrectionModal } from '@/app/components/modals/AttendanceCorrectionModal'
import { useState } from 'react'
import { HistoryRowEl } from '@/app/components/attendance/history/HistoryRowEl'
import { StatCard } from '@/app/components/attendance/history/StatCard'

export function AttendanceHistoryClient({ userName, rows, summary, squares }: AttendanceHistoryClientProps) {
  const grouped = groupByMonth(rows)
  const firstName = userName.split(' ')[0]
  const [correctionRow, setCorrectionRow] = useState<{ meetingId: string; date: string } | null>(null)

  console.log(grouped)

  return (
    <>
      <AttendanceCorrectionModal
        open={correctionRow !== null}
        onClose={() => setCorrectionRow(null)}
        meetingId={correctionRow?.meetingId ?? ''}
        date={correctionRow?.date ?? ''}
      />

      <main className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Back link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[10px] sm:text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            <ArrowLeft size={11} aria-hidden="true" />
            Back to Dashboard
          </Link>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6 sm:mb-8"
          >
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

          {/* Summary stats */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6 sm:mb-8"
          >
            <StatCard
              label="Attendance"
              value={`${summary.percentage}%`}
              sub={`${summary.attended + summary.reinstated} / ${summary.countedTotal}`}
              highlight
            />
            <StatCard
              label="Attended"
              value={String(summary.attended)}
              sub={summary.attended === 1 ? 'Thursday' : 'Thursdays'}
              icon={<Calendar size={11} className="text-green-600 dark:text-green-400" />}
            />
            <StatCard
              label="Reinstated"
              value={String(summary.reinstated)}
              sub={summary.reinstated === 1 ? 'meeting' : 'meetings'}
              icon={<TrendingUp size={11} className="text-amber-600 dark:text-amber-400" />}
            />
            <StatCard
              label="Off Weeks"
              value={String(summary.excluded)}
              sub={summary.excluded === 1 ? 'holiday' : 'holidays'}
              icon={<CalendarOff size={11} className="text-muted-light dark:text-muted-dark" />}
            />
          </motion.div>

          {/* Large heat map */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.075 }}
            className="mb-6 sm:mb-8 border border-border-light dark:border-border-dark p-4 sm:p-5"
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
        </div>
      </main>
    </>
  )
}
