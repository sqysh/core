// Development-only meeting simulation: lets check-in run outside the Thursday 7:00-8:30 AM window, so the whole QR
// flow can be tried on a phone at any time. It is off unless ALL of these hold: the server is the local development
// server, the DEV_SIMULATE_MEETING variable is on (npm run dev:https turns it on, and that command only runs against
// the development database), and it isn't a Vercel deployment. Nothing else about check-in changes: sign-in, one
// attendance per member per meeting, and the arrival event all still go through checkIn().

export function simulatedMeetingOpen(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.DEV_SIMULATE_MEETING === '1' && !process.env.VERCEL
}
