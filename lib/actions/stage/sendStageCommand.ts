'use server'

import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { HOST_ROLES } from '@/lib/constants/roles.constants'
import { STAGE_CHANNEL, STAGE_EVENT, StageCommand } from '@/lib/constants/stage.constants'
import { pusher } from '@/lib/pusher/pusher'
import { nextMeetingDate } from '@/lib/utils/date.utils'
import prisma from '@/prisma/client'

/**
 * Hosts can send anything. The presenter of today's deck can send the
 * present.* commands only, so they can drive their own slides and nothing else.
 */
export async function sendStageCommand(command: StageCommand): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not signed in' }

  const isHost = HOST_ROLES.has(session.user.role)
  if (!isHost) {
    if (!command.type.startsWith('present.')) return { success: false, error: 'Not allowed' }
    const { date } = await nextMeetingDate()
    const mine = await prisma.presentation.findUnique({
      where: { chapterId_meetingDate: { chapterId, meetingDate: date } },
      select: { presenterId: true }
    })
    if (mine?.presenterId !== session.user.id) return { success: false, error: 'Not your presentation' }
  }

  try {
    await pusher.trigger(STAGE_CHANNEL, STAGE_EVENT, command)
    return { success: true }
  } catch {
    return { success: false, error: 'Could not reach the display' }
  }
}
