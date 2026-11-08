'use server'

import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'
import { revalidatePath } from 'next/cache'

export async function deletePoll(pollId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not signed in' }
  const poll = await prisma.poll.findFirst({ where: { id: pollId, chapterId }, select: { createdById: true } })
  if (!poll) return { success: false, error: 'Poll not found' }
  if (poll.createdById !== session.user.id && session.user.role !== 'SUPER_USER')
    return { success: false, error: 'Not your poll' }
  try {
    await prisma.poll.delete({ where: { id: pollId } })
    revalidatePath('/polls')
    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Could not delete the poll' }
  }
}
