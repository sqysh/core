// Server-side credits, levels and accessories against the development database, with deterministic fixtures: each test
// builds its own throwaway member and the meetings that earn them credits, inside a transaction that is always rolled
// back, so nothing depends on who happens to be in the database and nothing is kept. Row counts are checked before and
// after (also when a test fails). Run with `npm run test:db` (tests/_support/db-guard.mjs decides where).
import assert from 'node:assert/strict'
import prisma from '@/prisma/client'
import { getEntitlements, Refused, spendCredits } from '@/lib/vessel/entitlements'
import { stagePrice, SUCCESSORS, isItemId } from '@/lib/vessel/items'

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

class Rollback extends Error {}
const rolledBack = async (fn: (tx: Tx) => Promise<void>) => {
  try {
    await prisma.$transaction(
      async (tx) => {
        await fn(tx)
        throw new Rollback()
      },
      { timeout: 20000 }
    )
  } catch (e) {
    if (!(e instanceof Rollback)) throw e
  }
}
const refused = async (p: Promise<unknown>, re: RegExp) => {
  try {
    await p
  } catch (e) {
    assert.ok(e instanceof Refused, String(e))
    assert.match((e as Error).message, re)
    return
  }
  assert.fail('expected a refusal')
}

// Meetings given to the fixture member: one credit each, enough to buy every level and any accessory in these tests
const FIXTURE_MEETINGS = 150
const FIXTURE_DAY = Date.UTC(1900, 0, 1)

/** A temporary active member with FIXTURE_MEETINGS attendances, created inside the transaction */
const makeMember = async (tx: Tx, chapterId: string) => {
  const user = await tx.user.create({
    data: {
      name: 'Vessel Test Member',
      email: `vessel-test-${crypto.randomUUID()}@example.invalid`,
      company: 'Vessel Tests',
      chapterId,
      membershipStatus: 'ACTIVE'
    },
    select: { id: true }
  })
  const dates = Array.from({ length: FIXTURE_MEETINGS }, (_, i) => new Date(FIXTURE_DAY + i * 86_400_000))
  await tx.meeting.createMany({ data: dates.map((date) => ({ chapterId, date })) })
  const meetings = await tx.meeting.findMany({ where: { chapterId, date: { in: dates } }, select: { id: true } })
  assert.equal(meetings.length, FIXTURE_MEETINGS, 'fixture meetings were created')
  await tx.attendance.createMany({ data: meetings.map((m) => ({ meetingId: m.id, userId: user.id })) })
  return user.id
}

const counts = async () => ({
  users: await prisma.user.count(),
  meetings: await prisma.meeting.count(),
  attendances: await prisma.attendance.count(),
  unlocks: await prisma.vesselUnlock.count(),
  vessels: await prisma.memberVessel.count()
})

const chapter = await prisma.chapter.findFirst({ select: { id: true } })
assert.ok(chapter, 'the database needs at least one chapter to hang the fixture member on')
const chapterId = chapter.id
const withMember = (fn: (tx: Tx, userId: string) => Promise<void>) =>
  rolledBack(async (tx) => fn(tx, await makeMember(tx, chapterId)))

let passed = 0
const test = async (name: string, fn: () => Promise<void>) => {
  await fn()
  passed++
  console.log('  ✓', name)
}

const before = await counts()
try {
  await test('upgrading spends the level price once, in order, and the level is then owned', async () => {
    await withMember(async (tx, userId) => {
      const start = await getEntitlements(userId, tx)
      assert.equal(start.credits.earned, FIXTURE_MEETINGS)
      await refused(spendCredits(tx, userId, 'stage:console'), /Launch first/)
      const a = await spendCredits(tx, userId, 'stage:launch')
      assert.equal(a.cost, stagePrice('launch', start.owned))
      assert.ok(a.owned.includes('stage:launch'))
      const b = await spendCredits(tx, userId, 'stage:console')
      assert.equal(b.credits.balance, start.credits.balance - a.cost - b.cost)
      const row = await tx.vesselUnlock.findUnique({ where: { userId_itemId: { userId, itemId: 'stage:console' } } })
      assert.equal(row?.sourceRef, String(b.cost))
      await refused(spendCredits(tx, userId, 'stage:launch'), /already yours/)
    })
  })

  await test('accessories unlock by level but are bought separately; structural parts are never sold alone', async () => {
    await withMember(async (tx, userId) => {
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
    await withMember(async (tx, userId) => {
      const e = await getEntitlements(userId, tx)
      await tx.vesselUnlock.create({
        data: { userId, itemId: 'test:drain', source: 'credits', sourceRef: String(e.credits.balance) }
      })
      await refused(spendCredits(tx, userId, 'stage:launch'), /more credits/)
    })
  })

  // A fixture exists only inside its own transaction, so a second connection can't see the member: what this checks is
  // that spendCredits takes the credits lock before anything else, so a second purchase for the same member waits for
  // the first transaction to end, rather than running alongside it.
  await test('two purchases at once are serialised by the credits lock', async () => {
    const order: string[] = []
    let memberId = ''
    const a = withMember(async (tx, userId) => {
      memberId = userId
      await spendCredits(tx, userId, 'deck:cleats')
      order.push('A holds')
      await new Promise((r) => setTimeout(r, 1200))
      order.push('A ends')
    })
    while (!memberId) await new Promise((r) => setTimeout(r, 50))
    await new Promise((r) => setTimeout(r, 300))
    const b = rolledBack(async (tx) => {
      await spendCredits(tx, memberId, 'deck:cleats').catch((e) => assert.ok(e instanceof Refused, String(e)))
      order.push('B ran')
    })
    await Promise.all([a, b])
    assert.deepEqual(order, ['A holds', 'A ends', 'B ran'])
  })

  await test('earlier purchases are kept, still owned, and count toward the levels that include them (read only)', async () => {
    const rows = await prisma.vesselUnlock.findMany({ select: { userId: true, itemId: true, sourceRef: true } })
    for (const uid of new Set(rows.map((r) => r.userId))) {
      const e = await getEntitlements(uid)
      const mine = rows.filter((r) => r.userId === uid)
      for (const r of mine)
        for (const id of isItemId(r.itemId) ? [r.itemId] : (SUCCESSORS[r.itemId] ?? []))
          assert.ok(e.owned.includes(id as never), `${r.itemId} → ${id}`)
      assert.equal(
        e.credits.spent,
        mine.reduce((n, r) => n + (Number(r.sourceRef) || 0), 0)
      )
    }
    console.log(`    ${rows.length} existing purchases checked`)
  })
} finally {
  // runs whether the tests passed or failed
  const after = await counts()
  console.log(`  rows before ${JSON.stringify(before)}\n  rows after  ${JSON.stringify(after)}`)
  await prisma.$disconnect()
  assert.deepEqual(after, before, 'row counts changed: something was not rolled back')
}

console.log(`db: ${passed} passed; row counts unchanged`)
