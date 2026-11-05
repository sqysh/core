import { fmtSquareLabel } from '@/lib/utils/attendance.utils'
import { AttendanceSquare } from '@/types/attendance.types'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSounds } from '@/lib/hooks/useSounds'

// Parse the ISO date the same noon-anchored way fmtSquareLabel does, so the
// day-of-month we print in the cell never drifts by a day across timezones.
function dayOfMonth(iso: string): number {
  return new Date(`${iso}T12:00:00`).getDate()
}

type Tone = 'attended' | 'reinstated' | 'missed' | 'muted'

const SWATCH: Record<Tone, string> = {
  attended: 'bg-primary-light dark:bg-primary-dark',
  reinstated: 'bg-primary-light/45 dark:bg-primary-dark/45',
  missed: 'border-2 border-slate-400 dark:border-slate-500',
  muted: 'border border-dashed border-muted-light/60 dark:border-muted-dark/60'
}

const LEGEND: { tone: Tone; label: string }[] = [
  { tone: 'attended', label: 'Attended' },
  { tone: 'reinstated', label: 'Reinstated' },
  { tone: 'missed', label: 'Missed' },
  { tone: 'muted', label: 'Off' }
]

export function YearHeatMap({
  squares,
  setCorrectionRow
}: {
  squares: AttendanceSquare[]
  setCorrectionRow: (row: { meetingId: string; date: string }) => void
}) {
  const grouped = useMemo(() => {
    const groups: { key: string; month: string; squares: AttendanceSquare[] }[] = []
    let current: { key: string; month: string; squares: AttendanceSquare[] } | null = null

    for (const sq of squares) {
      const d = new Date(`${sq.date}T12:00:00`)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!current || current.key !== key) {
        current = {
          key,
          month: `${d.toLocaleDateString('en-US', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`,
          squares: []
        }
        groups.push(current)
      }
      current.squares.push(sq)
    }
    return groups
  }, [squares])

  const totals = useMemo(() => {
    const counts = { attended: 0, reinstated: 0, missed: 0, excluded: 0, future: 0 }
    for (const sq of squares) counts[sq.status]++
    return counts
  }, [squares])

  const hasHistory = totals.attended + totals.reinstated + totals.missed > 0

  return (
    <div>
      <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-f10 font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">
          Heat Map · 52 Thursdays
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-f9 font-mono text-muted-light dark:text-muted-dark">
          {LEGEND.map(({ tone, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`h-3.5 w-3.5 shrink-0 ${SWATCH[tone]}`} aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* One row per month, cells aligned in columns down the page */}
      <div className="flex flex-col gap-1.5">
        {grouped.map((group) => (
          <div
            key={group.key}
            className="grid grid-cols-[46px_1fr] items-center gap-2 sm:grid-cols-[58px_1fr] sm:gap-3"
          >
            <p className="text-f9 font-mono tracking-[0.06em] uppercase text-muted-light dark:text-muted-dark">
              {group.month}
            </p>
            <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
              {group.squares.map((sq, i) => (
                <LargeHeatSquare key={`${sq.date}-${i}`} sq={sq} index={i} setCorrectionRow={setCorrectionRow} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {totals.missed > 0 && (
        <div className="mt-4 flex items-start gap-2.5 border-l-2 border-primary-light dark:border-primary-dark bg-primary-light/5 dark:bg-primary-dark/5 px-3 py-2.5">
          <span className={`mt-px h-3.5 w-3.5 shrink-0 ${SWATCH.missed}`} aria-hidden="true" />
          <p className="text-[13px] font-nunito leading-snug text-text-light dark:text-text-dark">
            Tap any missed Thursday to reinstate it.
          </p>
        </div>
      )}

      {!hasHistory && (
        <p className="mt-4 text-f9 font-mono text-muted-light dark:text-muted-dark">
          Check in on a Thursday and your record starts filling in.
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border-light dark:border-border-dark pt-4 sm:grid-cols-5">
        <TotalCell tone="attended" label="Attended" count={totals.attended} />
        <TotalCell tone="reinstated" label="Reinstated" count={totals.reinstated} />
        <TotalCell tone="missed" label="Missed" count={totals.missed} />
        <TotalCell tone="muted" label="Off Weeks" count={totals.excluded} />
      </div>
    </div>
  )
}

function LargeHeatSquare({
  sq,
  index,
  setCorrectionRow
}: {
  sq: AttendanceSquare
  index: number
  setCorrectionRow: (row: { meetingId: string; date: string }) => void
}) {
  const label = fmtSquareLabel(sq)
  const day = dayOfMonth(sq.date)
  const { play } = useSounds({ enabled: true })

  const base =
    'relative h-7 w-7 sm:h-8 sm:w-8 shrink-0 flex items-center justify-center transition-all ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark'

  const num = 'text-[11px] font-mono font-medium leading-none'

  const todayRing = sq.isToday
    ? 'ring-2 ring-primary-light dark:ring-primary-dark ring-offset-1 ring-offset-bg-light dark:ring-offset-bg-dark'
    : ''

  let surface = ''
  let numberClass = ''
  switch (sq.status) {
    case 'attended':
      surface = 'bg-primary-light dark:bg-primary-dark hover:opacity-85'
      numberClass = 'text-white dark:text-bg-dark'
      break
    case 'reinstated':
      surface = 'bg-primary-light/45 dark:bg-primary-dark/45 hover:opacity-85'
      numberClass = 'text-text-light dark:text-text-dark'
      break
    case 'missed':
      surface =
        'border-2 border-slate-400 dark:border-slate-500 hover:border-primary-light dark:hover:border-primary-dark'
      numberClass = 'text-text-light dark:text-text-dark'
      break
    case 'future':
      surface = 'bg-muted-light/10 dark:bg-muted-dark/10'
      numberClass = 'text-muted-light/70 dark:text-muted-dark/70'
      break
    default:
      break
  }

  const anim = {
    initial: { opacity: 0, scale: 0.6 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.2, delay: Math.min(index * 0.01, 0.3) }
  }

  if (sq.status === 'excluded') {
    return (
      <motion.div
        {...anim}
        title={label}
        aria-label={label}
        className={`${base} ${todayRing} border border-dashed border-muted-light/60 dark:border-muted-dark/60`}
      >
        <span className={`${num} text-muted-light/70 dark:text-muted-dark/70`} aria-hidden="true">
          {day}
        </span>
      </motion.div>
    )
  }

  // Missed squares open the reinstatement flow, so they are real buttons.
  if (sq.status === 'missed' && sq.meetingId) {
    const meetingId = sq.meetingId
    return (
      <motion.button
        {...anim}
        type="button"
        title={`${label} · Reinstate`}
        aria-label={`${label}, reinstate this meeting`}
        onClick={() => {
          play('se9')
          setCorrectionRow({ meetingId, date: sq.date })
        }}
        className={`${base} ${surface} ${todayRing} cursor-pointer`}
      >
        <span className={`${num} ${numberClass}`} aria-hidden="true">
          {day}
        </span>
      </motion.button>
    )
  }

  return (
    <motion.div {...anim} title={label} aria-label={label} className={`${base} ${surface} ${todayRing}`}>
      <span className={`${num} ${numberClass}`} aria-hidden="true">
        {day}
      </span>
    </motion.div>
  )
}

function TotalCell({ tone, label, count }: { tone: Tone; label: string; count: number }) {
  const textColor =
    tone === 'attended' || tone === 'reinstated'
      ? 'text-primary-light dark:text-primary-dark'
      : 'text-text-light dark:text-text-dark'

  return (
    <div className="flex items-center gap-2.5">
      <span className={`h-3.5 w-3.5 shrink-0 ${SWATCH[tone]}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className={`font-sora text-lg font-black leading-none tabular-nums ${textColor}`}>{count}</p>
        <p className="mt-1 text-f9 font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">
          {label}
        </p>
      </div>
    </div>
  )
}
