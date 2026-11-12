'use server'

import { auth } from '@/lib/auth/auth'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { pusher } from '@/lib/pusher/pusher'
import { TREASURY_CHANNEL } from '@/lib/constants/stage.constants'
import { isActingHost } from '@/lib/actions/leadership/isActingHost'

// Pull the treasurer back to /treasurer if they navigated away mid-meeting.
export async function notifyTreasurer() {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not signed in' }

  const host = await isActingHost(session.user.id)
  if (!host && session.user.role !== 'SUPER_USER') return { success: false, error: 'Hosts only' }

  const term = await prisma.leadershipTerm.findFirst({
    where: { chapterId, isActive: true, position: 'TREASURER' },
    select: { holderId: true }
  })
  if (!term?.holderId) return { success: false, error: 'No treasurer set' }

  await pusher.trigger(TREASURY_CHANNEL, 'open-treasurer', { treasurerId: term.holderId })
  return { success: true }
}
