import { chapterId } from '@/lib/constants/api/chapterId'
import prisma from '@/prisma/client'

export async function getGuidingLightDashboardData() {
  const [guidingLights, openRound] = await Promise.all([
    prisma.guidingLight.findMany({
      where: { chapterId },
      orderBy: { meetingDate: 'desc' },
      take: 4,
      select: {
        id: true,
        meetingDate: true,
        winner: { select: { id: true, name: true, company: true, profileImage: true } },
        judgedBy: { select: { id: true, name: true } }
      }
    }),
    prisma.guidingLight.findFirst({
      where: { chapterId, status: 'OPEN' },
      orderBy: { meetingDate: 'desc' },
      select: { judgedBy: { select: { id: true, name: true } } }
    })
  ])

  const currentJudge = openRound?.judgedBy ?? guidingLights[0]?.winner ?? null

  const serializedGuidingLights = guidingLights.map((r) => ({
    ...r,
    meetingDate: r.meetingDate.toISOString()
  }))

  return { currentJudge, records: serializedGuidingLights }
}
