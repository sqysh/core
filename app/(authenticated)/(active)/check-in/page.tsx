import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { checkIn } from '@/lib/actions/attendance/checkIn'
import { getUserAttendance } from '@/lib/actions/attendance/getUserAttendance'
import { getPresenterSchedule } from '@/lib/actions/presenter-queue/getPresenterSchedule'
import { getAttendanceHistory } from '@/lib/actions/attendance/getAttendanceHistory'
import { chapterId } from '@/lib/constants/api/chapterId'
import { SQYSH_UPDATES } from '@/lib/constants/member/sqysh-updates.constants'
import CheckInClient from './CheckInClient'
import prisma from '@/prisma/client'

const PREVIEW: Record<string, { success: boolean; alreadyCheckedIn?: boolean; error?: string }> = {
  ok: { success: true },
  again: { success: true, alreadyCheckedIn: true },
  window: { success: false, error: 'Check-in is only available on Thursdays between 7:00 AM and 8:30 AM EST.' },
  fail: { success: false, error: 'Something went wrong.' }
}

export default async function CheckInPage({
  searchParams
}: {
  searchParams: Promise<{ date?: string; preview?: string; gl?: string; open?: string }>
}) {
  const { date, preview, gl, open } = await searchParams
  const session = await auth()

  if (!session?.user) {
    const callbackUrl = date ? `/check-in?date=${date}` : '/check-in'
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  const userId = session.user.id
  const isSuper = session.user.role === 'SUPER_USER'
  const fake = preview && isSuper ? PREVIEW[preview] : null

  // Check in first so today's meeting is counted in the attendance that follows.
  const result = fake ?? (await checkIn({ date: date ?? undefined }))

  const todayISO = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
  const todayStart = new Date(`${todayISO}T00:00:00Z`)

  const [attendanceRes, scheduleRes, historyRes, todayRound, lastRound, hostTerm, treasurerTerm] = await Promise.all([
    getUserAttendance(),
    getPresenterSchedule(),
    getAttendanceHistory(),
    prisma.guidingLight.findFirst({
      where: { chapterId, meetingDate: { gte: todayStart } },
      select: { judgedById: true }
    }),
    prisma.guidingLight.findFirst({
      where: { chapterId, status: 'REVEALED', meetingDate: { lt: todayStart } },
      orderBy: { meetingDate: 'desc' },
      select: { winnerId: true }
    }),
    prisma.leadershipTerm.findFirst({
      where: { chapterId, isActive: true, position: 'HOST' },
      select: { holderId: true }
    }),
    prisma.leadershipTerm.findFirst({
      where: { chapterId, isActive: true, position: 'TREASURER' },
      select: { holderId: true }
    })
  ])

  const presenterName =
    (scheduleRes.data ?? []).find((s) => s.type === 'presenter' && s.date.slice(0, 10) === todayISO)?.name ?? null

  const me = historyRes.data?.members.find((m) => m.id === userId)

  // Newest three Thursdays they were a member for and didn't make it to.
  // Today is excluded so a failed check-in doesn't offer to sell them today's meeting.
  const missed = me
    ? (historyRes.data?.rows ?? [])
        .filter(
          (r) =>
            r.date >= me.startedAt &&
            r.date < todayISO &&
            !r.attendedIds.includes(userId) &&
            !r.reinstatedUserIds.includes(userId)
        )
        .slice(0, 3)
        .map((r) => ({ meetingId: r.id, date: r.date }))
    : []

  // Today's judge: set on today's row once it exists, otherwise last round's winner
  const isGuidingLight = (todayRound?.judgedById ?? lastRound?.winnerId) === userId
  const isHost = hostTerm?.holderId === session.user.id
  const isTreasurer = treasurerTerm?.holderId === session.user.id

  return (
    <CheckInClient
      result={result}
      userName={session.user.name ?? ''}
      attendance={attendanceRes.data ?? { attended: 0, total: 0 }}
      presenterName={presenterName}
      missed={missed}
      updates={SQYSH_UPDATES}
      isGuidingLight={(fake && gl === '1' && isSuper) || isGuidingLight}
      previewOpen={!!fake && open === '1' && isSuper}
      isHost={isHost}
      isTreasurer={isTreasurer}
    />
  )
}
