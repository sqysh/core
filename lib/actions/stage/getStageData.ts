import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { buildScript, Matchup, ScriptNames, Segment, StagePresentation } from '@/lib/constants/stage.constants'
import { etDateISO, nextMeetingDate } from '@/lib/utils/date.utils'
import prisma from '@/prisma/client'
import { getPresenterSchedule } from '../presenter-queue/getPresenterSchedule'
import { getThisWeeksMatchups } from '../matchups/getThisWeeksMatchups'

export async function getStageData(): Promise<{
  success: boolean
  data?: {
    segments: Segment[]
    names: ScriptNames
    presentation: StagePresentation | null
    matchups: Matchup[]
    guidingLightId: string | null
  }
  error?: string
}> {
  try {
    const session = await auth()
    const todayISO = await etDateISO()
    const todayStart = new Date(`${todayISO}T00:00:00Z`)
    const { date: meetingDate } = await nextMeetingDate()

    const [todayRound, lastRound, education, hostTerm, presentation, scheduleRes, matchups] = await Promise.all([
      prisma.guidingLight.findFirst({
        where: { chapterId, meetingDate: { gte: todayStart } },
        select: { judgedBy: { select: { id: true, name: true } } }
      }),
      prisma.guidingLight.findFirst({
        where: { chapterId, status: 'REVEALED', meetingDate: { lt: todayStart } },
        orderBy: { meetingDate: 'desc' },
        select: { winner: { select: { id: true, name: true } } }
      }),
      // Match these role values to your LeadershipTerm enum
      prisma.leadershipTerm.findFirst({
        where: { chapterId, isActive: true, position: 'EDUCATION_COORDINATOR' },
        select: { holder: { select: { name: true } } }
      }),
      prisma.leadershipTerm.findFirst({
        where: { chapterId, isActive: true, position: 'HOST' },
        select: { holder: { select: { name: true } } }
      }),
      prisma.presentation.findUnique({
        where: { chapterId_meetingDate: { chapterId, meetingDate } },
        select: {
          id: true,
          kind: true,
          fileUrl: true,
          fileName: true,
          pageCount: true,
          notes: true,
          presenter: { select: { id: true, name: true, company: true } }
        }
      }),
      getPresenterSchedule(),
      getThisWeeksMatchups().catch(() => [] as Matchup[])
    ])

    const judge = todayRound?.judgedBy ?? lastRound?.winner ?? null
    const scheduled = (scheduleRes.data ?? []).find((s) => s.type === 'presenter' && s.date.slice(0, 10) === todayISO)

    const names: ScriptNames = {
      host: hostTerm?.holder.name ?? session?.user?.name ?? 'the host',
      guidingLight: judge?.name ?? null,
      education: education?.holder.name ?? null,
      presenter: presentation?.presenter.name ?? scheduled?.name ?? null
    }
    const segments = buildScript(names)

    return {
      success: true,
      data: {
        segments,
        names,
        matchups,
        presentation: presentation
          ? { ...presentation, presenter: { ...presentation.presenter, name: presentation.presenter.name ?? '' } }
          : null,
        guidingLightId: judge?.id ?? null
      }
    }
  } catch {
    return { success: false, error: 'Failed to load the stage' }
  }
}
