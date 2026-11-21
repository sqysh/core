'use server'

import { requireActiveMember } from '@/lib/auth/activeMember'
import { vesselConfigSchema } from '@/lib/schemas/vessel.schema'
import { createLog } from '@/lib/utils/api/createLog'
import { COSMETICS, equippedCosmetics, VesselConfig } from '@/lib/vessel/catalog'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'

/**
 * Saves the signed-in member's boat. Always their own (the id comes from the session, never the input), and only for an
 * active member (checked against their record); the shape is
 * validated against the catalog, and anything that isn't free must already be unlocked for them.
 */
export async function saveMyVessel(input: unknown): Promise<ActionResult<VesselConfig>> {
  // eligibility comes from the member's record (an ACTIVE membership), not the session, which doesn't carry it
  const member = await requireActiveMember()
  if (!member.ok) {
    await createLog('warn', `saveMyVessel: blocked (${member.reason})`, {
      userId: member.userId,
      status: member.status
    })
    return { success: false, error: member.error ?? 'You can’t save a boat right now' }
  }
  const userId = member.userId as string

  const parsed = vesselConfigSchema.safeParse(input)
  if (!parsed.success) {
    await createLog('warn', 'saveMyVessel: validation failed', { userId, issue: parsed.error.issues[0]?.message })
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Check your boat' }
  }
  // the schema guarantees every field (zod's inferred type marks them optional without strict null checks)
  const config = parsed.data as VesselConfig

  try {
    const locked = equippedCosmetics(config).filter((id) => !COSMETICS[id].free)
    if (locked.length) {
      const owned = await prisma.vesselUnlock.findMany({
        where: { userId, itemId: { in: locked } },
        select: { itemId: true }
      })
      const missing = locked.filter((id) => !owned.some((o) => o.itemId === id))
      if (missing.length) {
        await createLog('warn', 'saveMyVessel: locked cosmetic', { userId, missing })
        return { success: false, error: 'You haven’t unlocked that yet' }
      }
    }

    await prisma.memberVessel.upsert({
      where: { userId },
      create: { userId, ...config },
      update: config
    })
    await createLog('info', 'saveMyVessel: saved', { userId, vesselClass: config.vesselClass })
    return { success: true, data: config }
  } catch (error) {
    await createLog('error', 'saveMyVessel: failed', { userId, error: String(error) })
    return { success: false, error: 'Could not save your boat' }
  }
}
