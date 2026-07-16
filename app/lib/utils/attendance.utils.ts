import { AttendanceExclusion, AttendanceRow, AttendanceSquare, HistoryRow } from '@/types/attendance.types'

/**
 * Date when attendance tracking started. All historical views use this as the
 * starting anchor.
 */
export const TRACKING_EPOCH = new Date(Date.UTC(2026, 4, 14, 0, 0, 0, 0))
// = May 14, 2026 00:00:00 UTC

/**
 * Returns the next N upcoming Thursdays as ISO date strings (YYYY-MM-DD).
 * Includes today if today is a Thursday.
 */
export function getAllUpcomingThursdays(count: number): string[] {
  const results: string[] = []
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  while (cursor.getDay() !== 4) cursor.setDate(cursor.getDate() + 1)

  while (results.length < count) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    results.push(key)
    cursor.setDate(cursor.getDate() + 7)
  }
  return results
}

// ─── Exclusion logic ───────────────────────────────────────────────────────────

/**
 * Returns true if a given Thursday should be excluded from attendance counts.
 * - MA school February vacation: 3rd full week of February
 * - MA school April vacation: 3rd full week of April (Patriots' Day week)
 * - Thursdays of weeks containing: MLK Day, July 4th, Labor Day, Thanksgiving, Christmas
 * - Any one-off DB-driven exclusions (cancelled meetings)
 */
export function isExcludedThursday(d: Date, exclusionMap: Map<string, string>): { excluded: boolean; reason?: string } {
  const iso = d.toISOString().slice(0, 10)
  if (exclusionMap.has(iso)) {
    return { excluded: true, reason: exclusionMap.get(iso) }
  }

  const year = d.getUTCFullYear()
  const month = d.getUTCMonth()
  const day = d.getUTCDate()

  // MA February vacation (week containing Presidents' Day)
  if (month === 1) {
    const feb1 = new Date(Date.UTC(year, 1, 1))
    const firstMonday = 1 + ((8 - feb1.getUTCDay()) % 7)
    const thirdMonday = firstMonday + 14
    if (day === thirdMonday + 3) return { excluded: true, reason: 'February Vacation' }
  }

  // MA April vacation (week containing Patriots' Day)
  if (month === 3) {
    const apr1 = new Date(Date.UTC(year, 3, 1))
    const firstMonday = 1 + ((8 - apr1.getUTCDay()) % 7)
    const thirdMonday = firstMonday + 14
    if (day === thirdMonday + 3) return { excluded: true, reason: 'April Vacation' }
  }

  // MLK Day week (3rd Monday of January)
  if (month === 0) {
    const jan1 = new Date(Date.UTC(year, 0, 1))
    const firstMonday = 1 + ((8 - jan1.getUTCDay()) % 7)
    const thirdMonday = firstMonday + 14
    if (day === thirdMonday + 3) return { excluded: true, reason: 'MLK Day Week' }
  }

  // July 4th week
  if (month === 6 && day >= 1 && day <= 7) {
    return { excluded: true, reason: 'July 4th Week' }
  }

  // Labor Day week (1st Monday of September)
  if (month === 8) {
    const sep1 = new Date(Date.UTC(year, 8, 1))
    const firstMonday = 1 + ((8 - sep1.getUTCDay()) % 7)
    if (day === firstMonday + 3) return { excluded: true, reason: 'Labor Day Week' }
  }

  // Thanksgiving (4th Thursday of November)
  if (month === 10) {
    const nov1 = new Date(Date.UTC(year, 10, 1))
    const firstThursday = 1 + ((4 - nov1.getUTCDay() + 7) % 7)
    if (day === firstThursday + 21) return { excluded: true, reason: 'Thanksgiving' }
  }

  // Christmas / end-of-year
  if (month === 11 && day >= 22) {
    return { excluded: true, reason: 'Christmas Week' }
  }

  return { excluded: false }
}

// ─── Year strip builder ────────────────────────────────────────────────────────

/**
 * Generate 52 Thursdays starting from the first Thursday on or after `from`,
 * merged with attendance rows and exclusion data. Returns squares with status
 * (attended, reinstated, missed, future, or excluded) for rendering in the
 * dashboard heat strip.
 */
export function buildYearOfThursdays(
  from: Date,
  rows: AttendanceRow[],
  exclusions: AttendanceExclusion[],
  memberCreatedAt: Date | string
): AttendanceSquare[] {
  // Start the grid at the LATER of chapter tracking start and when the member
  // joined — so each member's heatmap begins fresh at their own week one,
  // rather than showing greyed-out time before they existed.
  const trackingStart = new Date(from)
  trackingStart.setUTCHours(0, 0, 0, 0)

  const joined = new Date(memberCreatedAt)
  joined.setUTCHours(0, 0, 0, 0)

  const start = joined > trackingStart ? new Date(joined) : new Date(trackingStart)

  // Snap to the first Thursday on or after the start
  const dayShift = (4 - start.getUTCDay() + 7) % 7
  start.setUTCDate(start.getUTCDate() + dayShift)

  // "Today" as a LOCAL calendar date. Using UTC here rolls over to tomorrow
  // after ~8pm Eastern (9pm EDT = 1am UTC next day), which would wrongly mark
  // tomorrow's Thursday as past/missed. Local date avoids that.
  const now = new Date()
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const rowByDate = new Map(rows.map((r) => [r.date.slice(0, 10), r]))
  const exclusionMap = new Map(exclusions.map((e) => [e.date, e.reason]))

  const squares: AttendanceSquare[] = []
  const cursor = new Date(start)

  for (let i = 0; i < 52; i++) {
    const iso = cursor.toISOString().slice(0, 10)
    const exclusion = isExcludedThursday(cursor, exclusionMap)
    const isToday = iso === todayISO
    const isFuture = iso > todayISO

    if (exclusion.excluded) {
      squares.push({ date: iso, status: 'excluded', excludedReason: exclusion.reason, isToday })
    } else if (isFuture) {
      squares.push({ date: iso, status: 'future', isToday })
    } else {
      const row = rowByDate.get(iso)
      if (row?.attended) {
        squares.push({
          date: iso,
          meetingId: row.meetingId,
          status: row.reinstated ? 'reinstated' : 'attended',
          isToday
        })
      } else {
        squares.push({ date: iso, meetingId: row?.meetingId, status: 'missed', isToday })
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }

  return squares
}

// ─── History grouping ──────────────────────────────────────────────────────────

/**
 * Group attendance history rows by their month label.
 * Returns an array of { monthLabel, rows } objects, useful for rendering a
 * month-by-month history view.
 */
export function groupByMonth(rows: HistoryRow[]): { monthLabel: string; rows: HistoryRow[] }[] {
  const groups = new Map<string, HistoryRow[]>()

  for (const row of rows) {
    const d = new Date(`${row.date}T12:00:00`)
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  return Array.from(groups.entries()).map(([monthLabel, rows]) => ({ monthLabel, rows }))
}

// ─── Display helpers ───────────────────────────────────────────────────────────

/**
 * Format a single attendance square as a screen-reader label / tooltip.
 * Example: "May 14, 2026 · Attended"
 */
export function fmtSquareLabel(sq: AttendanceSquare): string {
  const d = new Date(`${sq.date}T12:00:00`)
  const dateLabel = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  if (sq.status === 'excluded') return `${dateLabel} · ${sq.excludedReason} (not counted)`
  if (sq.status === 'future') return `${dateLabel} · Upcoming`
  if (sq.status === 'attended') return `${dateLabel} · Attended`
  if (sq.status === 'reinstated') return `${dateLabel} · Reinstated`
  return `${dateLabel} · Missed`
}

/**
 * Transforms raw attendance rows into history rows with status classification.
 * Each row is bucketed into one of four states (attended, reinstated, missed,
 * excluded) by checking exclusions first, then attendance + correction data.
 * Reinstated rows include the timestamp of when the correction was paid.
 * Returns rows sorted newest-first.
 */
export function buildHistoryRows(
  attendanceRows: AttendanceRow[],
  exclusions: { date: string; reason: string }[],
  corrections: { meetingId: string | null; createdAt: Date }[]
): HistoryRow[] {
  const exclusionMap = new Map(exclusions.map((e) => [e.date, e.reason]))
  const reinstatedAtByMeetingId = new Map(
    corrections
      .filter((c): c is { meetingId: string; createdAt: Date } => !!c.meetingId)
      .map((c) => [c.meetingId, c.createdAt.toISOString()])
  )

  const rows: HistoryRow[] = attendanceRows.map((r) => {
    const dateISO = r.date.slice(0, 10)
    const exclusionReason = exclusionMap.get(dateISO)

    if (exclusionReason) {
      return { date: dateISO, status: 'excluded', excludedReason: exclusionReason }
    }
    if (r.attended && r.reinstated) {
      return {
        date: dateISO,
        status: 'reinstated',
        reinstatedAt: reinstatedAtByMeetingId.get(r.meetingId)
      }
    }
    if (r.attended) {
      return { date: dateISO, status: 'attended' }
    }
    return { date: dateISO, status: 'missed' }
  })

  // Newest first
  return rows.sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * Computes attendance summary statistics from a list of history rows.
 * Returns counts by status, the total of "counted" Thursdays (attended +
 * reinstated + missed, excluding holidays/cancellations), and the overall
 * attendance percentage. Reinstated meetings count toward attendance.
 */
export function computeSummary(rows: HistoryRow[]) {
  const counts = { attended: 0, reinstated: 0, missed: 0, excluded: 0 }

  for (const row of rows) {
    counts[row.status]++
  }

  const countedTotal = counts.attended + counts.reinstated + counts.missed
  const percentage = countedTotal > 0 ? Math.round(((counts.attended + counts.reinstated) / countedTotal) * 100) : 0

  return {
    totalThursdays: rows.length,
    attended: counts.attended,
    reinstated: counts.reinstated,
    missed: counts.missed,
    excluded: counts.excluded,
    countedTotal,
    percentage
  }
}
