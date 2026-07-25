import { fmtSquareLabel } from '@/app/lib/utils/attendance.utils'
import { motion } from 'framer-motion'

export type SquareStatus = 'attended' | 'reinstated' | 'missed' | 'future' | 'excluded'

export interface AttendanceSquare {
  date: string
  meetingId?: string
  status: SquareStatus
  isToday?: boolean
  excludedReason?: string
}

export function AttendanceSquareEl({
  sq,
  index,
  onMissedClick
}: {
  sq: AttendanceSquare
  index: number
  onMissedClick: (sq: AttendanceSquare) => void
}) {
  const label = fmtSquareLabel(sq)
  const isMissed = sq.status === 'missed' && sq.meetingId

  const base =
    'relative w-[11px] h-[11px] shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark'

  let stateClass = ''
  if (sq.status === 'attended') {
    stateClass = 'bg-green-500 dark:bg-green-400 hover:bg-green-600 dark:hover:bg-green-300'
  } else if (sq.status === 'reinstated') {
    stateClass = 'bg-amber-500 dark:bg-amber-400 hover:bg-amber-600 dark:hover:bg-amber-300'
  } else if (sq.status === 'missed') {
    stateClass = 'bg-red-500 dark:bg-red-400 hover:bg-red-600 dark:hover:bg-red-300 cursor-pointer'
  } else if (sq.status === 'future') {
    stateClass = 'bg-muted-light/15 dark:bg-muted-dark/15'
  }

  const todayRing = sq.isToday ? 'ring-1 ring-primary-light dark:ring-primary-dark' : ''

  if (sq.status === 'excluded') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay: index * 0.008 }}
        title={label}
        aria-label={label}
        className={`${base} ${todayRing} border border-border-light dark:border-border-dark flex items-center justify-center`}
      >
        <span className="w-0.5 h-0.5 rounded-full bg-muted-light/50 dark:bg-muted-dark/50" aria-hidden="true" />
      </motion.div>
    )
  }

  if (isMissed) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay: index * 0.008 }}
        type="button"
        title={`${label} · Click to reinstate`}
        aria-label={`${label}, click to reinstate`}
        onClick={() => onMissedClick(sq)}
        className={`${base} ${stateClass} ${todayRing}`}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: index * 0.008 }}
      title={label}
      aria-label={label}
      className={`${base} ${stateClass} ${todayRing}`}
    />
  )
}
