// Whether this process may deliver email, and the guarded client every workflow sends through. A fake provider stands
// in for Resend: nothing here can send a real email.
import assert from 'node:assert/strict'
import { allowedInSandbox, deliveryMode, GuardEvent, guardResend, planDelivery, sandboxAllowlist } from '@/lib/email/delivery'

let passed = 0
const test = async (name: string, fn: () => void | Promise<void>) => {
  await fn()
  passed++
  console.log('  ✓', name)
}

const PROD = { VERCEL_ENV: 'production' }
const SEED = 'brendan.ward@seed.coretest.local'
const REAL = 'rowgregory@gmail.com'
const REAL2 = 'greg@sqysh.com'

/** A stand-in for Resend that records what reaches it */
function fakeProvider() {
  const calls: { kind: 'send' | 'batch'; payload: any; options?: any }[] = []
  return {
    calls,
    emails: { send: async (payload: any, options?: any) => (calls.push({ kind: 'send', payload, options }), { data: { id: 'id-' + calls.length }, error: null }) },
    batch: { send: async (payload: any[], options?: any) => (calls.push({ kind: 'batch', payload, options }), { data: { data: payload.map((_, i) => ({ id: 'b' + i })) }, error: null }) }
  }
}
const guarded = (env: Record<string, string | undefined>, options: { sandbox?: boolean } = {}) => {
  const provider = fakeProvider()
  const events: GuardEvent[] = []
  return { provider, events, resend: guardResend(provider, { env, onEvent: (e) => events.push(e), ...options }) }
}

async function main() {
  // ── mode ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  await test('a production deployment is live; every other environment is a sandbox', () => {
    assert.equal(deliveryMode(PROD).mode, 'live')
    assert.equal(deliveryMode({ VERCEL_ENV: 'preview' }).mode, 'sandbox')
    assert.equal(deliveryMode({ VERCEL_ENV: 'development' }).mode, 'sandbox')
    assert.equal(deliveryMode({}).mode, 'sandbox')
    assert.equal(deliveryMode({ NODE_ENV: 'development' }).mode, 'sandbox')
  })

  await test('a production BUILD run on a laptop (`next start`, NODE_ENV=production) is still a sandbox', () => {
    // the way seeded members were emailed: a production build, real keys, no Vercel
    assert.equal(deliveryMode({ NODE_ENV: 'production' }).mode, 'sandbox')
  })

  await test('EMAIL_DELIVERY=live opts another host in; EMAIL_DRY_RUN beats everything', () => {
    assert.equal(deliveryMode({ EMAIL_DELIVERY: 'live' }).mode, 'live')
    assert.equal(deliveryMode({ EMAIL_DELIVERY: ' LIVE ' }).mode, 'live')
    assert.equal(deliveryMode({ EMAIL_DELIVERY: 'nonsense' }).mode, 'sandbox')
    for (const v of ['1', 'true', 'YES', 'on']) assert.equal(deliveryMode({ ...PROD, EMAIL_DRY_RUN: v }).mode, 'dry-run', v)
    assert.equal(deliveryMode({ ...PROD, EMAIL_DRY_RUN: '0' }).mode, 'live')
    assert.equal(deliveryMode({ ...PROD, EMAIL_DRY_RUN: '' }).mode, 'live')
  })

  await test('the sandbox allowlist takes addresses and whole domains', () => {
    const list = sandboxAllowlist({ EMAIL_SANDBOX_ALLOWLIST: ' Me@x.com, @sqysh.com ; other@y.org ' })
    assert.deepEqual(list, ['me@x.com', '@sqysh.com', 'other@y.org'])
    assert.equal(allowedInSandbox('ME@x.com', list), true)
    assert.equal(allowedInSandbox('greg@sqysh.com', list), true)
    assert.equal(allowedInSandbox('greg@notsqysh.com', list), false)
    assert.equal(allowedInSandbox('someone@x.com', list), false)
    assert.deepEqual(sandboxAllowlist({}), [])
  })

  await test('planDelivery: live sends the deliverable, sandbox holds everyone, dry-run holds everyone', () => {
    const list = [REAL, SEED, REAL2, REAL.toUpperCase(), 'junk']
    const live = planDelivery(list, PROD)
    assert.deepEqual(live.send, [REAL, REAL2])
    assert.deepEqual(live.excluded.map((e) => e.reason), ['seeded-test-address', 'malformed'])
    const box = planDelivery(list, {})
    assert.deepEqual(box.send, [])
    assert.deepEqual(box.held.map((h) => [h.address, h.reason]), [[REAL, 'sandbox'], [REAL2, 'sandbox']])
    const boxAllowed = planDelivery(list, { EMAIL_SANDBOX_ALLOWLIST: REAL })
    assert.deepEqual(boxAllowed.send, [REAL])
    assert.deepEqual(boxAllowed.held.map((h) => h.address), [REAL2])
    const dry = planDelivery(list, { ...PROD, EMAIL_DRY_RUN: '1' })
    assert.deepEqual(dry.send, [])
    assert.deepEqual(dry.held.map((h) => h.reason), ['dry-run', 'dry-run'])
  })

  // ── the guarded client ────────────────────────────────────────────────────────────────────────────────────────────
  await test('live: a real member is sent to, exactly as asked (payload and options untouched)', async () => {
    const { provider, resend } = guarded(PROD)
    const payload = { from: 'CORE <core@x.com>', to: REAL, subject: 'Hi', html: '<p>hi</p>' }
    const r = await resend.emails.send(payload, { idempotencyKey: 'k1' })
    assert.equal(provider.calls.length, 1)
    assert.deepEqual(provider.calls[0].payload, payload)
    assert.deepEqual(provider.calls[0].options, { idempotencyKey: 'k1' })
    assert.equal((r as any).data.id, 'id-1')
  })

  await test('live: a seeded address is never sent to, and that is not reported as an error', async () => {
    const { provider, events, resend } = guarded(PROD)
    const r: any = await resend.emails.send({ from: 'f', to: SEED, subject: 'Presenter Schedule', html: 'x' })
    assert.equal(provider.calls.length, 0)
    assert.deepEqual(r, { data: null, error: null, skipped: true })
    assert.equal(events.length, 1)
    assert.equal(events[0].kind, 'skipped')
    assert.equal(events[0].blocked[0].reason, 'seeded-test-address')
  })

  await test('live: a list keeps its real recipients and drops the fake ones (to, cc and bcc)', async () => {
    const { provider, resend } = guarded(PROD)
    await resend.emails.send({ from: 'f', to: [SEED, REAL, 'x@b.local', REAL2], cc: [SEED, REAL2], bcc: SEED, subject: 's', html: 'h' })
    assert.equal(provider.calls.length, 1)
    const p = provider.calls[0].payload
    assert.deepEqual(p.to, [REAL, REAL2])
    assert.deepEqual(p.cc, [REAL2])
    assert.equal('bcc' in p, false)
  })

  await test('live: a send whose only recipients are fake is skipped; a real bcc cannot carry it', async () => {
    const { provider, resend } = guarded(PROD)
    await resend.emails.send({ from: 'f', to: [SEED], bcc: REAL, subject: 's', html: 'h' })
    assert.equal(provider.calls.length, 0)
  })

  await test('the caller\'s payload is not modified', async () => {
    const { resend } = guarded(PROD)
    const payload = { from: 'f', to: [SEED, REAL], subject: 's', html: 'h' }
    const before = JSON.stringify(payload)
    await resend.emails.send(payload)
    assert.equal(JSON.stringify(payload), before)
  })

  await test('live batch: each message is filtered, empty ones dropped, and nothing is called when all are', async () => {
    const { provider, resend } = guarded(PROD)
    const r: any = await resend.batch.send([
      { from: 'f', to: [REAL, SEED], subject: 'a', html: 'h' },
      { from: 'f', to: [SEED], subject: 'b', html: 'h' },
      { from: 'f', to: [REAL2], subject: 'c', html: 'h' }
    ])
    assert.equal(provider.calls.length, 1)
    assert.deepEqual(provider.calls[0].payload.map((p: any) => [p.subject, p.to]), [['a', [REAL]], ['c', [REAL2]]])
    assert.equal(r.data.data.length, 2)
    const none: any = await resend.batch.send([{ from: 'f', to: [SEED], subject: 'x', html: 'h' }])
    assert.equal(provider.calls.length, 1)
    assert.deepEqual(none, { data: { data: [] }, error: null, skipped: true })
  })

  await test('sandbox (a laptop, a preview, a test run): nothing is sent, even to a real member', async () => {
    for (const env of [{}, { NODE_ENV: 'production' }, { VERCEL_ENV: 'preview' }]) {
      const { provider, resend } = guarded(env)
      await resend.emails.send({ from: 'f', to: REAL, subject: 's', html: 'h' })
      await resend.batch.send([{ from: 'f', to: [REAL2], subject: 's', html: 'h' }])
      assert.equal(provider.calls.length, 0, JSON.stringify(env))
    }
  })

  await test('sandbox: only allowlisted addresses are sent to', async () => {
    const { provider, resend } = guarded({ EMAIL_SANDBOX_ALLOWLIST: REAL })
    await resend.emails.send({ from: 'f', to: [REAL, REAL2, SEED], subject: 's', html: 'h' })
    assert.deepEqual(provider.calls[0].payload.to, [REAL])
  })

  await test('dry run sends nothing at all, even in production', async () => {
    const { provider, resend } = guarded({ ...PROD, EMAIL_DRY_RUN: '1' })
    await resend.emails.send({ from: 'f', to: REAL, subject: 's', html: 'h' })
    await resend.batch.send([{ from: 'f', to: [REAL], subject: 's', html: 'h' }])
    assert.equal(provider.calls.length, 0)
  })

  await test('the sign-in variant is not held back by the sandbox, but still never sends to a fake address', async () => {
    const { provider, resend } = guarded({}, { sandbox: false })
    await resend.emails.send({ from: 'f', to: REAL, subject: 'Sign in', html: 'h' })
    await resend.emails.send({ from: 'f', to: SEED, subject: 'Sign in', html: 'h' })
    assert.equal(provider.calls.length, 1)
    assert.equal(provider.calls[0].payload.to, REAL)
  })

  await test('`create` is guarded exactly like `send`', async () => {
    const { provider, resend } = guarded(PROD) as any
    await resend.emails.create({ from: 'f', to: SEED, subject: 's', html: 'h' })
    await resend.emails.create({ from: 'f', to: REAL, subject: 's', html: 'h' })
    assert.equal(provider.calls.length, 1)
  })

  await test('the same idempotency key sends a recipient once, through the guard, however many times it runs', async () => {
    const seen = new Set<string>()
    const sent: string[] = []
    const provider = {
      emails: {
        send: async (payload: any, options?: any) => {
          if (options?.idempotencyKey && seen.has(options.idempotencyKey)) return { data: { id: 'replayed' }, error: null }
          if (options?.idempotencyKey) seen.add(options.idempotencyKey)
          sent.push(payload.to)
          return { data: { id: 'new' }, error: null }
        }
      },
      batch: { send: async () => ({ data: null, error: null }) }
    }
    const resend = guardResend(provider, { env: PROD, onEvent: () => {} })
    for (let run = 0; run < 3; run++)
      for (const to of [REAL, REAL2]) await resend.emails.send({ from: 'f', to, subject: 's', html: 'h' }, { idempotencyKey: `core/2026-11-23/${to}` })
    assert.deepEqual(sent, [REAL, REAL2])
  })

  console.log(`\n${passed} delivery tests passed`)
}

await main()
