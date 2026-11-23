import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from './requireCron'
import {
  CampaignPlan,
  claimKey,
  claimRun,
  describePlan,
  Suppressed,
  idempotencyKey,
  liveEnvironment,
  parseCampaignFlags,
  planCampaign,
  runPeriod
} from './campaign'
import { prismaClaimStore } from './campaignStore'
import { deliveryMode } from './delivery'

// What every email cron route does before it sends anything. Operators can look first:
//
//   curl -H "Authorization: Bearer $CRON_SECRET" "<site>/api/cron/<job>?dryRun=1"     who would get it, sends nothing
//   curl -H "Authorization: Bearer $CRON_SECRET" "<site>/api/cron/<job>?force=1"      run again today, on purpose
//
// 1. Authorized (requireCron.ts): a non-empty CRON_SECRET must be configured and presented.
// 2. ?dryRun=1: the plan as production would run it, no claim, no send.
// 3. Recipients that can never be delivered (seeded, reserved-domain, malformed, repeated) are dropped; outside
//    production, nobody is sent to unless EMAIL_SANDBOX_ALLOWLIST names them. Nothing left to send ends the run here.
//    `suppressed` are members the campaign itself set aside (say, already done what it asks): they never reach
//    `recipients`, but the dry run lists them and why. `notes` adds campaign-specific lines to that report.
// 4. One run per campaign per day: a second delivery of the same cron (a retry, a double fire) finds the day taken.

type Person = { email: string; name?: string | null }

export async function prepareCampaign<R extends Person>(
  req: NextRequest,
  { campaign, recipients, suppressed, notes }: { campaign: string; recipients: R[]; suppressed?: Suppressed<R>; notes?: Record<string, unknown> }
): Promise<
  | { response: NextResponse }
  | { plan: CampaignPlan<R>; keyFor: (email: string) => string; release: () => Promise<void> }
> {
  const denied = requireCron(req)
  if (denied) return { response: denied }

  const flags = parseCampaignFlags(req.url)

  if (flags.dryRun) {
    const plan = planCampaign(campaign, recipients, liveEnvironment())
    return {
      response: NextResponse.json({ dryRun: true, thisEnvironmentWouldRun: deliveryMode().mode, ...describePlan(plan, suppressed), ...notes })
    }
  }

  const plan = planCampaign(campaign, recipients)
  if (!plan.send.length) {
    return {
      response: NextResponse.json({
        success: true,
        skipped: true,
        reason: plan.mode === 'live' ? 'no deliverable recipients' : `nothing sent in ${plan.mode} mode (${plan.why})`,
        ...describePlan(plan, suppressed),
        ...notes
      })
    }
  }

  const period = runPeriod()
  let release = async () => {}
  if (!flags.force) {
    const claim = await claimRun(prismaClaimStore, claimKey(campaign, period))
    if (!claim.claimed) {
      return {
        response: NextResponse.json({
          success: true,
          skipped: true,
          reason: `${campaign} already ran for ${period}; nothing sent (add ?force=1 to run it again on purpose)`
        })
      }
    }
    release = claim.release
  }

  // a forced re-run is a new run to Resend too, or it would be told it had already sent these
  const runKey = flags.force ? `${period}-force-${Date.now()}` : period
  return { plan, keyFor: (email) => idempotencyKey(campaign, runKey, email), release }
}
