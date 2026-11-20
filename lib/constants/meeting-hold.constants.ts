// Once a member checks in, the app holds them on the check-in screen (their boat in the harbor) until the meeting is
// over: every other page sends them back there. The check-in page sets a cookie that lasts until the meeting ends, and
// the proxy reads it on every request.

export const MEETING_HOLD_COOKIE = 'core-meeting-hold'

/** When the meeting is over and the hold lifts, Eastern time, on the meeting day */
export const MEETING_ENDS_ET = { hour: 9, minute: 0 }

/**
 * Where a held member may still go: the check-in screen itself, and the meeting's own screens (the host remote, the
 * presenter's deck controls, the Guiding Light judge), which check for themselves who may use them. API routes and
 * sign-in keep working.
 */
export const MEETING_HOLD_ALLOWED = ['/check-in', '/stage', '/api', '/login']

/** Today's date in Eastern time, YYYY-MM-DD: the meeting day the hold belongs to */
export const easternToday = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
