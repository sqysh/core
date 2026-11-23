// A bulk campaign end to end, without a database or a mail provider: who it would go to, the dry run, one run per day
// (including two deliveries racing), and the cron authorization. Nothing here can send a real email.
import assert from 'node:assert/strict'
import {
  claimKey,
  ClaimStore,
  claimRun,
  describePlan,
  idempotencyKey,
  liveEnvironment,
  parseCampaignFlags,
  planCampaign,
  runPeriod
} from '@/lib/email/campaign'
import { guardResend } from '@/lib/email/delivery'
import { requireCron } from '@/lib/email/requireCron'

let passed = 0
const test = async (name: string, fn: () => void | Promise<void>) => {
  await fn()
  passed++
  console.log('  ✓', name)
}

const PROD = { VERCEL_ENV: 'production' }
const slug = (n: string) => n.toLowerCase().replace(/[^a-z]+/g, '.')
const seededNames = ['Brendan Ward', 'Eileen Jonah', 'Martin Connolly', 'Page Driscoll', 'Kerry Casey', 'Alex Argeros', 'Angela Turpin', 'Jackson Rogers', 'Christopher Leone', 'Dennis Ford Eagan', 'Anna Roy', 'Jake VanMeter', 'Brian Theirrien', 'Cesar Velezliriano']
const seeded = seededNames.map((name, i) => ({ id: `seed${i}`, name, email: `${slug(name)}@seed.coretest.local` }))
const real = [
  { id: 'real1', name: 'Greg Row', email: 'rowgregory@gmail.com' },
  { id: 'real2', name: 'Greg Sqysh', email: 'greg@sqysh.com' },
  { id: 'real3', name: 'Kerry Casey', email: 'kcasey@ccm.com' }
]
// what `prisma.user.findMany({ where: { membershipStatus: 'ACTIVE' } })` returns when seeded members are in the table
const roster = [...seeded, ...real]

/** The claim store the routes use, in memory: one clock, ordered by insertion, with a little latency to make runs interleave */
function memoryStore(latency = 0): ClaimStore & { rows: { id: string; key: string }[] } {
  const rows: { id: string; key: string }[] = []
  let seq = 0
  const wait = () => (latency ? new Promise((r) => setTimeout(r, Math.random() * latency)) : Promise.resolve())
  return {
    rows,
    async insert(key) {
      await wait()
      const id = `c${String(++seq).padStart(6, '0')}`
      rows.push({ id, key })
      return id
    },
    async earliest(key) {
      await wait()
      return rows.find((r) => r.key === key)?.id ?? null
    },
    async remove(id) {
      await wait()
      const i = rows.findIndex((r) => r.id === id)
      if (i >= 0) rows.splice(i, 1)
    }
  }
}

async function main() {
  // ── who gets a campaign ───────────────────────────────────────────────────────────────────────────────────────────
  await test('production: a campaign over the roster goes to the 3 real members, and the 14 seeded ones are excluded', () => {
    const plan = planCampaign('core', roster, PROD)
    assert.equal(plan.mode, 'live')
    assert.equal(plan.total, 17)
    assert.deepEqual(plan.send.map((r) => r.id), ['real1', 'real2', 'real3'])
    assert.equal(plan.excluded.length, 14)
    assert.ok(plan.excluded.every((e) => e.reason === 'seeded-test-address'))
    assert.equal(plan.held.length, 0)
  })

  await test('no real member is lost, whatever order the roster comes in', () => {
    for (const list of [roster, [...roster].reverse(), [...real, ...seeded], [...seeded.slice(0, 5), ...real, ...seeded.slice(5)]]) {
      const sent = planCampaign('core', list, PROD).send.map((r) => r.id).sort()
      assert.deepEqual(sent, ['real1', 'real2', 'real3'])
    }
  })

  await test('a laptop or preview is a sandbox: nobody is sent to, and the plan says why', () => {
    const plan = planCampaign('core', roster, {})
    assert.equal(plan.mode, 'sandbox')
    assert.deepEqual(plan.send, [])
    assert.deepEqual(plan.held.map((h) => [h.recipient.id, h.reason]), [['real1', 'sandbox'], ['real2', 'sandbox'], ['real3', 'sandbox']])
    assert.equal(plan.excluded.length, 14)
  })

  await test('a sandbox allowlist sends only to the named addresses', () => {
    const plan = planCampaign('core', roster, { EMAIL_SANDBOX_ALLOWLIST: 'rowgregory@gmail.com' })
    assert.deepEqual(plan.send.map((r) => r.id), ['real1'])
    assert.deepEqual(plan.held.map((h) => h.recipient.id), ['real2', 'real3'])
  })

  await test('a repeated member is mailed once', () => {
    const plan = planCampaign('core', [...real, { id: 'real1-again', name: 'Greg Row', email: 'RowGregory@gmail.com' }], PROD)
    assert.deepEqual(plan.send.map((r) => r.id), ['real1', 'real2', 'real3'])
    assert.deepEqual(plan.excluded.map((e) => e.reason), ['duplicate'])
  })

  await test('dry run: the plan is what production would send, even from a sandbox, and lists who and why not', () => {
    const plan = planCampaign('presenter-queue', roster, liveEnvironment({}))
    assert.equal(plan.mode, 'live')
    const body = describePlan(plan)
    assert.equal(body.campaign, 'presenter-queue')
    assert.deepEqual(body.wouldSend.map((p) => p.email), real.map((r) => r.email))
    assert.equal(body.excluded.length, 14)
    assert.ok(body.excluded.every((e) => e.because === 'seeded-test-address'))
    assert.deepEqual(body.counts, { wouldSend: 3, heldBack: 0, excluded: 14 })
    // and EMAIL_DRY_RUN in the environment cannot make the dry-run report empty
    assert.equal(planCampaign('x', roster, liveEnvironment({ EMAIL_DRY_RUN: '1' })).send.length, 3)
  })

  await test('dry-run and force flags are read from the request URL', () => {
    const f = (u: string) => parseCampaignFlags(u)
    assert.deepEqual(f('https://x.com/api/cron/core'), { dryRun: false, force: false })
    for (const q of ['?dryRun=1', '?dryRun', '?dryRun=true', '?dry-run=1', '?dryrun=yes', '?dryRun=']) assert.equal(f(`https://x.com/a${q}`).dryRun, true, q)
    for (const q of ['?dryRun=0', '?dryRun=false', '?dryrun=no', '?other=1']) assert.equal(f(`https://x.com/a${q}`).dryRun, false, q)
    assert.deepEqual(f('https://x.com/a?force=1'), { dryRun: false, force: true })
    assert.deepEqual(f('https://x.com/a?dryRun=1&force=1'), { dryRun: true, force: true })
    assert.deepEqual(f('not a url at all'), { dryRun: false, force: false })
  })

  // ── one run per day ───────────────────────────────────────────────────────────────────────────────────────────────
  await test('the run period is the chapter\'s calendar day (New York), across midnight UTC and daylight saving', () => {
    assert.equal(runPeriod(new Date('2026-11-23T15:00:00Z')), '2026-11-23')
    assert.equal(runPeriod(new Date('2026-11-24T03:30:00Z')), '2026-11-23') // 22:30 EST the day before
    assert.equal(runPeriod(new Date('2026-11-24T05:00:00Z')), '2026-11-24')
    assert.equal(runPeriod(new Date('2026-07-15T03:30:00Z')), '2026-07-14') // EDT
  })

  await test('duplicate execution: the second delivery of a cron on the same day does not run', async () => {
    const store = memoryStore()
    const key = claimKey('core', '2026-11-23')
    const first = await claimRun(store, key)
    const second = await claimRun(store, key)
    const third = await claimRun(store, key)
    assert.equal(first.claimed, true)
    assert.equal(second.claimed, false)
    assert.equal(third.claimed, false)
    assert.equal(store.rows.length, 1, 'losers leave nothing behind')
  })

  await test('another day or another campaign is a separate run', async () => {
    const store = memoryStore()
    assert.equal((await claimRun(store, claimKey('core', '2026-11-23'))).claimed, true)
    assert.equal((await claimRun(store, claimKey('core', '2026-11-30'))).claimed, true)
    assert.equal((await claimRun(store, claimKey('member-directory', '2026-11-23'))).claimed, true)
    assert.equal((await claimRun(store, claimKey('core', '2026-11-23'))).claimed, false)
  })

  await test('a run that failed gives its claim back, so a retry can run', async () => {
    const store = memoryStore()
    const key = claimKey('core', '2026-11-23')
    const a = await claimRun(store, key)
    assert.equal(a.claimed, true)
    if (a.claimed) await a.release()
    assert.equal((await claimRun(store, key)).claimed, true)
  })

  await test('two deliveries racing: exactly one wins, however they interleave', async () => {
    for (let round = 0; round < 40; round++) {
      const store = memoryStore(6)
      const key = claimKey('core', `2026-11-${round}`)
      const results = await Promise.all([claimRun(store, key), claimRun(store, key)])
      assert.equal(results.filter((r) => r.claimed).length, 1, `round ${round}`)
      assert.equal(store.rows.length, 1)
    }
  })

  await test('fifty deliveries at once: still exactly one', async () => {
    const store = memoryStore(10)
    const key = claimKey('presenter-queue', '2026-11-25')
    const results = await Promise.all(Array.from({ length: 50 }, () => claimRun(store, key)))
    assert.equal(results.filter((r) => r.claimed).length, 1)
    assert.equal(store.rows.length, 1)
  })

  await test('idempotency keys are stable per run and recipient, and differ between runs', () => {
    assert.equal(idempotencyKey('core', '2026-11-23', ' Greg@Sqysh.com '), 'core/2026-11-23/greg@sqysh.com')
    assert.equal(idempotencyKey('core', '2026-11-23', 'greg@sqysh.com'), idempotencyKey('core', '2026-11-23', 'GREG@sqysh.com'))
    assert.notEqual(idempotencyKey('core', '2026-11-23', 'a@b.com'), idempotencyKey('core', '2026-11-30', 'a@b.com'))
    assert.notEqual(idempotencyKey('core', '2026-11-23', 'a@b.com'), idempotencyKey('member-directory', '2026-11-23', 'a@b.com'))
  })

  await test('end to end: the cron fires three times, the roster has 14 seeded members, every real member gets it once', async () => {
    const store = memoryStore(3)
    const delivered = new Map<string, number>()
    const seenKeys = new Set<string>()
    const provider = {
      emails: {
        // a provider that, like Resend, answers a repeated idempotency key without sending again
        send: async (payload: any, options?: any) => {
          if (options?.idempotencyKey && seenKeys.has(options.idempotencyKey)) return { data: { id: 'replay' }, error: null }
          if (options?.idempotencyKey) seenKeys.add(options.idempotencyKey)
          delivered.set(payload.to, (delivered.get(payload.to) ?? 0) + 1)
          return { data: { id: 'ok' }, error: null }
        }
      },
      batch: { send: async () => ({ data: null, error: null }) }
    }
    const resend = guardResend(provider, { env: PROD, onEvent: () => {} })
    // what a route does, in order
    const cron = async () => {
      const plan = planCampaign('core', roster, PROD)
      const claim = await claimRun(store, claimKey('core', '2026-11-23'))
      if (!claim.claimed) return 'skipped'
      for (const r of plan.send)
        await resend.emails.send({ from: 'f', to: r.email, subject: 'Log Your Activities', html: 'h' }, { idempotencyKey: idempotencyKey('core', '2026-11-23', r.email) })
      return 'ran'
    }
    const outcomes = await Promise.all([cron(), cron(), cron()])
    assert.deepEqual(outcomes.sort(), ['ran', 'skipped', 'skipped'])
    assert.deepEqual([...delivered.entries()].sort(), real.map((r) => [r.email, 1] as [string, number]).sort())
    assert.ok([...delivered.keys()].every((a) => !a.endsWith('.local')), 'nothing reached a seeded address')
  })

  await test('even if the claim were lost (a failed run released it), recipients already sent are not sent again', async () => {
    const seenKeys = new Set<string>()
    let sends = 0
    const provider = {
      emails: {
        send: async (_p: any, o?: any) => {
          if (o?.idempotencyKey && seenKeys.has(o.idempotencyKey)) return { data: { id: 'replay' }, error: null }
          seenKeys.add(o.idempotencyKey)
          sends++
          return { data: { id: 'ok' }, error: null }
        }
      },
      batch: { send: async () => ({ data: null, error: null }) }
    }
    const resend = guardResend(provider, { env: PROD, onEvent: () => {} })
    for (let attempt = 0; attempt < 2; attempt++)
      for (const r of real) await resend.emails.send({ from: 'f', to: r.email, subject: 's', html: 'h' }, { idempotencyKey: idempotencyKey('core', '2026-11-23', r.email) })
    assert.equal(sends, 3)
  })

  // ── who may trigger it ────────────────────────────────────────────────────────────────────────────────────────────
  await test('cron authorization fails closed: no configured secret means nobody is let in, not even "Bearer undefined"', () => {
    const was = process.env.CRON_SECRET
    try {
      const req = (auth?: string) => ({ headers: new Headers(auth ? { authorization: auth } : {}) })
      delete process.env.CRON_SECRET
      for (const a of [undefined, 'Bearer undefined', 'Bearer ', 'Bearer', '']) assert.equal(requireCron(req(a))?.status, 401, String(a))
      process.env.CRON_SECRET = ''
      assert.equal(requireCron(req('Bearer '))?.status, 401)
      process.env.CRON_SECRET = '   '
      assert.equal(requireCron(req('Bearer    '))?.status, 401)
    } finally {
      if (was === undefined) delete process.env.CRON_SECRET
      else process.env.CRON_SECRET = was
    }
  })

  await test('cron authorization with a secret: only the exact bearer token passes', () => {
    const was = process.env.CRON_SECRET
    try {
      process.env.CRON_SECRET = 's3cret-value'
      const req = (auth?: string) => ({ headers: new Headers(auth ? { authorization: auth } : {}) })
      assert.equal(requireCron(req('Bearer s3cret-value')), null)
      for (const a of [undefined, 'Bearer wrong', 'bearer s3cret-value', 'Bearer s3cret-valu', 's3cret-value', 'Bearer undefined'])
        assert.equal(requireCron(req(a))?.status, 401, String(a))
    } finally {
      if (was === undefined) delete process.env.CRON_SECRET
      else process.env.CRON_SECRET = was
    }
  })

  console.log(`\n${passed} campaign tests passed`)
}

await main()
