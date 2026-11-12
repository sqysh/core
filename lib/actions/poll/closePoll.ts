'use server'

import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'
import { revalidatePath } from 'next/cache'
import { broadcast } from './broadcast'
import { isActingHost } from '../leadership/isActingHost'
import { pusher } from '@/lib/pusher/pusher'
import { POLL_CLEAR_EVENT, POLL_LIVE_CHANNEL } from '@/lib/constants/poll.constants'

export async function closePoll(pollId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not signed in' }

  const poll = await prisma.poll.findFirst({
    where: { id: pollId, chapterId },
    select: { createdById: true, status: true }
  })
  if (!poll) return { success: false, error: 'Poll not found' }

  const isHost = await isActingHost(session.user.id)
  if (poll.createdById !== session.user.id && !isHost && session.user.role !== 'SUPER_USER')
    return { success: false, error: 'Not your poll' }

  try {
    await prisma.poll.update({
      where: { id: pollId },
      data: { status: 'CLOSED', closedAt: new Date(), launchedAt: null }
    })
    await broadcast(pollId)
    await pusher.trigger(POLL_LIVE_CHANNEL, POLL_CLEAR_EVENT, {}).catch(() => {})
    revalidatePath('/polls')
    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Could not close the poll' }
  }
}
