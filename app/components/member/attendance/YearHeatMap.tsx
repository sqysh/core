import { fmtSquareLabel } from '@/app/lib/utils/attendance.utils'
import { AttendanceSquare } from '@/types/attendance.types'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSounds } from '@/app/lib/hooks/useSounds'

// ── Helpers ──────────────────────────────────────────────────────────────
// Parse the ISO date the same noon-anchored way fmtSquareLabel does, so the
// day-of-month we print in the cell never drifts by a day across timezones.
function dayOfMonth(iso: string): number {
  return new Date(`${iso}T12:00:00`).getDate()
}

export function YearHeatMap({
  squares,
  setCorrectionRow
}: {
  squares: AttendanceSquare[]
  setCorrectionRow: (row: { meetingId: string; date: string }) => void
}) {
  // Group squares by month so we can label each month-row in the strip
  const grouped = useMemo(() => {
    const groups: { monthLabel: string; squares: AttendanceSquare[] }[] = []
    let current: { monthLabel: string; squares: AttendanceSquare[] } | null = null

    for (const sq of squares) {
      const d = new Date(`${sq.date}T12:00:00`)
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      if (!current || current.monthLabel !== label) {
        current = { monthLabel: label, squares: [] }
        groups.push(current)
      }
      current.squares.push(sq)
    }
    return groups
  }, [squares])

  // Tally totals to display alongside the map
  const totals = useMemo(() => {
    const counts = { attended: 0, reinstated: 0, missed: 0, excluded: 0, future: 0 }
    for (const sq of squares) counts[sq.status]++
    return counts
  }, [squares])

  // Has the member actually logged any real (non-future) activity yet?
  const hasHistory = totals.attended + totals.reinstated + totals.missed > 0

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-4">
        <p className="text-[9px] font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark">
          Heat Map · 52 Thursdays
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-green-500 dark:bg-green-400 shrink-0" aria-hidden="true" />
            Attended
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500 dark:bg-amber-400 shrink-0" aria-hidden="true" />
            Reinstated
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-red-500 dark:bg-red-400 shrink-0" aria-hidden="true" />
            Missed
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 border border-border-light dark:border-border-dark flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <span className="w-0.5 h-0.5 bg-muted-light/60 dark:bg-muted-dark/60 rounded-full" />
            </span>
            Off
          </span>
        </div>
      </div>

      {/* Grouped strip with month axis */}
      <div className="flex flex-wrap gap-x-4 gap-y-4">
        {grouped.map((group) => (
          <div key={group.monthLabel} className="flex flex-col gap-2">
            <p className="text-[8px] font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark">
              {group.monthLabel}
            </p>
            <div className="flex items-center gap-1.5">
              {group.squares.map((sq, i) => (
                <LargeHeatSquare key={`${sq.date}-${i}`} sq={sq} index={i} setCorrectionRow={setCorrectionRow} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty-state hint — only when there's no real activity yet */}
      {!hasHistory && (
        <p className="mt-4 text-[10px] font-mono tracking-widest uppercase text-muted-light/70 dark:text-muted-dark/70">
          Check in on a Thursday and your record starts filling in.
        </p>
      )}

      {/* Totals bar */}
      <div className="mt-5 pt-4 border-t border-border-light dark:border-border-dark grid grid-cols-2 sm:grid-cols-5 gap-3">
        <TotalCell color="green" label="Attended" count={totals.attended} />
        <TotalCell color="amber" label="Reinstated" count={totals.reinstated} />
        <TotalCell color="red" label="Missed" count={totals.missed} />
        <TotalCell color="muted" label="Off Weeks" count={totals.excluded} />
        <TotalCell color="muted" label="Upcoming" count={totals.future} />
      </div>
    </div>
  )
}

// ── Single cell ──────────────────────────────────────────────────────────
function LargeHeatSquare({
  sq,
  index,
  setCorrectionRow
}: {
  sq: AttendanceSquare
  index: number
  setCorrectionRow: (row: { meetingId?: string; date: string }) => void
}) {
  const label = fmtSquareLabel(sq)
  const day = dayOfMonth(sq.date)
  const { play } = useSounds({ enabled: true })

  // Larger cell so a 2-digit date reads clearly; sharp corners (no radius).
  const baseClasses =
    'relative w-7 h-7 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center transition-all ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark'

  // Per-status surface + number color. Numbers stay legible in both modes.
  let surfaceClass = ''
  let numberClass = ''
  switch (sq.status) {
    case 'attended':
      surfaceClass = 'bg-green-500 dark:bg-green-400 hover:scale-[1.08]'
      numberClass = 'text-green-950 dark:text-green-950'
      break
    case 'reinstated':
      surfaceClass = 'bg-amber-500 dark:bg-amber-400 hover:scale-[1.08]'
      numberClass = 'text-amber-950 dark:text-amber-950'
      break
    case 'missed':
      surfaceClass = 'bg-red-500 dark:bg-red-400 hover:scale-[1.08] cursor-pointer'
      numberClass = 'text-red-950 dark:text-red-950'
      break
    case 'future':
      surfaceClass = 'bg-muted-light/10 dark:bg-muted-dark/10 border border-border-light dark:border-border-dark'
      numberClass = 'text-muted-light/50 dark:text-muted-dark/50'
      break
    default:
      surfaceClass = ''
      numberClass = ''
  }

  const todayRing = sq.isToday
    ? 'ring-1 ring-primary-light dark:ring-primary-dark ring-offset-1 ring-offset-bg-light dark:ring-offset-bg-dark'
    : ''

  // Excluded / off week — bordered cell with a faint dot + dimmed date.
  if (sq.status === 'excluded') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay: Math.min(index * 0.01, 0.3) }}
        title={label}
        aria-label={label}
        className={`${baseClasses} ${todayRing} border border-dashed border-border-light dark:border-border-dark`}
      >
        <span
          className="text-[10px] font-mono leading-none text-muted-light/40 dark:text-muted-dark/40 line-through decoration-1"
          aria-hidden="true"
        >
          {day}
        </span>
      </motion.div>
    )
  }

  return (
    <motion.div
      onClick={() => {
        if (sq.status === 'missed') {
          play('se9')
          setCorrectionRow({ meetingId: sq.meetingId, date: sq.date })
        }
      }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.01, 0.3) }}
      title={label}
      aria-label={label}
      className={`${baseClasses} ${surfaceClass} ${todayRing}`}
    >
      <span className={`text-[10px] font-mono font-medium leading-none ${numberClass}`} aria-hidden="true">
        {day}
      </span>
    </motion.div>
  )
}

// ── Totals cell ──────────────────────────────────────────────────────────
function TotalCell({
  color,
  label,
  count
}: {
  color: 'green' | 'amber' | 'red' | 'muted'
  label: string
  count: number
}) {
  const dotColor =
    color === 'green'
      ? 'bg-green-500 dark:bg-green-400'
      : color === 'amber'
        ? 'bg-amber-500 dark:bg-amber-400'
        : color === 'red'
          ? 'bg-red-500 dark:bg-red-400'
          : 'bg-muted-light/40 dark:bg-muted-dark/40'

  const textColor =
    color === 'green'
      ? 'text-green-600 dark:text-green-400'
      : color === 'amber'
        ? 'text-amber-600 dark:text-amber-400'
        : color === 'red'
          ? 'text-red-600 dark:text-red-400'
          : 'text-muted-light dark:text-muted-dark'

  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-2.5 h-2.5 shrink-0 ${dotColor}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className={`font-sora font-black text-lg leading-none ${textColor}`}>{count}</p>
        <p className="text-[9px] font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mt-1">
          {label}
        </p>
      </div>
    </div>
  )
}
