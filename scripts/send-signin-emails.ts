import prisma from '../prisma/client'
import { Resend } from 'resend'
import { chapterId } from '../app/lib/constants/api/chapterId'
import {
  signInActionRequiredTemplate,
  signInHeadsUpTemplate
} from '../app/lib/email/templates/sign-in-migration.template'

const resend = new Resend(process.env.RESEND_API_KEY)
const DEADLINE = 'Wednesday, July 29'
const DRY_RUN = process.argv.includes('--send') === false

async function main() {
  const members = await prisma.user.findMany({
    where: { chapterId, membershipStatus: 'ACTIVE' },
    select: {
      name: true,
      email: true,
      _count: { select: { alternateEmails: true } }
    },
    orderBy: { name: 'asc' }
  })

  const needsAction = members.filter((m) => m._count.alternateEmails === 0)

  console.log(`\n${members.length} active members`)
  console.log(`${needsAction.length} need a Google account:\n`)
  needsAction.forEach((m) => console.log(`  ${m.name} — ${m.email}`))

  if (DRY_RUN) {
    console.log('\nDry run. Re-run with --send to actually send.\n')
    return
  }

  for (const m of members) {
    const firstName = m.name.split(' ')[0]
    const isAction = m._count.alternateEmails === 0

    try {
      await resend.emails.send({
        from: 'Coastal Referral Exchange <membership@coastalreferralxchange.com>',
        to: [m.email],
        subject: isAction
          ? `Action needed — your CORE sign-in changes ${DEADLINE}`
          : 'A small change to how you sign in to CORE',
        html: isAction ? signInActionRequiredTemplate(firstName, DEADLINE) : signInHeadsUpTemplate(firstName, DEADLINE)
      })
      console.log(`sent  ${m.email}  ${isAction ? '[action]' : '[heads-up]'}`)
    } catch (e) {
      console.log(`FAIL  ${m.email}  ${e instanceof Error ? e.message : e}`)
    }
  }
}

main().finally(() => prisma.$disconnect())
