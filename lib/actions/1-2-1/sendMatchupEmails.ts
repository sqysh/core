'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { oneTwoOneMatchTemplate } from '@/lib/email/templates/one-two-one-match.template'
import { resend } from '@/lib/resend/resend'

export async function sendMatchupEmails() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'SUPER_USER') {
    return { success: false, error: 'Unauthorized' }
  }

  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const parleys = await prisma.parley.findMany({
    where: { chapterId, createdAt: { gte: start }, notes: 'Auto-matched weekly 1-2-1' },
    select: {
      requester: {
        select: {
          id: true,
          name: true,
          company: true,
          email: true,
          phone: true,
          alternateEmails: { select: { email: true } }
        }
      },
      recipient: {
        select: {
          id: true,
          name: true,
          company: true,
          email: true,
          phone: true,
          alternateEmails: { select: { email: true } }
        }
      }
    }
  })

  if (!parleys.length) return { success: false, error: 'No matchups found for today' }

  type M = (typeof parleys)[number]['requester']
  const assignments = new Map<string, { member: M; partners: M[] }>()

  for (const p of parleys) {
    for (const [self, other] of [
      [p.requester, p.recipient],
      [p.recipient, p.requester]
    ] as [M, M][]) {
      if (!assignments.has(self.id)) assignments.set(self.id, { member: self, partners: [] })
      assignments.get(self.id)!.partners.push(other)
    }
  }

  const results = await Promise.allSettled(
    [...assignments.values()].map(({ member, partners }) =>
      resend.emails.send({
        from: 'CORE <hello@coastalreferralxchange.com>',
        to: [member.email, ...member.alternateEmails.map((e) => e.email)],
        subject: partners.length > 1 ? 'Your 1-2-1s this week' : 'Your 1-2-1 this week',
        html: oneTwoOneMatchTemplate(
          member.name.split(' ')[0],
          partners.map((p) => ({ name: p.name, company: p.company, email: p.email, phone: p.phone }))
        )
      })
    )
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  return { success: true, sent: results.length - failed, failed }
}
