import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { Member } from '@/types/attendance.types'
import CheckinVoyageLoader from './CheckinVoyageLoader'

export const metadata: Metadata = { title: 'Check-in voyage', robots: { index: false } }
export const dynamic = 'force-dynamic'

// The same data the TV check-in board loads (AttendanceBoard): the active roster and today's check-ins, earliest
// first, so a reload moors everyone back in the order they arrived. Signed-in only, like the board.
export default async function CheckinVoyagePage() {
  const session = await auth()
  // the local dev server skips sign-in so the scene can be previewed headless; deployed, it's signed-in only
  if (!session?.user && process.env.NODE_ENV !== 'development') redirect('/login?callbackUrl=%2Fdev%2Fcheckin-voyage')

  const todayISO = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
  const dayStart = new Date(`${todayISO}T00:00:00Z`)
  const dayEnd = new Date(`${todayISO}T23:59:59.999Z`)

  const [members, todays] = await Promise.all([
    prisma.user.findMany({
      where: { chapterId, membershipStatus: 'ACTIVE' },
      select: { id: true, name: true, company: true, profileImage: true },
      orderBy: { name: 'asc' }
    }),
    prisma.attendance.findMany({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
      select: { userId: true },
      orderBy: { createdAt: 'asc' }
    })
  ])

  return (
    <CheckinVoyageLoader
      members={members.map((m) => ({ ...m, name: m.name ?? '', company: m.company ?? '' })) as Member[]}
      initialAttendees={[...new Set(todays.map((a) => a.userId))]}
      todayISO={todayISO}
    />
  )
}
