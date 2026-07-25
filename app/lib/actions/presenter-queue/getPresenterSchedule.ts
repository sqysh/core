import { ScheduledPresenter } from '@/types/presenter-queue.types'
import { auth } from '../../auth/auth'
import prisma from '@/prisma/client'
import { chapterId } from '../../constants/api/chapterId'
import { buildSchedule, getUpcomingMeetingDates } from '../../utils/presenter-engine.utils'
import { getAllUpcomingThursdays } from '../../utils/attendance.utils'

export async function getPresenterSchedule(): Promise<{
  success: boolean
  data?: ScheduledPresenter[]
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const [queue, cancelledMeetings, visitorDays] = await Promise.all([
      prisma.presenterQueue.findMany({
        where: { chapterId },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          userId: true,
          position: true,
          createdAt: true,
          user: { select: { name: true, company: true, industry: true } }
        }
      }),
      prisma.cancelledMeeting.findMany({ where: { chapterId }, select: { date: true } }),
      prisma.visitorDay.findMany({ where: { chapterId }, select: { date: true } })
    ])

    if (!queue.length) return { success: true, data: [] }

    const cancelledDates = cancelledMeetings.map((m) => m.date.toISOString())
    const visitorDates = visitorDays.map((v) => v.date.toISOString())
    const startIndex = 0

    const dates = getUpcomingMeetingDates(cancelledDates, visitorDates, 52)
    const scheduled = buildSchedule(
      queue.map((q) => ({ userId: q.userId, name: q.user.name ?? '', position: q.position })),
      dates.map((d) => new Date(`${d}T12:00:00`)),
      startIndex
    )

    const allThursdays = getAllUpcomingThursdays(52)

    let scheduledIndex = 0
    const data: ScheduledPresenter[] = allThursdays
      .slice(0, 24)
      .map((dateStr) => {
        if (cancelledDates.some((d) => d.slice(0, 10) === dateStr)) {
          return {
            userId: null,
            name: 'No Meeting',
            company: 'Cancelled',
            date: `${dateStr}T12:00:00`,
            isNext: false,
            isYou: false,
            type: 'off' as const
          }
        }

        if (visitorDates.some((d) => d.slice(0, 10) === dateStr)) {
          return {
            userId: null,
            name: 'Visitor Day',
            company: 'Open to guests',
            date: `${dateStr}T12:00:00`,
            isNext: false,
            isYou: false,
            type: 'visitor_day' as const
          }
        }

        const s = scheduled[scheduledIndex % scheduled.length]
        const isNext = scheduledIndex === 0
        scheduledIndex++

        if (!s) return null

        return {
          userId: s.userId,
          name: s.name,
          company: queue.find((q) => q.userId === s.userId)?.user.company ?? '',
          date: `${dateStr}T12:00:00`,
          isNext,
          isYou: s.userId === session.user.id,
          type: 'presenter' as const
        }
      })
      .filter(Boolean) as ScheduledPresenter[]

    return { success: true, data }
  } catch (error) {
    return { success: false, error: 'Failed to load presenter schedule' }
  }
}
