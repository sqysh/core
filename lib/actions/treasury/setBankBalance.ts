'use server'

import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { TREASURY_CHANNEL, TREASURY_EVENT } from '@/lib/constants/stage.constants'
import { pusher } from '@/lib/pusher/pusher'
import { createLog } from '@/lib/utils/api/createLog'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'
import { revalidatePath } from 'next/cache'

const TREASURY_ROLES = new Set(['SUPER_USER', 'TREASURER'])

export async function setBankBalance(amount: number): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not signed in' }
  if (!TREASURY_ROLES.has(session.user.role)) {
    await createLog('warn', 'setBankBalance: blocked', { userId: session.user.id, role: session.user.role })
    return { success: false, error: 'Treasurer only' }
  }
  if (!Number.isFinite(amount) || amount < 0) return { success: false, error: 'Enter a valid amount' }

  try {
    await prisma.chapterTreasury.upsert({
      where: { chapterId },
      create: { chapterId, bankBalance: amount, updatedById: session.user.id },
      update: { bankBalance: amount, updatedById: session.user.id }
    })
    // if the board is up on the TV, nudge it to refetch
    await pusher.trigger(TREASURY_CHANNEL, TREASURY_EVENT, { balance: amount }).catch(() => {})
    await createLog('info', 'setBankBalance: updated', { userId: session.user.id, amount })
    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    await createLog('error', 'setBankBalance: failed', { userId: session.user.id, err: String(err) })
    return { success: false, error: 'Could not save the balance' }
  }
}
