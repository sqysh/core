import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { loadHarbor } from './_lib/loadHarbor'
import CheckinVoyageLoader from './CheckinVoyageLoader'

export const metadata: Metadata = { title: 'Check-in voyage', robots: { index: false } }
export const dynamic = 'force-dynamic'

// The same data the TV check-in board loads (AttendanceBoard): the active roster and today's check-ins, earliest
// first, so a reload moors everyone back in the order they arrived, plus everyone's saved boat. Signed-in only, like the board.
export default async function CheckinVoyagePage() {
  const session = await auth()
  // the local dev server skips sign-in so the scene can be previewed headless; deployed, it's signed-in only
  if (!session?.user && process.env.NODE_ENV !== 'development') redirect('/login?callbackUrl=%2Fdev%2Fcheckin-voyage')

  return <CheckinVoyageLoader {...await loadHarbor()} />
}
