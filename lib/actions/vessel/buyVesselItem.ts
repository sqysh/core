'use server'

import { requireActiveMember } from '@/lib/auth/activeMember'
import { createLog } from '@/lib/utils/api/createLog'
import { Credits, Refused, spendCredits } from '@/lib/vessel/entitlements'
import { isItemId, ItemId } from '@/lib/vessel/items'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'

/**
 * Spends the signed-in member's Shipyard credits on a vessel level (Upgrade Vessel) or an accessory (always their own
 * credits: the id comes from the session, and only an active member may). Every check happens on the server, in one
 * transaction (spendCredits). Only items sold for credits can be had here; treasure, achievements, events and paid
 * upgrades are granted by their own systems.
 */
export async function buyVesselItem(
  itemId: unknown
): Promise<ActionResult<{ owned: ItemId[]; credits: Credits; cost: number }>> {
  const member = await requireActiveMember()
  if (!member.ok) return { success: false, error: member.error ?? 'You can’t do that right now' }
  const userId = member.userId as string
  if (typeof itemId !== 'string' || !isItemId(itemId)) return { success: false, error: 'That isn’t in the shipyard' }

  try {
    const result = await prisma.$transaction((tx) => spendCredits(tx, userId, itemId))
    await createLog('info', 'buyVesselItem: bought', { userId, itemId, cost: result.cost })
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof Refused) return { success: false, error: error.message }
    await createLog('error', 'buyVesselItem: failed', { userId, itemId, error: String(error) })
    return { success: false, error: 'Could not complete that. Nothing was spent.' }
  }
}
