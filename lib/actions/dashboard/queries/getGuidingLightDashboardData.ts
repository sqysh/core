import { chapterId } from '@/lib/constants/api/chapterId'
import prisma from '@/prisma/client'
import { etDateISO } from '@/lib/utils/date.utils'
import { displayStatus, getGuidingLightDeferral } from '@/lib/actions/guiding-light/getGuidingLightDeferral'

export async function getGuidingLightDashboardData() {
  const [guidingLights, openRound, deferral] = await Promise.all([
    prisma.guidingLight.findMany({
      where: { chapterId },
      orderBy: { meetingDate: 'desc' },
      take: 4,
      select: {
        id: true,
        meetingDate: true,
        status: true,
        winner: { select: { id: true, name: true, company: true, profileImage: true } },
        judgedBy: { select: { id: true, name: true } }
      }
    }),
    prisma.guidingLight.findFirst({
      where: { chapterId, status: 'OPEN' },
      orderBy: { meetingDate: 'desc' },
      select: { judgedBy: { select: { id: true, name: true } } }
    }),
    getGuidingLightDeferral()
  ])

  // a deferred week keeps the same judge, so it wins over the last winner shown below
  const lastWinner = guidingLights.find((r) => r.winner)?.winner ?? null
  const todayStart = new Date(`${await etDateISO()}T00:00:00Z`)
  const currentJudge = openRound?.judgedBy ?? deferral?.judge ?? lastWinner

  const serializedGuidingLights = guidingLights.map((r) => ({
    ...r,
    status: displayStatus(r.status, r.meetingDate, todayStart),
    meetingDate: r.meetingDate.toISOString()
  }))

  return { currentJudge, records: serializedGuidingLights, deferral }
}
