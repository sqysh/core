import { fmtSquareLabel } from '@/lib/utils/attendance.utils'
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
    'relative w-4 h-4 shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark'

  let stateClass = ''
  if (sq.status === 'attended') {
    stateClass = 'bg-primary-light dark:bg-primary-dark hover:opacity-80'
  } else if (sq.status === 'reinstated') {
    stateClass = 'bg-primary-light/45 dark:bg-primary-dark/45 hover:opacity-80'
  } else if (sq.status === 'missed') {
    stateClass =
      'bg-transparent border-2 border-slate-400 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-500 cursor-pointer'
  } else if (sq.status === 'future') {
    stateClass = 'bg-muted-light/15 dark:bg-muted-dark/15'
  }

  const todayRing = sq.isToday
    ? 'ring-2 ring-offset-1 ring-primary-light dark:ring-primary-dark ring-offset-bg-light dark:ring-offset-bg-dark'
    : ''

  if (sq.status === 'excluded') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay: index * 0.008 }}
        title={label}
        aria-label={label}
        className={`${base} ${todayRing} border border-dashed border-border-light dark:border-border-dark`}
      />
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
