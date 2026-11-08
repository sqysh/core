'use server'

import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'
import { broadcast } from './broadcast'
import { revalidatePath } from 'next/cache'

export async function castVote(pollId: string, optionId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not signed in' }

  const option = await prisma.pollOption.findFirst({
    where: { id: optionId, pollId, poll: { chapterId } },
    select: { poll: { select: { status: true } } }
  })
  if (!option) return { success: false, error: 'That option is gone' }
  if (option.poll.status !== 'OPEN') return { success: false, error: 'This poll is closed' }

  try {
    await prisma.pollVote.upsert({
      where: { pollId_userId: { pollId, userId: session.user.id } },
      create: { pollId, optionId, userId: session.user.id },
      update: { optionId, votedAt: new Date() }
    })
    await broadcast(pollId)
    revalidatePath('/polls')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Could not save your vote' }
  }
}
