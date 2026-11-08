// app/(authenticated)/(active)/attendance/AttendanceBoard.tsx
// Server wrapper for the TV check-in board. The stage passes <AttendanceBoard />
// as its idle state; this gathers the data and hands it to AttendanceClient.
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { Member } from '@/types/attendance.types'
import AttendanceClient from './AttendanceClient'

export default async function AttendanceBoard() {
  // today in ET, as a UTC day window, matching how check-ins are stored
  const todayISO = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
  const dayStart = new Date(`${todayISO}T00:00:00Z`)
  const dayEnd = new Date(`${todayISO}T23:59:59.999Z`)

  const [members, todays] = await Promise.all([
    // adjust the select to match your Member type (image, company, etc.)
    prisma.user.findMany({
      where: { chapterId, membershipStatus: 'ACTIVE' },
      select: { id: true, name: true, image: true, company: true },
      orderBy: { name: 'asc' }
    }),
    // today's check-ins; swap model/field names for yours
    prisma.attendance.findMany({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
      select: { userId: true }
    })
  ])

  const dateLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'long' }).format(
    new Date()
  )

  return (
    <AttendanceClient
      date={dateLabel}
      members={members as Member[]}
      initialAttendees={todays.map((a) => a.userId)}
      initialReactionCount={0}
    />
  )
}
