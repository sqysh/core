'use server'

import { cookies } from 'next/headers'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { easternToday, MEETING_ENDS_ET, MEETING_HOLD_COOKIE } from '@/lib/constants/meeting-hold.constants'
import prisma from '@/prisma/client'

/** The instant a wall-clock time in Eastern falls on a given Eastern date (daylight saving included) */
function easternInstant(dateISO: string, hour: number, minute: number) {
  const guess = new Date(`${dateISO}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`)
  // Eastern's offset from UTC on that day, e.g. "GMT-5" or "GMT-4"
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' })
    .formatToParts(guess)
    .find((p) => p.type === 'timeZoneName')?.value
  const offset = Number(name?.replace('GMT', '') || -5)
  return new Date(guess.getTime() - offset * 3600_000)
}

/**
 * Holds a member on the check-in screen until the meeting ends: once their boat is in the harbor, every other page
 * sends them back to it (the proxy reads the cookie this sets). Only for someone actually checked in today.
 */
export async function holdForMeeting(): Promise<{ success: boolean }> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId || session.user.role === 'SUPER_USER') return { success: false }

  const today = easternToday()
  const ends = easternInstant(today, MEETING_ENDS_ET.hour, MEETING_ENDS_ET.minute)
  if (Date.now() >= ends.getTime()) return { success: false }

  // the same meeting-day key checkIn uses
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const here = await prisma.attendance.findFirst({
    where: { userId, meeting: { chapterId, date: start } },
    select: { id: true }
  })
  if (!here) return { success: false }

  ;(await cookies()).set(MEETING_HOLD_COOKIE, today, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: ends
  })
  return { success: true }
}
