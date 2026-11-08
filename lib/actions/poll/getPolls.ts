'use server'

import { pollSelect, toView } from '@/app/(authenticated)/(active)/polls/_lib'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'
import { PollRow, PollView } from '@/types/poll.types'

export async function getPolls(): Promise<ActionResult<PollView[]>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not signed in' }
  try {
    const [open, closed] = await Promise.all([
      prisma.poll.findMany({
        where: { chapterId, status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
        select: pollSelect
      }),
      prisma.poll.findMany({
        where: { chapterId, status: 'CLOSED' },
        orderBy: { closedAt: 'desc' },
        take: 5,
        select: pollSelect
      })
    ])
    const viewer = { id: session.user.id, role: session.user.role }
    return { success: true, data: [...open, ...closed].map((p) => toView(p as PollRow, viewer)) }
  } catch {
    return { success: false, error: 'Could not load polls' }
  }
}
