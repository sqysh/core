// The Pusher channel the meeting's check-in screens share: arrivals, honks and storms.
//
// There is one Pusher app for every environment, so an event sent from a development server would otherwise be
// delivered to the real TV board and members' phones. In development the channel therefore has its own name, and only
// development clients (which subscribe through this same constant) hear it. In production, and everywhere else, it is
// the original, unprefixed name, unchanged.
export const MEETING_ATTENDANCE_CHANNEL =
  process.env.NODE_ENV === 'development' ? 'dev-meeting-attendance' : 'meeting-attendance'
