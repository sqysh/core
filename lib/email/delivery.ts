// Who an automated email may be sent to, and whether it may be sent at all. The single place that decides it: every
// workflow sends through the guarded client (lib/resend/resend.ts wraps the real one in `guardResend`), so a new
// workflow is covered the moment it uses the shared client, and a test (tests/email/noBypass.test.ts) fails if one
// builds its own.
//
// Two separate questions, answered in order:
//
//   1. Is the address one that can ever be delivered to? Seeded test members (@seed.coretest.local), reserved and
//      example domains (.local, .test, .invalid, .example, example.com …), malformed text and duplicates are not.
//      They're dropped everywhere, in every environment: a bounce on a fake address costs sender reputation, and
//      nothing is lost by not sending it.
//   2. Is this process allowed to deliver for real? Only production is: VERCEL_ENV=production, or EMAIL_DELIVERY=live
//      for another host. Anywhere else (a laptop running `next dev`, or `next start` on a production build, a preview
//      deployment, a test run) the mode is "sandbox": nothing is sent except to addresses on EMAIL_SANDBOX_ALLOWLIST
//      (comma separated, `me@x.com` or `@x.com` for a whole domain), which is empty by default. EMAIL_DRY_RUN=1 sends
//      nothing anywhere.
//
// No imports and only erasable TypeScript, so plain Node scripts can import this file too.

export type DeliveryMode = 'live' | 'sandbox' | 'dry-run'

export type ExclusionReason = 'malformed' | 'seeded-test-address' | 'reserved-domain' | 'blocked-domain' | 'duplicate'

type Env = Record<string, string | undefined>

/** Domains the seed scripts create members on: real members are never on these */
export const SEEDED_TEST_DOMAINS = ['coretest.local']

/** Top-level domains reserved or never routable (RFC 2606, RFC 6761 and the usual private-network ones) */
const RESERVED_TLDS = ['local', 'localhost', 'localdomain', 'test', 'invalid', 'example', 'internal', 'lan', 'home', 'corp']
/** Reserved second-level domains (RFC 2606): mail to them goes nowhere */
const RESERVED_DOMAINS = ['example.com', 'example.org', 'example.net']

const truthy = (v: string | undefined) => ['1', 'true', 'yes', 'on'].includes((v ?? '').trim().toLowerCase())

const underDomain = (domain: string, parent: string) => domain === parent || domain.endsWith(`.${parent}`)

/** `Name <a@b.com>` or `a@b.com`, as the bare lower-case address; null if it isn't shaped like one */
export function normalizeAddress(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const m = raw.trim().match(/<([^<>]+)>\s*$/)
  const a = (m ? m[1] : raw).trim().toLowerCase()
  if (!a || a.length > 254) return null
  // one @, no spaces or separators, a dotted domain of letters, digits and hyphens
  if (!/^[^\s@<>()[\]\\,;:"]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(a)) return null
  return a
}

export type AddressVerdict = { ok: boolean; address: string; reason?: ExclusionReason }

/** Whether an address can be delivered to (not whether this environment may deliver: see `planDelivery`) */
export function classifyAddress(raw: unknown, env: Env = process.env): AddressVerdict {
  const address = normalizeAddress(raw)
  if (!address) return { ok: false, reason: 'malformed', address: String(raw ?? '').trim() }
  const domain = address.slice(address.lastIndexOf('@') + 1)
  if (SEEDED_TEST_DOMAINS.some((d) => underDomain(domain, d))) return { ok: false, reason: 'seeded-test-address', address }
  const tld = domain.slice(domain.lastIndexOf('.') + 1)
  if (RESERVED_TLDS.includes(tld) || RESERVED_DOMAINS.some((d) => underDomain(domain, d)))
    return { ok: false, reason: 'reserved-domain', address }
  const extra = (env.EMAIL_BLOCKED_DOMAINS ?? '')
    .split(/[\s,]+/)
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean)
  if (extra.some((d) => underDomain(domain, d))) return { ok: false, reason: 'blocked-domain', address }
  return { ok: true, address }
}

export const isDeliverableAddress = (raw: unknown, env: Env = process.env) => classifyAddress(raw, env).ok

export type Excluded<R> = { recipient: R; address: string; reason: ExclusionReason }

/** A recipient list split into who can be emailed and who can't (and why); a repeated address keeps its first entry */
export function partitionRecipients<R extends { email: string }>(recipients: R[], env: Env = process.env) {
  const eligible: R[] = []
  const excluded: Excluded<R>[] = []
  const seen = new Set<string>()
  for (const recipient of recipients) {
    const v = classifyAddress(recipient.email, env)
    if (!v.ok) {
      excluded.push({ recipient, address: v.address, reason: v.reason as ExclusionReason })
    } else if (seen.has(v.address)) {
      excluded.push({ recipient, address: v.address, reason: 'duplicate' })
    } else {
      seen.add(v.address)
      eligible.push(recipient)
    }
  }
  return { eligible, excluded }
}

// ── environment ────────────────────────────────────────────────────────────────────────────────────────────────────

export function deliveryMode(env: Env = process.env): { mode: DeliveryMode; why: string } {
  if (truthy(env.EMAIL_DRY_RUN)) return { mode: 'dry-run', why: 'EMAIL_DRY_RUN is set' }
  if ((env.EMAIL_DELIVERY ?? '').trim().toLowerCase() === 'live') return { mode: 'live', why: 'EMAIL_DELIVERY=live' }
  if (env.VERCEL_ENV === 'production') return { mode: 'live', why: 'production deployment' }
  return { mode: 'sandbox', why: 'not a production deployment (set EMAIL_DELIVERY=live to send for real)' }
}

export function sandboxAllowlist(env: Env = process.env): string[] {
  return (env.EMAIL_SANDBOX_ALLOWLIST ?? '')
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

/** On the allowlist as an address (`me@x.com`) or as its whole domain (`@x.com`) */
export function allowedInSandbox(address: string, allowlist: string[]) {
  const a = address.toLowerCase()
  return allowlist.some((entry) => (entry.startsWith('@') ? a.endsWith(entry) : a === entry))
}

export type HeldReason = 'sandbox' | 'dry-run'

/**
 * What this environment would do with a list of addresses: `send` goes out, `held` is deliverable but not sent here
 * (sandbox or dry run), `excluded` can never be delivered. `sandbox: false` is for emails a person asks for themselves
 * (a sign-in link): checked for deliverability but not held back in development.
 */
export function planDelivery(addresses: string[], env: Env = process.env, options: { sandbox?: boolean } = {}) {
  const { mode, why } = deliveryMode(env)
  const allowlist = sandboxAllowlist(env)
  const send: string[] = []
  const held: { address: string; reason: HeldReason }[] = []
  const excluded: { address: string; reason: ExclusionReason }[] = []
  const seen = new Set<string>()
  for (const raw of addresses) {
    const v = classifyAddress(raw, env)
    if (!v.ok) {
      excluded.push({ address: v.address, reason: v.reason as ExclusionReason })
      continue
    }
    if (seen.has(v.address)) continue
    seen.add(v.address)
    if (mode === 'dry-run') held.push({ address: v.address, reason: 'dry-run' })
    else if (mode === 'sandbox' && options.sandbox !== false && !allowedInSandbox(v.address, allowlist))
      held.push({ address: v.address, reason: 'sandbox' })
    else send.push(v.address)
  }
  return { mode, why, send, held, excluded }
}

// ── the guarded client ─────────────────────────────────────────────────────────────────────────────────────────────

type Payload = { to?: string | string[]; cc?: string | string[]; bcc?: string | string[]; [key: string]: unknown }

type ResendLike = {
  emails: { send: (payload: any, options?: any) => Promise<any> }
  batch: { send: (payloads: any[], options?: any) => Promise<any> }
}

export type GuardEvent = {
  kind: 'blocked' | 'held' | 'skipped'
  mode: DeliveryMode
  subject?: string
  blocked: { address: string; reason: string }[]
  sent: string[]
}

/** Applies `planDelivery` to a payload's to/cc/bcc; `null` when nobody is left to send `to` */
function guardPayload(payload: Payload, env: Env, sandbox: boolean) {
  const kept: Payload = { ...payload }
  const blocked: { address: string; reason: string }[] = []
  const sent: string[] = []
  let mode: DeliveryMode = 'live'
  for (const field of ['to', 'cc', 'bcc'] as const) {
    const value = payload[field]
    if (value === undefined) continue
    const list = Array.isArray(value) ? value : [value]
    const plan = planDelivery(list, env, { sandbox })
    mode = plan.mode
    blocked.push(...plan.excluded, ...plan.held.map((h) => ({ address: h.address, reason: h.reason })))
    sent.push(...plan.send)
    if (plan.send.length) kept[field] = Array.isArray(value) ? plan.send : plan.send[0]
    else delete kept[field]
  }
  return { kept: kept.to === undefined ? null : kept, blocked, sent, mode }
}

/**
 * The real Resend client, behind the eligibility and delivery rules above. Same shape, same results: a send that
 * has nobody left to go to is skipped and resolves `{ data: null, error: null, skipped: true }`, so callers that treat
 * an error as failure don't see a seeded address as one. `onEvent` hears what was held back (default: a console line).
 */
export function guardResend<T extends ResendLike>(
  inner: T,
  options: { env?: Env; sandbox?: boolean; onEvent?: (e: GuardEvent) => void } = {}
): T {
  const env = () => options.env ?? process.env
  const sandbox = options.sandbox !== false
  const report =
    options.onEvent ??
    ((e: GuardEvent) => {
      const why = e.blocked.map((b) => `${b.address} (${b.reason})`).join(', ')
      console.warn(`[email] ${e.kind}${e.subject ? ` "${e.subject}"` : ''} in ${e.mode} mode: ${why || 'nothing to send'}`)
    })

  const send = async (payload: Payload, requestOptions?: unknown) => {
    const g = guardPayload(payload, env(), sandbox)
    if (g.blocked.length || !g.kept) report({ kind: g.kept ? 'blocked' : 'skipped', mode: g.mode, subject: String(payload.subject ?? ''), blocked: g.blocked, sent: g.sent })
    if (!g.kept) return { data: null, error: null, skipped: true }
    return inner.emails.send(g.kept, requestOptions)
  }

  const batch = async (payloads: Payload[], requestOptions?: unknown) => {
    const kept: Payload[] = []
    for (const p of payloads) {
      const g = guardPayload(p, env(), sandbox)
      if (g.blocked.length || !g.kept) report({ kind: g.kept ? 'blocked' : 'skipped', mode: g.mode, subject: String(p.subject ?? ''), blocked: g.blocked, sent: g.sent })
      if (g.kept) kept.push(g.kept)
    }
    if (!kept.length) return { data: { data: [] }, error: null, skipped: true }
    return inner.batch.send(kept, requestOptions)
  }

  const wrap = <O extends object>(target: O, overrides: Record<string, unknown>) =>
    new Proxy(target, {
      get(t, prop, receiver) {
        if (typeof prop === 'string' && prop in overrides) return overrides[prop]
        const value = Reflect.get(t, prop, receiver)
        return typeof value === 'function' ? value.bind(t) : value
      }
    })

  return new Proxy(inner, {
    get(t, prop, receiver) {
      if (prop === 'emails') return wrap(t.emails, { send, create: send })
      if (prop === 'batch') return wrap(t.batch, { send: batch, create: batch })
      return Reflect.get(t, prop, receiver)
    }
  })
}
