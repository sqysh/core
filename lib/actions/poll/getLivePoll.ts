'use server'

import { pollSelect, toView } from '@/app/(authenticated)/(active)/polls/_lib'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'
import { PollRow, PollView } from '@/types/poll.types'
import { isActingHost } from '@/lib/actions/leadership/isActingHost'

export async function getLivePoll(): Promise<ActionResult<PollView | null>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not signed in' }

  const p = await prisma.poll.findFirst({
    where: { chapterId, launchedAt: { not: null } },
    orderBy: { launchedAt: 'desc' },
    select: pollSelect
  })
  if (!p) return { success: true, data: null }

  const isHost = await isActingHost(session.user.id)
  return { success: true, data: toView(p as PollRow, { id: session.user.id, role: session.user.role }, isHost) }
}
