// ─── Types ─────────────────────────────────────────────────────────────────────
export type DateInput = string | number | Date | null | undefined

export interface DateFormatOptions {
  style?: 'short' | 'medium' | 'long' | 'full' | 'month-day'
  includeTime?: boolean
  includeSeconds?: boolean
  fallback?: string
}

// ─── Core formatter ────────────────────────────────────────────────────────────
export const formatDate = (date: DateInput, options: DateFormatOptions = {}): string => {
  const { style = 'medium', includeTime = false, includeSeconds = false, fallback = 'Never' } = options

  if (!date) return fallback
  const d = new Date(date)
  if (isNaN(d.getTime())) return fallback

  let fmt: Intl.DateTimeFormatOptions = {}

  switch (style) {
    case 'short':
    case 'medium':
      fmt = { year: 'numeric', month: 'short', day: 'numeric' }
      break
    case 'long':
      fmt = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      break
    case 'full':
      fmt = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }
      if (includeSeconds) fmt.second = '2-digit'
      break
    case 'month-day':
      fmt = { month: 'short', day: 'numeric' }
      break
  }

  if (includeTime && style !== 'full') {
    fmt.hour = 'numeric'
    fmt.minute = '2-digit'
    if (includeSeconds) fmt.second = '2-digit'
  }

  return new Intl.DateTimeFormat('en-US', { ...fmt, timeZone: 'America/New_York' }).format(d)
}

// ─── Convenience formatters ────────────────────────────────────────────────────
export const formatDateShort = (date: DateInput) => formatDate(date, { style: 'short' })
export const formatDateLong = (date: DateInput) => formatDate(date, { style: 'long' })
export const formatDateTime = (date: DateInput) => formatDate(date, { style: 'medium', includeTime: true })

export function fmtDate(iso: string) {
  const d = iso.includes('T') ? new Date(iso) : new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York'
  })
}

// ─── Input formatters ──────────────────────────────────────────────────────────
export const convertToDateFormat = (date: string | Date): string => {
  if (!date) return ''
  return (date instanceof Date ? date : new Date(date)).toISOString().split('T')[0]
}

export const formatDateForInput = (iso: string): string => {
  if (!iso) return ''
  const d = new Date(iso)
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

export const formatDateTimeForInput = (iso: string): string => {
  if (!iso) return ''
  const d = new Date(iso)
  return (
    [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-') +
    'T' +
    [String(d.getHours()).padStart(2, '0'), String(d.getMinutes()).padStart(2, '0')].join(':')
  )
}

// ─── Range / month helpers ─────────────────────────────────────────────────────
export const formatDateRange = (startDays: number, endDays: number): string => {
  const start = new Date()
  start.setDate(start.getDate() + startDays)
  const end = new Date()
  end.setDate(end.getDate() + endDays)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export const formatMonth = (date: Date): string => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

export const isCurrentMonth = (date: Date, currentMonth: Date): boolean =>
  date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear()

export const isToday = (date: Date): boolean => {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

// ─── Common date ranges ────────────────────────────────────────────────────────
const now = new Date()

export const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
export const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
export const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
export const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

// ─── Chapter-specific helpers ──────────────────────────────────────────────────
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

export function getQuarterlyDates(): string[] {
  return [
    new Date(2026, 3, 15), // Apr 15
    new Date(2026, 6, 15), // Jul 15
    new Date(2026, 9, 15), // Oct 15
    new Date(2027, 0, 15) // Jan 15
  ].map((d) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))
}

export function getAnnualBillingAnchor(month: number, day: number): number {
  const today = new Date()
  let anchor = new Date(today.getFullYear(), month - 1, day)
  if (anchor <= today) {
    anchor = new Date(today.getFullYear() + 1, month - 1, day)
  }
  return Math.floor(anchor.getTime() / 1000)
}

export function getQuarterlyBillingAnchor(): number {
  const today = new Date()
  const year = today.getFullYear()

  const quarters = [
    new Date(year, 0, 1),
    new Date(year, 3, 1),
    new Date(year, 6, 1),
    new Date(year, 9, 1),
    new Date(year + 1, 0, 1)
  ]

  const next = quarters.find((q) => q > today)!
  return Math.floor(next.getTime() / 1000)
}
