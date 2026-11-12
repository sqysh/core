'use server'

import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { TREASURY_CHANNEL, TREASURY_EVENT, TREASURY_ROLES } from '@/lib/constants/stage.constants'
import { pusher } from '@/lib/pusher/pusher'
import { createLog } from '@/lib/utils/api/createLog'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'
import { revalidatePath } from 'next/cache'

async function refreshBoard() {
  // any treasury change nudges the TV board to refetch
  try {
    return await pusher.trigger(TREASURY_CHANNEL, TREASURY_EVENT, { at: Date.now() })
  } catch {}
}

export async function removeObligation(id: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not signed in' }
  if (!TREASURY_ROLES.has(session.user.role)) return { success: false, error: 'Treasurer only' }

  try {
    const res = await prisma.treasuryObligation.deleteMany({ where: { id, chapterId } })
    if (res.count === 0) return { success: false, error: 'Not found' }
    await refreshBoard()
    await createLog('info', 'removeObligation', { userId: session.user.id, id })
    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch (err) {
    await createLog('error', 'removeObligation: failed', { userId: session.user.id, err: String(err) })
    return { success: false, error: 'Could not remove that' }
  }
}
