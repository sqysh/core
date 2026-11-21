import 'server-only'
import prisma from '@/prisma/client'
import { equippedItems, isStageId, StageId } from '@/lib/vessel/catalog'
import {
  creditsEarned,
  FREE_ITEMS,
  isItemId,
  itemDef,
  ItemId,
  needsProblem,
  stagePrice,
  Stats,
  SUCCESSORS
} from '@/lib/vessel/items'
import { vesselFromRow, VESSEL_SELECT } from '@/lib/vessel/persistence'

// What a member owns and what they can spend, decided on the server and never from anything the browser sends:
//   free      the starter boat and everything basic (every locker paint, black included; all three finishes)
//   unlocks   VesselUnlock rows, one per item per member (so nothing is had twice), including ids since replaced
//             (items.ts, SUCCESSORS): bought with credits, and later
//             treasure, achievements, events and Stripe purchases, each recording its source
//   legacy    anything already on the boat they saved before this progression arrived, so no one loses the boat they
//             had. It's made permanent (a 'legacy' VesselUnlock) the first time a save would take it off.
// Shipyard credits are earned from what a member has done for CORE (items.ts, CREDITS_PER), counted here from records
// someone else confirmed, so nobody can type their way to an upgrade:
//   meetings   Attendance rows (one per member per meeting, made at check-in)
//   1-2-1s     1-2-1s marked completed, for both members in it
//   referrals  referrals they gave that the receiver has acknowledged (moved on from GIVEN)
//   TYFCB      closed business reported by another member, thanking them as the giver
//   closed     closed business they reported themselves, unless disputed or rejected
// less what they've spent, which each 'credits' unlock records in sourceRef.

export type Credits = { earned: number; spent: number; balance: number }

export type Entitlements = {
  owned: ItemId[]
  /** What they've done, which milestones and credits are counted from */
  stats: Stats
  credits: Credits
  /** Owned only because it's on their saved boat; becomes a permanent grant if they take it off */
  legacy: ItemId[]
}

/** Prisma, or a transaction (the purchase reads and writes inside one) */
type Db = Pick<
  typeof prisma,
  'attendance' | 'oneTwoOne' | 'referral' | 'closedBusiness' | 'vesselUnlock' | 'memberVessel'
>

/** Statuses that mean a referral hasn't been acknowledged, or a closed deal doesn't stand */
const UNACKNOWLEDGED = ['GIVEN', 'CANCELLED', 'REJECTED', 'DECLINED']
const NOT_STANDING = ['DISPUTED', 'REJECTED', 'CANCELLED']

/** What a member has done, from confirmed records */
export async function statsOf(userId: string, db: Db = prisma): Promise<Stats> {
  const [meetings, oneToOnes, referrals, tyfcb, closed] = await Promise.all([
    db.attendance.count({ where: { userId } }),
    db.oneTwoOne.count({ where: { completed: true, OR: [{ requesterId: userId }, { recipientId: userId }] } }),
    db.referral.count({ where: { giverId: userId, status: { notIn: UNACKNOWLEDGED } } }),
    db.closedBusiness.count({
      where: { giverId: userId, receiverId: { not: userId }, status: { notIn: NOT_STANDING } }
    }),
    db.closedBusiness.count({ where: { receiverId: userId, status: { notIn: NOT_STANDING } } })
  ])
  return { meetings, oneToOnes, referrals, tyfcb, closed }
}

export async function getEntitlements(userId: string, db: Db = prisma): Promise<Entitlements> {
  const [stats, unlocks, row] = await Promise.all([
    statsOf(userId, db),
    db.vesselUnlock.findMany({ where: { userId }, select: { itemId: true, source: true, sourceRef: true } }),
    db.memberVessel.findUnique({ where: { userId }, select: VESSEL_SELECT })
  ])
  const owned = new Set<ItemId>(FREE_ITEMS)
  for (const u of unlocks) {
    if (isItemId(u.itemId)) owned.add(u.itemId)
    // bought under an id the catalog has since replaced: the parts that replaced it are theirs
    for (const id of SUCCESSORS[u.itemId] ?? []) if (isItemId(id)) owned.add(id)
  }
  const legacy = row
    ? equippedItems(vesselFromRow(row)).filter((id): id is ItemId => isItemId(id) && !owned.has(id))
    : []
  for (const id of legacy) owned.add(id)
  const earned = creditsEarned(stats)
  const spent = unlocks.filter((u) => u.source === 'credits').reduce((n, u) => n + (Number(u.sourceRef) || 0), 0)
  return { owned: [...owned], stats, credits: { earned, spent, balance: earned - spent }, legacy }
}

/** Items a config uses that the member doesn't own, with what each would take */
export function missingFor(owned: ItemId[], equipped: string[]) {
  const have = new Set<string>(owned)
  return equipped.filter((id) => !have.has(id)).map((id) => ({ id, price: isItemId(id) ? itemDef(id).price : null }))
}

/** A refusal, in words a member can read */
export class Refused extends Error {}

/**
 * Spends a member's credits on a vessel level or an accessory, inside the caller's transaction: takes a lock on their
 * credits first (held until the transaction ends, so two taps can't spend the same credits twice), then checks it's for
 * sale, not already theirs, unlocked for them (the level before it; a vessel level reached) and that the balance covers
 * it. A level costs its price less what they already paid for its parts (stagePrice). Structural parts come with a level
 * and aren't sold on their own. Throws Refused when it can't.
 */
export async function spendCredits(
  tx: Db & { $executeRaw: typeof prisma.$executeRaw },
  userId: string,
  itemId: ItemId
): Promise<{ owned: ItemId[]; credits: Credits; cost: number }> {
  const def = itemDef(itemId)
  const stage = itemId.startsWith('stage:') && isStageId(itemId.slice(6)) ? (itemId.slice(6) as StageId) : null
  if (def.price.kind !== 'credits') throw new Refused(`${def.name} can’t be had with credits`)
  if (!stage && def.category && !def.custom) throw new Refused(`${def.name} comes with a vessel upgrade`)
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`vessel-credits:${userId}`}))`
  const e = await getEntitlements(userId, tx)
  if (e.owned.includes(itemId)) throw new Refused(`${def.name} is already yours`)
  const blocked = needsProblem(itemId, e.stats, e.owned)
  if (blocked) throw new Refused(blocked)
  const cost = stage ? stagePrice(stage, e.owned) : def.price.credits
  if (e.credits.balance < cost) throw new Refused(`You need ${cost - e.credits.balance} more credits`)
  await tx.vesselUnlock.create({ data: { userId, itemId, source: 'credits', sourceRef: String(cost) } })
  return {
    owned: [...e.owned, itemId],
    credits: { ...e.credits, spent: e.credits.spent + cost, balance: e.credits.balance - cost },
    cost
  }
}
