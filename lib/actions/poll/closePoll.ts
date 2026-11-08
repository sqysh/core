'use server'

import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { HOST_ROLES } from '@/lib/constants/roles.constants'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'
import { revalidatePath } from 'next/cache'
import { broadcast } from './broadcast'

export async function closePoll(pollId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not signed in' }

  const poll = await prisma.poll.findFirst({
    where: { id: pollId, chapterId },
    select: { createdById: true, status: true }
  })
  if (!poll) return { success: false, error: 'Poll not found' }
  if (poll.createdById !== session.user.id && !HOST_ROLES.has(session.user.role))
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
