import { Resend } from 'resend'
import { guardResend } from '../email/delivery'

// The only place a Resend client is built. Everything that sends email imports one of these two, both behind the
// recipient and delivery rules in lib/email/delivery.ts (fake and seeded addresses never go out; outside production
// nothing goes out except to EMAIL_SANDBOX_ALLOWLIST; EMAIL_DRY_RUN=1 sends nothing).
const client = new Resend(process.env.RESEND_API_KEY)

/** Every automated email: notifications, campaigns, invites, referrals */
export const resend = guardResend(client)

/** A sign-in link, asked for by whoever is signing in: address-checked, but not held back in development */
export const authResend = guardResend(client, { sandbox: false })
