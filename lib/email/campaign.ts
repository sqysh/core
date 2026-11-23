import { DeliveryMode, deliveryMode, Excluded, HeldReason, normalizeAddress, partitionRecipients, planDelivery } from './delivery'

// A bulk email campaign (a cron job that mails a roster): who it would go to, whether it already ran, and the flags
// that let an operator look without sending. Pure logic over an injectable store; the route glue is cronCampaign.ts.

type Env = Record<string, string | undefined>
type Recipient = { email: string }

// ── flags ──────────────────────────────────────────────────────────────────────────────────────────────────────────

export type CampaignFlags = {
  /** ?dryRun=1: show the plan, send nothing, claim nothing */
  dryRun: boolean
  /** ?force=1: run again although today's run already happened (a deliberate manual re-send) */
  force: boolean
}

export function parseCampaignFlags(url: string): CampaignFlags {
  let q: URLSearchParams
  try {
    q = new URL(url, 'http://localhost').searchParams
  } catch {
    return { dryRun: false, force: false }
  }
  const on = (...names: string[]) => names.some((n) => ['1', 'true', 'yes', ''].includes((q.get(n) ?? 'no').toLowerCase()) && q.has(n))
  return { dryRun: on('dryRun', 'dry-run', 'dryrun'), force: on('force') }
}

// ── the plan ───────────────────────────────────────────────────────────────────────────────────────────────────────

export type CampaignPlan<R extends Recipient> = {
  campaign: string
  mode: DeliveryMode
  why: string
  /** Everyone the campaign's query returned */
  total: number
  /** Who goes out in this environment */
  send: R[]
  /** Deliverable, but this environment doesn't send to them (sandbox, or a dry run) */
  held: { recipient: R; address: string; reason: HeldReason }[]
  /** Never deliverable: seeded, reserved-domain, malformed or repeated addresses */
  excluded: Excluded<R>[]
}

export function planCampaign<R extends Recipient>(campaign: string, recipients: R[], env: Env = process.env): CampaignPlan<R> {
  const { eligible, excluded } = partitionRecipients(recipients, env)
  const { mode, why, send, held } = planDelivery(eligible.map((r) => r.email), env)
  const byAddress = new Map(eligible.map((r) => [normalizeAddress(r.email) as string, r]))
  const recipient = (address: string) => byAddress.get(address) as R
  return {
    campaign,
    mode,
    why,
    total: recipients.length,
    send: send.map(recipient),
    held: held.map((h) => ({ recipient: recipient(h.address), address: h.address, reason: h.reason })),
    excluded
  }
}

/** The environment a dry run is planned in: what production would do, whatever this process would */
export const liveEnvironment = (env: Env = process.env): Env => ({ ...env, EMAIL_DRY_RUN: '', EMAIL_DELIVERY: 'live' })

/** Members a campaign deliberately doesn't mail (they opted out, already did what it asks), kept for the report */
export type Suppressed<R> = { recipient: R; because: string }[]

/** The plan as a response body: who would receive the campaign and who wouldn't, and why */
export function describePlan<R extends Recipient & { name?: string | null }>(plan: CampaignPlan<R>, suppressed?: Suppressed<R>) {
  const person = (r: R) => ({ name: r.name ?? null, email: r.email })
  return {
    campaign: plan.campaign,
    mode: plan.mode,
    modeReason: plan.why,
    totalRecipientsFound: plan.total + (suppressed?.length ?? 0),
    wouldSend: plan.send.map(person),
    heldBack: plan.held.map((h) => ({ ...person(h.recipient), because: h.reason })),
    excluded: plan.excluded.map((e) => ({ ...person(e.recipient), because: e.reason })),
    ...(suppressed ? { suppressed: suppressed.map((s) => ({ ...person(s.recipient), because: s.because })) } : {}),
    counts: {
      wouldSend: plan.send.length,
      heldBack: plan.held.length,
      excluded: plan.excluded.length,
      ...(suppressed ? { suppressed: suppressed.length } : {})
    }
  }
}

// ── one run per period ─────────────────────────────────────────────────────────────────────────────────────────────

/** The chapter's calendar date (America/New_York), the unit a scheduled campaign runs once in: YYYY-MM-DD */
export function runPeriod(now: Date = new Date(), timeZone = 'America/New_York') {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export const claimKey = (campaign: string, period: string) => `campaign-run:${campaign}:${period}`

/** Where claims live. `earliest` is the oldest claim for a key (by creation time, then id: one total order). */
export type ClaimStore = {
  insert: (key: string) => Promise<string>
  earliest: (key: string) => Promise<string | null>
  remove: (id: string) => Promise<void>
}

export type Claim = { claimed: true; release: () => Promise<void> } | { claimed: false }

/**
 * Takes the right to run a campaign for a period. Everyone who asks writes a claim and then reads which is oldest:
 * only the owner of the oldest proceeds, so two deliveries of the same cron (a retry, a double fire, a person and the
 * scheduler) can't both send. Losers remove their own claim. `release` gives the claim back, for a run that failed
 * before it could finish (a retry may then run; per-recipient idempotency keys keep any already-sent email from going out twice).
 */
export async function claimRun(store: ClaimStore, key: string): Promise<Claim> {
  const mine = await store.insert(key)
  const first = await store.earliest(key)
  if (first === mine) return { claimed: true, release: () => store.remove(mine) }
  await store.remove(mine)
  return { claimed: false }
}

/** The key a recipient's email is sent under: Resend ignores a repeat of it for 24 hours, whoever repeats it */
export const idempotencyKey = (campaign: string, runKey: string, email: string) => `${campaign}/${runKey}/${email.trim().toLowerCase()}`

export { deliveryMode }
