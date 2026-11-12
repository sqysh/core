'use server'

import { pollSelect, toView } from '@/app/(authenticated)/(active)/polls/_lib'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'
import { PollRow, PollView } from '@/types/poll.types'
import { isActingHost } from '@/lib/actions/leadership/isActingHost'

export async function getPoll(pollId: string): Promise<ActionResult<PollView>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not signed in' }
  const p = await prisma.poll.findFirst({ where: { id: pollId, chapterId }, select: pollSelect })
  if (!p) return { success: false, error: 'Poll not found' }
  const isHost = await isActingHost(session.user.id)
  return { success: true, data: toView(p as PollRow, { id: session.user.id, role: session.user.role }, isHost) }
}
