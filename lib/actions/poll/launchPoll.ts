'use server'

import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'
import { broadcast } from './broadcast'
import { revalidatePath } from 'next/cache'
import { pusher } from '@/lib/pusher/pusher'
import { POLL_LAUNCH_EVENT, POLL_LIVE_CHANNEL } from '@/lib/constants/poll.constants'
import { isActingHost } from '../leadership/isActingHost'

export async function launchPoll(pollId: string): Promise<ActionResult> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: 'Not signed in' }

  const isHost = await isActingHost(userId)
  if (!isHost && session.user.role !== 'SUPER_USER') return { success: false, error: 'Hosts only' }

  const poll = await prisma.poll.findFirst({ where: { id: pollId, chapterId }, select: { status: true } })
  if (!poll) return { success: false, error: 'Poll not found' }

  try {
    if (poll.status !== 'OPEN') {
      await prisma.poll.update({ where: { id: pollId }, data: { status: 'OPEN', closedAt: null } })
      await broadcast(pollId)
      revalidatePath('/polls')
    }
    await pusher.trigger(POLL_LIVE_CHANNEL, POLL_LAUNCH_EVENT, { pollId }).catch(() => {})
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Could not launch the poll' }
  }
}
