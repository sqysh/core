import { motion } from 'framer-motion'
import { HistoryRow } from '@/types/attendance.types'
import { fmtDate } from '@/app/lib/utils/date.utils'

export function HistoryRowEl({ row, index }: { row: HistoryRow; index: number }) {
  const isAttended = row.status === 'attended'
  const isReinstated = row.status === 'reinstated'
  const isMissed = row.status === 'missed'
  const isExcluded = row.status === 'excluded'

  const borderColor = isAttended
    ? 'border-l-green-500 dark:border-l-green-400'
    : isReinstated
      ? 'border-l-amber-500 dark:border-l-amber-400'
      : isMissed
        ? 'border-l-red-500/40 dark:border-l-red-400/40'
        : 'border-l-border-light dark:border-l-border-dark'

  const statusLabel = isAttended
    ? 'Attended'
    : isReinstated
      ? 'Reinstated'
      : isMissed
        ? 'Missed'
        : (row.excludedReason ?? 'Off')

  const statusColor = isAttended
    ? 'text-green-600 dark:text-green-400'
    : isReinstated
      ? 'text-amber-600 dark:text-amber-400'
      : isMissed
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-light dark:text-muted-dark'

  const dateColor = isExcluded
    ? 'text-muted-light dark:text-muted-dark'
    : isMissed
      ? 'text-muted-light dark:text-muted-dark'
      : 'text-text-light dark:text-text-dark'

  // Format reinstatement date as short "May 23, 2026" if present
  const reinstatedDateLabel = row.reinstatedAt
    ? new Date(row.reinstatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.4) }}
      className={`flex items-start gap-3 px-4 py-2.5 border-l-2 ${borderColor}`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-sora font-semibold leading-tight ${dateColor}`}>{fmtDate(row.date)}</p>
        {isReinstated && reinstatedDateLabel && (
          <p className="text-[10px] font-mono text-muted-light dark:text-muted-dark mt-0.5">
            Reinstated {reinstatedDateLabel}
          </p>
        )}
      </div>
      <p className={`text-f10 font-mono tracking-widest uppercase shrink-0 mt-0.5 ${statusColor}`}>{statusLabel}</p>
    </motion.div>
  )
}
