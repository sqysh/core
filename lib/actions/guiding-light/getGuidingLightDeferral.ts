import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { etDateISO } from '@/lib/utils/date.utils'

export type GuidingLightDeferral = {
  meetingDate: string
  /** deferred at today's meeting (so "until next week"), as opposed to carried over from an earlier one */
  today: boolean
  judge: { id: string; name: string } | null
}

// A round left open after its meeting day was never picked, so it counts as deferred.
export function displayStatus(status: string, meetingDate: Date, todayStart: Date) {
  return status === 'OPEN' && meetingDate < todayStart ? 'DEFERRED' : status
}

// The latest round is a deferred one: nobody was picked and the same judge carries
// over. Any newer round (open or revealed) clears it.
export async function getGuidingLightDeferral(): Promise<GuidingLightDeferral | null> {
  const todayStart = new Date(`${await etDateISO()}T00:00:00Z`)
  const latest = await prisma.guidingLight.findFirst({
    where: { chapterId },
    orderBy: { meetingDate: 'desc' },
    select: { status: true, meetingDate: true, judgedBy: { select: { id: true, name: true } } }
  })
  if (!latest || displayStatus(latest.status, latest.meetingDate, todayStart) !== 'DEFERRED') return null
  return {
    meetingDate: latest.meetingDate.toISOString(),
    today: latest.meetingDate >= todayStart,
    judge: latest.judgedBy
  }
}
