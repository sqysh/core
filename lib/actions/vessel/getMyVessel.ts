'use server'

import { auth } from '@/lib/auth/auth'
import { createLog } from '@/lib/utils/api/createLog'
import { CosmeticId, defaultVesselConfig, FREE_COSMETICS, isCosmeticId, VesselConfig } from '@/lib/vessel/catalog'
import { VESSEL_SELECT, vesselFromRow } from '@/lib/vessel/persistence'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'

export type MyVessel = {
  config: VesselConfig
  /** False until they've saved one: the config is then their default */
  saved: boolean
  /** Every cosmetic they may equip: the free ones plus what they've earned */
  unlocked: CosmeticId[]
}

/** The signed-in member's boat (their saved one, or their default) and the cosmetics open to them */
export async function getMyVessel(): Promise<ActionResult<MyVessel>> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: 'Not signed in' }

  try {
    const [row, unlocks] = await Promise.all([
      prisma.memberVessel.findUnique({ where: { userId }, select: VESSEL_SELECT }),
      prisma.vesselUnlock.findMany({ where: { userId }, select: { itemId: true } })
    ])
    const earned = unlocks.map((u) => u.itemId).filter(isCosmeticId)
    return {
      success: true,
      data: {
        config: row ? vesselFromRow(row) : defaultVesselConfig(userId),
        saved: !!row,
        unlocked: [...new Set([...FREE_COSMETICS, ...earned])]
      }
    }
  } catch (error) {
    await createLog('error', 'getMyVessel: failed', { userId, error: String(error) })
    return { success: false, error: 'Could not load your boat' }
  }
}
