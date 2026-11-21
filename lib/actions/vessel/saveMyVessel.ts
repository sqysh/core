'use server'

import { requireActiveMember } from '@/lib/auth/activeMember'
import { vesselConfigSchema } from '@/lib/schemas/vessel.schema'
import { createLog } from '@/lib/utils/api/createLog'
import { equippedItems, VesselConfig } from '@/lib/vessel/catalog'
import { getEntitlements, missingFor } from '@/lib/vessel/entitlements'
import { buildProblems, itemDef, priceLabel } from '@/lib/vessel/items'
import prisma from '@/prisma/client'
import { ActionResult } from '@/types/action.types'

/**
 * Saves the signed-in member's boat. Always their own (the id comes from the session, never the input), and only for an
 * active member (checked against their record). The shape is validated against the catalog, every part and fitting must
 * fit the boat it's on, and everything it uses must already be theirs.
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

  // every part needs what it's built on (a flybridge needs a wheelhouse), every fitting its mount
  const problems = buildProblems(config)
  if (problems.length) {
    await createLog('warn', 'saveMyVessel: does not fit', { userId, problems })
    return { success: false, error: `${itemDef(problems[0].id).name}: ${problems[0].problem}` }
  }

  try {
    // everything it uses must be owned: free, bought, granted, or on the boat they already had
    const entitlements = await getEntitlements(userId)
    const equipped = equippedItems(config)
    const missing = missingFor(entitlements.owned, equipped)
    if (missing.length) {
      await createLog('warn', 'saveMyVessel: not owned', { userId, missing: missing.map((m) => m.id) })
      const first = missing[0]
      return { success: false, error: first.price ? `Not yours yet: ${priceLabel(first.price)}` : 'That isn’t in the catalog' }
    }

    // anything they had on their old boat (from before progression) that this save takes off is made a permanent
    // unlock first, so they can always put it back
    const dropped = entitlements.legacy.filter((id) => !equipped.includes(id))
    await prisma.$transaction([
      ...dropped.map((itemId) =>
        prisma.vesselUnlock.upsert({
          where: { userId_itemId: { userId, itemId } },
          create: { userId, itemId, source: 'legacy' },
          update: {}
        })
      ),
      prisma.memberVessel.upsert({ where: { userId }, create: { userId, ...config }, update: config })
    ])
    await createLog('info', 'saveMyVessel: saved', { userId, vesselClass: config.vesselClass })
    return { success: true, data: config }
  } catch (error) {
    await createLog('error', 'saveMyVessel: failed', { userId, error: String(error) })
    return { success: false, error: 'Could not save your boat' }
  }
}
