/**
 * Convert any Date to a YYYY-MM-DD key in Eastern time.
 * Used to normalize dates for comparison/lookup.
 */
export function toDateKey(d: Date): string {
  const est = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  return `${est.getFullYear()}-${String(est.getMonth() + 1).padStart(2, '0')}-${String(est.getDate()).padStart(2, '0')}`
}

export function fmtDate(iso: string, utc = false) {
  const d = iso.includes('T') ? new Date(iso) : new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: utc ? 'UTC' : 'America/New_York'
  })
}

export function fmtPeriod(start: string | null, end: string | null) {
  if (!start || !end) return null
  return `${fmtDate(start)} – ${fmtDate(end)}`
}

/**
 * Returns the start of the current "Thursday week" — used to scope this-week stats.
 * If today is Tuesday, returns last Thursday. If today is Thursday, returns today.
 */
export function getStartOfThursdayWeek(): Date {
  const now = new Date()
  const diffToThursday = (now.getDay() + 3) % 7
  const start = new Date(now)
  start.setDate(now.getDate() - diffToThursday)
  start.setHours(0, 0, 0, 0)
  return start
}

/**
 * Format an ISO date as a relative time string.
 * Less than 1 hour → "5m ago". Less than 1 day → "3h ago".
 * Less than 1 week → "Yesterday" or "5d ago". Older → "May 14".
 */
export function timeAgo(iso: string): string {
  const date = new Date(iso)
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 3_600) return `${Math.floor(s / 60)}m ago`
  if (s < 86_400) return `${Math.floor(s / 3_600)}h ago`
  if (s < 604_800) {
    const d = Math.floor(s / 86_400)
    return d === 1 ? 'Yesterday' : `${d}d ago`
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format an ISO date as a coarse-grained "last seen" label.
 * Today, Yesterday, "3d ago", "2w ago", "5mo ago". Null returns "Never".
 */
export function lastSeenLabel(iso: string | null) {
  if (!iso) return 'Never'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

/**
 * Map a "last seen" date to a Tailwind text-color class for activity status.
 * Within 7 days → emerald, within 30 days → amber, older or null → red.
 */
export function lastSeenColor(iso: string | null) {
  if (!iso) return 'text-red-400'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 7) return 'text-emerald-400'
  if (days <= 30) return 'text-amber-400'
  return 'text-red-400'
}

/**
 * Format an ISO date as a countdown label from today.
 * Same day → "Today", next day → "Tomorrow", otherwise → "3d".
 */
export function daysUntil(iso: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `${diff}d`
}

/**
 * Returns today's date formatted as a long weekday + short month + day label.
 * Example: "Saturday, May 23"
 */
export function getTodayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Calculate expiration date (1 year from joined date)
 */
export function calculateExpiresAt(): Date {
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  return expiresAt
}
