import { CancelledMeeting } from '@/types/cancelled-meeting.types'
import { auth } from '../../auth/auth'
import prisma from '@/prisma/client'
import { chapterId } from '../../constants/api/chapterId'

export async function getCancelledMeetings(): Promise<{
  success: boolean
  data?: CancelledMeeting[]
  error?: string
}> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const meetings = await prisma.cancelledMeeting.findMany({
      where: { chapterId },
      orderBy: { date: 'asc' },
      select: { id: true, date: true, reason: true }
    })

    return {
      success: true,
      data: meetings.map((m) => ({
        id: m.id,
        date: m.date.toISOString(),
        reason: m.reason
      }))
    }
  } catch (error) {
    return { success: false, error: 'Failed to load cancelled meetings' }
  }
}
