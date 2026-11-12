'use server'

import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import {
  TREASURY_CHANNEL,
  TREASURY_EVENT,
  TREASURY_ROLES,
  TreasuryObligationItem
} from '@/lib/constants/stage.constants'
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

export async function addObligation(
  label: string,
  amount: number,
  dueDateISO?: string | null
): Promise<ActionResult<TreasuryObligationItem>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not signed in' }
  if (!TREASURY_ROLES.has(session.user.role)) return { success: false, error: 'Treasurer only' }

  const trimmed = label.trim()
  if (!trimmed) return { success: false, error: 'Add a label' }
  if (!Number.isFinite(amount) || amount < 0) return { success: false, error: 'Enter a valid amount' }

  try {
    const o = await prisma.treasuryObligation.create({
      data: {
        chapterId,
        label: trimmed,
        amount,
        dueDate: dueDateISO ? new Date(dueDateISO) : null,
        createdById: session.user.id
      }
    })
    await refreshBoard()
    await createLog('info', 'addObligation', { userId: session.user.id, id: o.id, amount })
    revalidatePath('/dashboard')
    return {
      success: true,
      data: { id: o.id, label: o.label, amount: Number(o.amount), dueDate: o.dueDate?.toISOString() ?? null }
    }
  } catch (err) {
    await createLog('error', 'addObligation: failed', { userId: session.user.id, err: String(err) })
    return { success: false, error: 'Could not add that' }
  }
}
