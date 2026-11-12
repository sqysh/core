import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import {
  buildScript,
  Matchup,
  ScriptNames,
  Segment,
  StageMember,
  StagePerson,
  StagePresentation
} from '@/lib/constants/stage.constants'
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
    guidingLight: StagePerson | null
    todayWinner: StagePerson | null
    education: StagePerson | null
    coDirectors: StagePerson[]
    eventCoordinator: StagePerson | null
    membership: StagePerson[]
    members: StageMember[]
    openRoundId: string | null
    isSuperUser: boolean
  }
  error?: string
}> {
  try {
    const session = await auth()
    const todayISO = await etDateISO()
    const todayStart = new Date(`${todayISO}T00:00:00Z`)
    const { date: meetingDate } = await nextMeetingDate()
    const person = { id: true, name: true, company: true, image: true } as const

    const [
      todayRound,
      lastRound,
      education,
      hostTerm,
      coDirTerms,
      treasurerTerm,
      eventCoordinatorTerm,
      membershipTerms,
      presentation,
      scheduleRes,
      matchups,
      members
    ] = await Promise.all([
      prisma.guidingLight.findFirst({
        where: { chapterId, meetingDate: { gte: todayStart } },
        select: { id: true, status: true, judgedBy: { select: person }, winner: { select: person } }
      }),
      prisma.guidingLight.findFirst({
        where: { chapterId, status: 'REVEALED', meetingDate: { lt: todayStart } },
        orderBy: { meetingDate: 'desc' },
        select: { winner: { select: person } }
      }),
      // Match these role values to your LeadershipTerm enum
      prisma.leadershipTerm.findFirst({
        where: { chapterId, isActive: true, position: 'EDUCATION_COORDINATOR' },
        select: { holder: { select: person } }
      }),
      prisma.leadershipTerm.findFirst({
        where: { chapterId, isActive: true, position: 'HOST' },
        select: { holder: { select: { name: true } } }
      }),
      prisma.leadershipTerm.findMany({
        where: { chapterId, isActive: true, position: 'CO_DIRECTOR' },
        select: { holder: { select: person } }
      }),
      prisma.leadershipTerm.findFirst({
        where: { chapterId, isActive: true, position: 'TREASURER' },
        select: { holder: { select: { name: true } } }
      }),
      prisma.leadershipTerm.findFirst({
        where: { chapterId, isActive: true, position: 'EVENT_COORDINATOR' },
        select: { holder: { select: person } }
      }),
      prisma.leadershipTerm.findMany({
        where: { chapterId, isActive: true, position: 'MEMBERSHIP_COMMITTEE' },
        select: { holder: { select: person } }
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
      getThisWeeksMatchups().catch(() => [] as Matchup[]),
      prisma.user.findMany({
        where: { chapterId, membershipStatus: 'ACTIVE' },
        select: person,
        orderBy: { name: 'asc' }
      })
    ])

    const judge = todayRound?.judgedBy ?? lastRound?.winner ?? null
    const scheduled = (scheduleRes.data ?? []).find((s) => s.type === 'presenter' && s.date.slice(0, 10) === todayISO)
    const toPerson = (
      u: { name: string | null; company: string | null; image: string | null } | null | undefined
    ): StagePerson | null => (u ? { name: u.name ?? '', company: u.company, image: u.image } : null)

    const coDirectors = coDirTerms.map((t) => toPerson(t.holder)).filter((p): p is StagePerson => p !== null)
    const coDirNames = coDirTerms.map((t) => t.holder.name?.split(' ')[0]).filter(Boolean)
    const membership = membershipTerms.map((t) => toPerson(t.holder)).filter((p): p is StagePerson => p !== null)
    const membNames = membershipTerms.map((t) => t.holder.name?.split(' ')[0]).filter(Boolean)
    const names: ScriptNames = {
      host: hostTerm?.holder.name ?? session?.user?.name ?? 'the host',
      guidingLight: judge?.name ?? null,
      education: education?.holder.name ?? null,
      presenter: presentation?.presenter.name ?? scheduled?.name ?? null,
      coDirectors: coDirNames.length ? coDirNames.join(' & ') : null,
      treasurer: treasurerTerm?.holder.name ?? null,
      eventCoordinator: eventCoordinatorTerm?.holder.name ?? null,
      membership: membNames.length ? membNames.join(' & ') : null
    }

    return {
      success: true,
      data: {
        segments: buildScript(names),
        names,
        matchups,
        presentation: presentation
          ? { ...presentation, presenter: { ...presentation.presenter, name: presentation.presenter.name ?? '' } }
          : null,
        guidingLight: toPerson(judge),
        todayWinner: todayRound?.status === 'REVEALED' ? toPerson(todayRound.winner) : null,
        education: toPerson(education?.holder),
        coDirectors,
        eventCoordinator: toPerson(eventCoordinatorTerm?.holder),
        membership,
        members: members.map((m) => ({ id: m.id, name: m.name ?? '', company: m.company, profileImage: m.image })),
        openRoundId: todayRound && todayRound.status !== 'REVEALED' ? todayRound.id : null,
        isSuperUser: session?.user?.role === 'SUPER_USER'
      }
    }
  } catch {
    return { success: false, error: 'Failed to load the stage' }
  }
}
