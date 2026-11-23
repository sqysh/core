import type { EmailConfig } from 'next-auth/providers/email'
import { authResend as resend } from '@/lib/resend/resend'
import magicLinkTemplate from '@/lib/email/magic-link'
import { createLog } from '@/lib/utils/api/createLog'

export const magicLinkConfig: EmailConfig = {
  id: 'email',
  name: 'Email',
  type: 'email',
  maxAge: 60 * 60 * 24,
  from: process.env.RESEND_FROM_EMAIL!,
  sendVerificationRequest: async ({ identifier: email, url }) => {
    try {
      const result = await resend.emails.send({
        from: `Coastal Referral Exchange <core@coastalreferralxchange.com>`,
        to: email,
        subject: 'Click Here to Sign In - Coastal Referral Exchange',
        html: magicLinkTemplate(url)
      })

      await createLog('info', 'Magic link email sent successfully', {
        location: ['auth.ts - sendVerificationRequest'],
        name: 'MagicLinkSent',
        timestamp: new Date().toISOString(),
        email,
        resendId: result.data?.id ?? null
      })
    } catch (error) {
      await createLog('warning', 'Failed to send magic link email', {
        location: ['auth.ts - sendVerificationRequest'],
        name: 'MagicLinkFailed',
        timestamp: new Date().toISOString(),
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
}
