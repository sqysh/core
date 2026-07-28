import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import prisma from '@/prisma/client'
import { getUserAttendance } from '@/lib/actions/attendance/getUserAttendance'
import { buildHistoryRows, buildYearOfThursdays, computeSummary, TRACKING_EPOCH } from '@/lib/utils/attendance.utils'
import { AttendanceHistoryClient } from './AttendanceHistoryClient'

export const dynamic = 'force-dynamic'

const EMPTY_SUMMARY = {
  totalThursdays: 0,
  attended: 0,
  reinstated: 0,
  missed: 0,
  excluded: 0,
  countedTotal: 0,
  percentage: 0
}

export default async function AttendanceHistoryPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, chapterId: true, createdAt: true }
  })

  if (!user) redirect('/login')

  // Fetch attendance, exclusions, and corrections in parallel
  const [attendanceResult, cancelledMeetings, corrections] = await Promise.all([
    getUserAttendance(),
    prisma.cancelledMeeting.findMany({
      where: { chapterId: user.chapterId, date: { gte: TRACKING_EPOCH } },
      select: { date: true, reason: true }
    }),
    prisma.order.findMany({
      where: { userId: user.id, type: 'ATTENDANCE_CORRECTION' },
      select: { meetingId: true, createdAt: true }
    })
  ])

  const exclusions = cancelledMeetings.map((c) => ({
    date: c.date.toISOString().slice(0, 10),
    reason: c.reason ?? 'Cancelled'
  }))

  // Fallback — render with empty data if attendance fetch failed
  if (!attendanceResult.success || !attendanceResult.data) {
    return (
      <AttendanceHistoryClient
        userName={user.name}
        rows={[]}
        summary={EMPTY_SUMMARY}
        squares={buildYearOfThursdays(TRACKING_EPOCH, [], exclusions, user.createdAt)}
      />
    )
  }

  const attendanceRows = attendanceResult.data.rows
  const rows = buildHistoryRows(attendanceRows, exclusions, corrections)
  const summary = computeSummary(rows)
  const squares = buildYearOfThursdays(TRACKING_EPOCH, attendanceRows, exclusions, user.createdAt)

  return <AttendanceHistoryClient userName={user.name} rows={rows} summary={summary} squares={squares} />
}
