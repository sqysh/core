// The real cron routes, run against an in-memory database and a fake mail provider (nothing here can reach a database
// or send an email): authorization, the dry run, seeded members, a duplicate delivery of the same cron, and a forced re-run.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createJiti } from 'jiti'
import { NextRequest } from 'next/server'

const root = process.cwd()
const jiti = createJiti(pathToFileURL(join(root, 'tests/email/cronRoutes.test.ts')).href, {
  alias: {
    '@/prisma/client': join(root, 'tests/email/_stubs/prisma.ts'),
    '@/lib/resend/resend': join(root, 'tests/email/_stubs/resend.ts'),
    '@': root,
    'server-only': join(root, 'tests/_support/empty.cjs')
  },
  jsx: true,
  interopDefault: true,
  moduleCache: false
})
const load = (route: string) => jiti.import(join(root, `app/api/cron/${route}/route.ts`)) as Promise<{ GET: (r: NextRequest) => Promise<Response>; POST?: (r: NextRequest) => Promise<Response> }>

let passed = 0
const test = async (name: string, fn: () => Promise<void>) => {
  await fn()
  passed++
  console.log('  ✓', name)
}

const SECRET = 'test-cron-secret'
const slug = (n: string) => n.toLowerCase().replace(/[^a-z]+/g, '.')
const seededNames = ['Brendan Ward', 'Eileen Jonah', 'Martin Connolly', 'Page Driscoll', 'Kerry Casey', 'Alex Argeros', 'Angela Turpin', 'Jackson Rogers', 'Christopher Leone', 'Dennis Ford Eagan', 'Anna Roy', 'Jake VanMeter', 'Brian Theirrien', 'Cesar Velezliriano']
const seeded = seededNames.map((name, i) => ({ id: `s${i}`, name, email: `${slug(name)}@seed.coretest.local`, membershipStatus: 'ACTIVE' }))
const real = [
  { id: 'r1', name: 'Greg Row', email: 'rowgregory@gmail.com', membershipStatus: 'ACTIVE' },
  { id: 'r2', name: 'Greg Sqysh', email: 'greg@sqysh.com', membershipStatus: 'ACTIVE' },
  { id: 'r3', name: 'Real Member', email: 'member@example-firm.com', membershipStatus: 'ACTIVE' }
]

const EMAIL_ROUTES = ['core', 'member-directory', 'presenter-queue', 'sqysh']

function freshState() {
  ;(globalThis as any).__emailTest = { users: [...seeded, ...real], logs: [], seq: 0, sent: [], userQueries: 0, transactions: 0, queue: [] }
  return (globalThis as any).__emailTest
}
const KEYS = ['CRON_SECRET', 'VERCEL_ENV', 'EMAIL_DRY_RUN', 'EMAIL_DELIVERY', 'EMAIL_SANDBOX_ALLOWLIST', 'NODE_ENV']
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]))
const env = (vars: Record<string, string | undefined>) => {
  for (const k of KEYS) delete (process.env as any)[k]
  Object.assign(process.env, vars)
}
const req = (route: string, query = '', auth: string | null = `Bearer ${SECRET}`, method = 'GET') =>
  new NextRequest(`http://localhost/api/cron/${route}${query}`, { method, headers: auth ? { authorization: auth } : {} })
const claims = (st: any) => st.logs.filter((l: any) => String(l.message).startsWith('campaign-run:'))

async function main() {
  try {
    for (const route of EMAIL_ROUTES) {
      const mod = await load(route)

      await test(`${route}: no secret configured, or the wrong one: 401, no database read, nothing sent`, async () => {
        const st = freshState()
        env({ VERCEL_ENV: 'production' })
        for (const auth of [null, 'Bearer undefined', 'Bearer wrong']) {
          assert.equal((await mod.GET(req(route, '', auth))).status, 401, `unset secret, ${auth}`)
        }
        env({ VERCEL_ENV: 'production', CRON_SECRET: SECRET })
        for (const auth of [null, 'Bearer undefined', 'Bearer wrong', SECRET]) assert.equal((await mod.GET(req(route, '', auth))).status, 401, String(auth))
        assert.equal(st.userQueries, 0)
        assert.equal(st.sent.length, 0)
        assert.equal(st.logs.length, 0)
      })

      await test(`${route}: dry run lists the 3 real members and the 14 excluded seeded ones, and sends and records nothing`, async () => {
        const st = freshState()
        env({ VERCEL_ENV: 'production', CRON_SECRET: SECRET })
        const res = await mod.GET(req(route, '?dryRun=1'))
        assert.equal(res.status, 200)
        const body: any = await res.json()
        assert.equal(body.dryRun, true)
        assert.deepEqual(body.wouldSend.map((p: any) => p.email).sort(), real.map((r) => r.email).sort())
        assert.equal(body.excluded.length, 14)
        assert.ok(body.excluded.every((e: any) => e.because === 'seeded-test-address'))
        assert.equal(body.counts.wouldSend, 3)
        assert.equal(st.sent.length, 0, 'a dry run sends nothing')
        assert.equal(st.logs.length, 0, 'a dry run records nothing, so it does not use up the day')
      })

      await test(`${route}: a dry run from a laptop still shows who production would send to`, async () => {
        const st = freshState()
        env({ CRON_SECRET: SECRET })
        const body: any = await (await mod.GET(req(route, '?dryRun=1'))).json()
        assert.equal(body.thisEnvironmentWouldRun, 'sandbox')
        assert.equal(body.counts.wouldSend, 3)
        assert.equal(st.sent.length, 0)
      })

      await test(`${route}: outside production (a laptop, even a production build) nothing is sent and nothing is claimed`, async () => {
        const st = freshState()
        env({ NODE_ENV: 'production', CRON_SECRET: SECRET })
        const body: any = await (await mod.GET(req(route))).json()
        assert.equal(body.skipped, true)
        assert.match(body.reason, /sandbox/)
        assert.equal(st.sent.length, 0)
        assert.equal(claims(st).length, 0)
      })

      await test(`${route}: production sends to the 3 real members only, once each, under idempotency keys`, async () => {
        const st = freshState()
        env({ VERCEL_ENV: 'production', CRON_SECRET: SECRET })
        const res = await mod.GET(req(route))
        assert.equal(res.status, 200)
        assert.deepEqual(st.sent.map((s: any) => s.payload.to).sort(), real.map((r) => r.email).sort())
        assert.ok(st.sent.every((s: any) => typeof s.options?.idempotencyKey === 'string' && s.options.idempotencyKey.startsWith(`${route}/`)))
        assert.ok(st.sent.every((s: any) => !String(s.payload.to).endsWith('.local')), 'nothing went to a seeded address')
        assert.equal(claims(st).length, 1)
      })

      await test(`${route}: the cron delivered twice, or three times at once, still emails each member once`, async () => {
        const st = freshState()
        env({ VERCEL_ENV: 'production', CRON_SECRET: SECRET })
        const results = await Promise.all([mod.GET(req(route)), mod.GET(req(route)), mod.POST ? mod.POST(req(route, '', `Bearer ${SECRET}`, 'POST')) : mod.GET(req(route))])
        assert.ok(results.every((r) => r.status === 200))
        assert.equal(st.sent.length, 3, 'one email per real member in total')
        assert.equal(new Set(st.sent.map((s: any) => s.payload.to)).size, 3)
        const again: any = await (await mod.GET(req(route))).json()
        assert.equal(again.skipped, true)
        assert.equal(st.sent.length, 3)
        assert.equal(claims(st).length, 1, 'one claim stands for the day')
      })

      await test(`${route}: ?force=1 re-runs on purpose, under new idempotency keys`, async () => {
        const st = freshState()
        env({ VERCEL_ENV: 'production', CRON_SECRET: SECRET })
        await mod.GET(req(route))
        await mod.GET(req(route, '?force=1'))
        assert.equal(st.sent.length, 6)
        assert.equal(new Set(st.sent.map((s: any) => s.options.idempotencyKey)).size, 6)
      })

      await test(`${route}: a sandbox allowlist lets a developer receive their own copy, and only that`, async () => {
        const st = freshState()
        env({ CRON_SECRET: SECRET, EMAIL_SANDBOX_ALLOWLIST: 'rowgregory@gmail.com' })
        await mod.GET(req(route))
        assert.deepEqual(st.sent.map((s: any) => s.payload.to), ['rowgregory@gmail.com'])
      })
    }

    // ── advance-queue: sends nothing, but must not run twice in a day ────────────────────────────────────────────
    const advance = await load('advance-queue')
    const queue = () => ['a', 'b', 'c'].map((n, i) => ({ id: `q${i}`, position: i, user: { name: n } }))

    await test('advance-queue: unauthorized is 401; a dry run only reports; a real run advances once, however often it is delivered', async () => {
      const st = freshState()
      st.queue = queue()
      env({ CRON_SECRET: SECRET })
      assert.equal((await advance.GET(req('advance-queue', '', null))).status, 401)
      const dry: any = await (await advance.GET(req('advance-queue', '?dryRun=1'))).json()
      assert.equal(dry.dryRun, true)
      assert.equal(dry.wouldMoveToEnd, 'a')
      assert.equal(st.transactions, 0)
      assert.equal(claims(st).length, 0)
      await Promise.all([advance.GET(req('advance-queue')), advance.GET(req('advance-queue')), advance.GET(req('advance-queue'))])
      assert.equal(st.transactions, 1, 'the queue moved exactly once')
      const later: any = await (await advance.GET(req('advance-queue'))).json()
      assert.equal(later.skipped, true)
      assert.equal(st.transactions, 1)
      await advance.GET(req('advance-queue', '?force=1'))
      assert.equal(st.transactions, 2, 'force advances again on purpose')
    })
  } finally {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete (process.env as any)[k]
      else process.env[k] = saved[k]
    }
  }
  console.log(`\n${passed} cron route tests passed`)
}

await main()
