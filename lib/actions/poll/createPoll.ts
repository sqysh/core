'use server'

import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { pollSchema } from '@/lib/schemas/poll.schema'
import { createLog } from '@/lib/utils/api/createLog'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'
import { PollInput } from '@/types/poll.types'
import { revalidatePath } from 'next/cache'

export async function createPoll(input: PollInput): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user?.id) {
    await createLog('warn', 'createPoll: no session')
    return { success: false, error: 'Not signed in' }
  }
  if (session.user.membershipStatus !== 'ACTIVE' && session.user.role !== 'SUPER_USER') {
    await createLog('warn', 'createPoll: blocked non-active member', {
      userId: session.user.id,
      status: session.user.membershipStatus
    })
    return { success: false, error: 'Active members only' }
  }

  const parsed = pollSchema.safeParse(input)
  if (!parsed.success) {
    await createLog('warn', 'createPoll: validation failed', {
      userId: session.user.id,
      issue: parsed.error.issues[0]?.message
    })
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Check the poll' }
  }

  try {
    const poll = await prisma.poll.create({
      data: {
        chapterId,
        question: parsed.data.question,
        createdById: session.user.id,
        options: { create: parsed.data.options.map((label, order) => ({ label, order })) }
      },
      select: { id: true }
    })
    await createLog('info', 'createPoll: created', {
      pollId: poll.id,
      userId: session.user.id,
      options: parsed.data.options.length
    })
    revalidatePath('/polls')
    revalidatePath('/dashboard')
    return { success: true, data: poll }
  } catch (err) {
    await createLog('error', 'createPoll: failed', { userId: session.user.id, err: String(err) })
    return { success: false, error: 'Could not create the poll' }
  }
}
