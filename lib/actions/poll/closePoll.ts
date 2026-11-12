'use server'

import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'
import { revalidatePath } from 'next/cache'
import { broadcast } from './broadcast'
import { isActingHost } from '../leadership/isActingHost'

export async function closePoll(pollId: string): Promise<ActionResult> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: 'Not signed in' }

  const poll = await prisma.poll.findFirst({
    where: { id: pollId, chapterId },
    select: { createdById: true, status: true }
  })
  if (!poll) return { success: false, error: 'Poll not found' }

  const isHost = await isActingHost(userId)
  if (poll.createdById !== userId && !isHost && session.user.role !== 'SUPER_USER')
    return { success: false, error: 'Not your poll' }
  if (poll.status === 'CLOSED') return { success: true, data: undefined }

  try {
    await prisma.poll.update({ where: { id: pollId }, data: { status: 'CLOSED', closedAt: new Date() } })
    await broadcast(pollId)
    revalidatePath('/polls')
    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Could not close the poll' }
  }
}
