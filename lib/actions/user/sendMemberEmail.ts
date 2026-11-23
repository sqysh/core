'use server'

import { auth } from '@/lib/auth/auth'
import { resend } from '@/lib/resend/resend'
import { memberMessageTemplate } from '@/lib/email/member-message.template'
import { createLog } from '@/lib/utils/api/createLog'

export async function sendMemberEmail({ to, from, message }: { to: string; from: string; message: string }) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  await resend.emails.send({
    from: `Coastal Referral Exchange <core@coastalreferralxchange.com>`,
    to: [to],
    subject: `Message from ${from} — Coastal Referral Exchange`,
    html: memberMessageTemplate(from, message)
  })

  await createLog('info', `${from} sent a message to ${to}`, {
    location: ['server action - sendMemberEmail'],
    name: 'MemberEmailSent',
    timestamp: new Date().toISOString(),
    from: session.user.id,
    to
  })

  return { success: true }
}
