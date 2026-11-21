'use server'

import { auth } from '@/lib/auth/auth'
import { createLog } from '@/lib/utils/api/createLog'
import { defaultVesselConfig, VesselConfig } from '@/lib/vessel/catalog'
import { Credits, getEntitlements } from '@/lib/vessel/entitlements'
import { ItemId, Stats } from '@/lib/vessel/items'
import { VesselStats, vesselStats } from '@/lib/vessel/stats'
import { VESSEL_SELECT, vesselFromRow } from '@/lib/vessel/persistence'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'

export type MyVessel = {
  config: VesselConfig
  /** False until they've saved one: the config is then their starter boat */
  saved: boolean
  /** Every item they own: free, bought with credits, granted, or on the boat they already had */
  unlocked: ItemId[]
  /** What they've done for CORE (milestones are counted from these) */
  stats: Stats
  /** Shipyard credits: earned from all of that, less what they've spent */
  credits: Credits
  /** How the boat performs, worked out here from the boat itself (never taken from a client) */
  vesselStats: VesselStats
}

/** The signed-in member's boat (their saved one, or the starter) and what they own */
export async function getMyVessel(): Promise<ActionResult<MyVessel>> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: 'Not signed in' }

  try {
    const [row, entitlements] = await Promise.all([
      prisma.memberVessel.findUnique({ where: { userId }, select: VESSEL_SELECT }),
      getEntitlements(userId)
    ])
    const config = row ? vesselFromRow(row) : defaultVesselConfig(userId)
    return {
      success: true,
      data: {
        config,
        saved: !!row,
        unlocked: entitlements.owned,
        stats: entitlements.stats,
        credits: entitlements.credits,
        vesselStats: vesselStats(config)
      }
    }
  } catch (error) {
    await createLog('error', 'getMyVessel: failed', { userId, error: String(error) })
    return { success: false, error: 'Could not load your boat' }
  }
}
