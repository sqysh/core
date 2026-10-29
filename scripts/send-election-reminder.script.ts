import { chapterId } from '@/lib/constants/api/chapterId'
import { electionReminderTemplate } from '@/lib/email/election-reminder.template'
import { resend } from '@/lib/resend/resend'
import prisma from '@/prisma/client'
import { LeadershipPosition } from '@prisma/client'
import { Resend } from 'resend'

const DRY_RUN = process.argv.includes('--send') === false
const TEST_EMAIL = 'greg@sqysh.com'
const FROM = 'CORE <hello@coastalreferralxchange.com>'

async function main() {
  const year = new Date().getFullYear()

  const members = await prisma.user.findMany({
    where: { chapterId, membershipStatus: 'ACTIVE' },
    select: { name: true, email: true, alternateEmails: { select: { email: true } } },
    orderBy: { name: 'asc' }
  })

  const terms = await prisma.leadershipTerm.findMany({
    where: { chapterId, isActive: true },
    select: { position: true, holder: { select: { name: true } } }
  })

  const currentHolders = terms.reduce<Partial<Record<LeadershipPosition, string[]>>>((acc, t) => {
    ;(acc[t.position] ??= []).push(t.holder.name)
    return acc
  }, {})

  console.log(`[${DRY_RUN ? 'DRY RUN' : 'SENDING'}] ${members.length} members\n`)

  if (DRY_RUN) {
    await resend.emails.send({
      from: FROM,
      to: TEST_EMAIL,
      subject: '[PREVIEW] The election is tomorrow',
      html: electionReminderTemplate('Greg', year, currentHolders)
    })
    members.forEach((m) => console.log(`  ${m.name}`))
    console.log(`\nPreview sent to ${TEST_EMAIL}. Pass --send to send for real.`)
    return
  }

  const payload = members.map((m) => ({
    from: FROM,
    to: [...new Set([m.email, ...m.alternateEmails.map((e) => e.email)].map((e) => e.trim().toLowerCase()))],
    subject: 'The election is tomorrow',
    html: electionReminderTemplate(m.name.split(' ')[0], year, currentHolders)
  }))

  const { data, error } = await resend.batch.send(payload)

  if (error) {
    console.error('Failed:', error.message)
    process.exitCode = 1
    return
  }

  console.log(`Sent ${data?.data.length ?? 0}.`)
}

main()
  .catch((e) => {
    console.error('Fatal:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
