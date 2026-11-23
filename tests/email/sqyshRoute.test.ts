// The real /api/cron/sqysh route, run against an in-memory database and a fake mail provider: nothing here can reach a
// database or send an email. Already-reviewed members, under every address, through the dry run, a scheduled run, a
// manual run and a repeat delivery.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createJiti } from 'jiti'
import { NextRequest } from 'next/server'

const root = process.cwd()
const jiti = createJiti(pathToFileURL(join(root, 'tests/email/sqyshRoute.test.ts')).href, {
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
const sqysh = (await jiti.import(join(root, 'app/api/cron/sqysh/route.ts'))) as { GET: (r: NextRequest) => Promise<Response>; POST: (r: NextRequest) => Promise<Response> }

let passed = 0
const test = async (name: string, fn: () => Promise<void>) => {
  await fn()
  passed++
  console.log('  ✓', name)
}

const SECRET = 'test-cron-secret'
const u = (id: string, name: string, email: string, alts: string[] = []) => ({ id, name, email, membershipStatus: 'ACTIVE', alternateEmails: alts.map((email) => ({ email })) })

// seeded members carry the real members' names, on the seeded domain
const seededNames = ['Brendan Ward', 'Eileen Jonah', 'Martin Connolly', 'Page Driscoll', 'Kerry Casey', 'Alex Argeros', 'Angela Turpin', 'Jackson Rogers', 'Christopher Leone', 'Dennis Ford Eagan', 'Anna Roy', 'Jake VanMeter', 'Brian Theirrien', 'Cesar Velezliriano']
const seeded = seededNames.map((n, i) => u(`s${i}`, n, `${n.toLowerCase().replace(/[^a-z]+/g, '.')}@seed.coretest.local`))
const reviewedMembers = [
  u('kerry', 'Kerry Casey', 'kcasey@ccm.com', ['kerry.personal@gmail.com']),
  u('angela', 'Angela Turpin', 'angela.turpin@gmail.com', ['aturpin@zellikinsurance.com']), // listed address is the alternate
  u('eileen', 'Eileen Jonah', ' EJonah@C21NE.com ', ['eileen@jonahgroupre.com']),
  u('brian', 'Brian Theirrien', 'brian.personal@gmail.com', ['BTheirrien@bgcl.org']) // listed address is the alternate
]
const others = [
  u('greg', 'Greg Row', 'rowgregory@gmail.com'),
  u('pat', 'Pat Member', 'pat@somefirm.com', ['pat.home@gmail.com']),
  u('kerry2', 'Kerry Casey', 'kerry.casey@othercompany.com'), // same name, different person
  u('brian2', 'Brian Theirrien', 'btheirrien@bgcl.com') // same name, a different person's address
]
const roster = [...seeded, ...reviewedMembers, ...others]

const KEYS = ['CRON_SECRET', 'VERCEL_ENV', 'EMAIL_DRY_RUN', 'EMAIL_DELIVERY', 'EMAIL_SANDBOX_ALLOWLIST', 'NODE_ENV']
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]))
const setEnv = (vars: Record<string, string | undefined>) => {
  for (const k of KEYS) delete (process.env as any)[k]
  Object.assign(process.env, vars)
}
const fresh = (users = roster) => {
  ;(globalThis as any).__emailTest = { users, logs: [], seq: 0, sent: [], userQueries: 0, transactions: 0, queue: [] }
  return (globalThis as any).__emailTest
}
const req = (query = '', method = 'GET', auth: string | null = `Bearer ${SECRET}`) =>
  new NextRequest(`http://localhost/api/cron/sqysh${query}`, { method, headers: auth ? { authorization: auth } : {} })
const claims = (st: any) => st.logs.filter((l: any) => String(l.message).startsWith('campaign-run:'))
const REVIEWED_ADDRESSES = ['kcasey@ccm.com', 'kerry.personal@gmail.com', 'angela.turpin@gmail.com', 'aturpin@zellikinsurance.com', 'ejonah@c21ne.com', 'eileen@jonahgroupre.com', 'brian.personal@gmail.com', 'btheirrien@bgcl.org']
const EXPECTED = ['btheirrien@bgcl.com', 'kerry.casey@othercompany.com', 'pat@somefirm.com', 'rowgregory@gmail.com']

try {
  await test('dry run names the four reviewed members and why, sends nothing, records nothing', async () => {
    const st = fresh()
    setEnv({ VERCEL_ENV: 'production', CRON_SECRET: SECRET })
    const body: any = await (await sqysh.GET(req('?dryRun=1'))).json()
    assert.equal(body.dryRun, true)
    assert.deepEqual(body.suppressed.map((s: any) => s.name), ['Kerry Casey', 'Angela Turpin', 'Eileen Jonah', 'Brian Theirrien'])
    assert.ok(body.suppressed.every((s: any) => /^already reviewed/.test(s.because)))
    assert.match(body.suppressed[1].because, /alternate-of-reviewed-member/)
    assert.match(body.suppressed[3].because, /alternate-of-reviewed-member/)
    assert.deepEqual(body.wouldSend.map((p: any) => p.email).sort(), EXPECTED)
    assert.equal(body.excluded.length, 14)
    assert.ok(body.excluded.every((e: any) => e.because === 'seeded-test-address'))
    assert.deepEqual(body.counts, { wouldSend: 4, heldBack: 0, excluded: 14, suppressed: 4 })
    assert.equal(body.totalRecipientsFound, roster.length)
    assert.deepEqual(body.alreadyReviewedUnresolved, [], 'every reviewed member has an address on record')
    assert.deepEqual(body.alreadyReviewedNotInRoster, [])
    assert.equal(st.sent.length, 0)
    assert.equal(st.logs.length, 0)
  })

  await test('a scheduled run sends to none of the four reviewed members, under any of their addresses, and to everyone else once', async () => {
    const st = fresh()
    setEnv({ VERCEL_ENV: 'production', CRON_SECRET: SECRET })
    const res = await sqysh.GET(req())
    assert.equal(res.status, 200)
    const body: any = await res.json()
    const to = st.sent.map((s: any) => s.payload.to).sort()
    assert.deepEqual(to, EXPECTED)
    for (const a of REVIEWED_ADDRESSES) assert.ok(!to.includes(a), a)
    assert.ok(to.every((a: string) => !a.endsWith('.local')))
    assert.equal(body.skipped, 4)
    assert.equal(body.successful, 4)
    assert.ok(st.sent.every((s: any) => s.payload.subject === 'Help Sqysh Grow - Share Your Experience'))
    assert.ok(st.sent.every((s: any) => s.options.idempotencyKey.startsWith('sqysh/')))
  })

  await test('a manual run (POST, or ?force=1) applies the same exclusions', async () => {
    const st = fresh()
    setEnv({ VERCEL_ENV: 'production', CRON_SECRET: SECRET })
    await sqysh.POST(req('', 'POST'))
    await sqysh.GET(req('?force=1'))
    assert.equal(st.sent.length, 8)
    const to = st.sent.map((s: any) => s.payload.to)
    for (const a of REVIEWED_ADDRESSES) assert.ok(!to.includes(a), a)
  })

  await test('the cron delivered more than once at the same time still mails each member once', async () => {
    const st = fresh()
    setEnv({ VERCEL_ENV: 'production', CRON_SECRET: SECRET })
    await Promise.all([sqysh.GET(req()), sqysh.GET(req()), sqysh.POST(req('', 'POST'))])
    assert.equal(st.sent.length, 4)
    assert.equal(claims(st).length, 1)
  })

  await test('a member holding a reviewed address only as an alternate never gets the reminder through their primary', async () => {
    const st = fresh([u('angela', 'Angela Turpin', 'angela.turpin@gmail.com', ['aturpin@zellikinsurance.com']), u('greg', 'Greg Row', 'rowgregory@gmail.com')])
    setEnv({ VERCEL_ENV: 'production', CRON_SECRET: SECRET })
    await sqysh.GET(req())
    assert.deepEqual(st.sent.map((s: any) => s.payload.to), ['rowgregory@gmail.com'])
  })

  await test('unauthorised requests are refused before anything is read', async () => {
    const st = fresh()
    setEnv({ VERCEL_ENV: 'production', CRON_SECRET: SECRET })
    for (const auth of [null, 'Bearer undefined', 'Bearer wrong']) assert.equal((await sqysh.GET(req('', 'GET', auth))).status, 401)
    assert.equal(st.userQueries, 0)
    assert.equal(st.sent.length, 0)
  })

  await test('outside production the run sends nothing at all, reviewed or not', async () => {
    const st = fresh()
    setEnv({ NODE_ENV: 'production', CRON_SECRET: SECRET })
    const body: any = await (await sqysh.GET(req())).json()
    assert.equal(body.skipped, true)
    assert.equal(st.sent.length, 0)
    assert.equal(claims(st).length, 0)
  })
} finally {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete (process.env as any)[k]
    else process.env[k] = saved[k]
  }
}
console.log(`\n${passed} sqysh route tests passed`)
