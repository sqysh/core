import { getAllUpcomingThursdays } from './attendance.utils'

/**
 * Returns the next N upcoming Thursdays that are real meeting slots —
 * filters out cancelled meetings and visitor days. Used by the presenter queue
 * to assign members to actual presentation dates.
 */
export function getUpcomingMeetingDates(
  cancelledDates: string[],
  visitorDayDates: string[],
  count: number = 52
): string[] {
  const cancelled = new Set(cancelledDates.map((d) => d.split('T')[0]))
  const visitorDays = new Set(visitorDayDates.map((d) => d.split('T')[0]))

  // Pull a generous over-fetch from upcoming Thursdays so we have enough after filtering
  const upcoming = getAllUpcomingThursdays(count * 2)

  return upcoming.filter((d) => !cancelled.has(d) && !visitorDays.has(d)).slice(0, count)
}

// Zip queue with upcoming dates — wraps around infinitely
export function buildSchedule(
  queue: { userId: string; name: string; position: number }[],
  dates: Date[],
  startIndex: number = 0 // which queue position goes first
): { userId: string; name: string; date: Date }[] {
  if (!queue.length || !dates.length) return []
  const sorted = [...queue].sort((a, b) => a.position - b.position)
  return dates.map((date, i) => {
    const member = sorted[(startIndex + i) % sorted.length]
    return { userId: member.userId, name: member.name, date }
  })
}
