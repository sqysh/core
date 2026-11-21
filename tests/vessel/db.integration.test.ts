// Server-side credits, levels and accessories against the real database. Every write happens inside a transaction
// that is always rolled back: nothing is ever kept.
import assert from 'node:assert/strict'
import prisma from '@/prisma/client'
import { getEntitlements, Refused, spendCredits, statsOf } from '@/lib/vessel/entitlements'
import { creditsEarned, stagePrice, SUCCESSORS, isItemId } from '@/lib/vessel/items'

class Rollback extends Error {}
const rolledBack = async (fn: (tx: any) => Promise<void>) => {
  try { await prisma.$transaction(async (tx) => { await fn(tx); throw new Rollback() }, { timeout: 20000 }) } catch (e) { if (!(e instanceof Rollback)) throw e }
}
const refused = async (p: Promise<unknown>, re: RegExp) => {
  try { await p } catch (e) { assert.ok(e instanceof Refused, String(e)); assert.match((e as Error).message, re); return }
  assert.fail('expected a refusal')
}
let passed = 0
const test = async (name: string, fn: () => Promise<void>) => { await fn(); passed++; console.log('  ✓', name) }

const members = await prisma.user.findMany({ where: { membershipStatus: 'ACTIVE' }, select: { id: true } })
const before = await prisma.vesselUnlock.count()
let richest = { id: '', credits: 0 }
for (const { id } of members) { const c = creditsEarned(await statsOf(id)); if (c > richest.credits) richest = { id, credits: c } }
const userId = richest.id

await test('upgrading spends the level price once, in order, and the level is then owned', async () => {
  await rolledBack(async (tx) => {
    const start = await getEntitlements(userId, tx)
    await refused(spendCredits(tx, userId, 'stage:console'), /Launch first/)
    const a = await spendCredits(tx, userId, 'stage:launch')
    assert.equal(a.cost, stagePrice('launch', start.owned))
    assert.ok(a.owned.includes('stage:launch'))
    const b = await spendCredits(tx, userId, 'stage:console')
    assert.equal(b.credits.balance, start.credits.balance - a.cost - b.cost)
    const row = await tx.vesselUnlock.findUnique({ where: { userId_itemId: { userId, itemId: 'stage:console' } } })
    assert.equal(row.sourceRef, String(b.cost))
    await refused(spendCredits(tx, userId, 'stage:launch'), /already yours/)
  })
})

await test('accessories unlock by level but are bought separately; structural parts are never sold alone', async () => {
  await rolledBack(async (tx) => {
    await refused(spendCredits(tx, userId, 'fun:hot-tub'), /Level 4/)
    await spendCredits(tx, userId, 'stage:launch')
    await spendCredits(tx, userId, 'stage:console')
    await refused(spendCredits(tx, userId, 'fun:hot-tub'), /Level 4/)
    await spendCredits(tx, userId, 'fun:grill') // level 3
    await refused(spendCredits(tx, userId, 'hull:cruiser'), /comes with a vessel upgrade/)
    await refused(spendCredits(tx, userId, 'paint:pearl'), /can’t be had with credits/)
  })
})

await test('no purchase beyond the balance', async () => {
  await rolledBack(async (tx) => {
    const e = await getEntitlements(userId, tx)
    await tx.vesselUnlock.create({ data: { userId, itemId: 'test:drain', source: 'credits', sourceRef: String(e.credits.balance) } })
    await refused(spendCredits(tx, userId, 'stage:launch'), /more credits/)
  })
})

await test('two purchases at once are serialised by the credits lock', async () => {
  const order: string[] = []
  const a = rolledBack(async (tx) => { await spendCredits(tx, userId, 'deck:cleats'); order.push('A holds'); await new Promise((r) => setTimeout(r, 1200)); order.push('A ends') })
  await new Promise((r) => setTimeout(r, 300))
  const b = rolledBack(async (tx) => { await spendCredits(tx, userId, 'deck:cleats'); order.push('B got it') })
  await Promise.all([a, b])
  assert.deepEqual(order, ['A holds', 'A ends', 'B got it'])
})

await test('earlier purchases are kept, still owned, and count toward the levels that include them (read only)', async () => {
  const rows = await prisma.vesselUnlock.findMany({ select: { userId: true, itemId: true, sourceRef: true } })
  for (const uid of new Set(rows.map((r) => r.userId))) {
    const e = await getEntitlements(uid)
    const mine = rows.filter((r) => r.userId === uid)
    for (const r of mine) for (const id of isItemId(r.itemId) ? [r.itemId] : SUCCESSORS[r.itemId] ?? []) assert.ok(e.owned.includes(id as never), `${r.itemId} → ${id}`)
    assert.equal(e.credits.spent, mine.reduce((n, r) => n + (Number(r.sourceRef) || 0), 0))
    console.log(`    member ${uid.slice(0, 8)}: ${mine.length} earlier purchases kept; balance ${e.credits.balance}; upgrade prices now Launch ${stagePrice('launch', e.owned)}/12, Center Console ${stagePrice('console', e.owned)}/25, Cruiser ${stagePrice('cruiser', e.owned)}/40`)
  }
})

assert.equal(await prisma.vesselUnlock.count(), before, 'nothing was written')
console.log(`db: ${passed} passed; unlock rows still ${before}`)
await prisma.$disconnect()
