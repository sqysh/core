import { chapterId } from '@/lib/constants/api/chapterId'
import { BALLOT_QUESTIONS } from '@/lib/constants/questions.constants'
import { electionResultsTemplate, QuestionTally } from '@/lib/email/election-results.template'
import prisma from '@/prisma/client'
import { LeadershipPosition, QuestionAnswer } from '@prisma/client'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const DRY_RUN = process.argv.includes('--send') === false
const TEST_EMAIL = 'greg@sqysh.com'
const FROM = 'CORE <hello@coastalreferralxchange.com>'

async function main() {
  const year = new Date().getFullYear()

  const election = await prisma.election.findUnique({
    where: { chapterId_year: { chapterId, year } },
    select: { id: true, status: true }
  })

  if (!election) {
    console.log('No election found for this year.')
    return
  }

  const [terms, questionRows, voters, members] = await Promise.all([
    prisma.leadershipTerm.findMany({
      where: { chapterId, isActive: true },
      select: { position: true, holder: { select: { name: true } } }
    }),
    prisma.questionResponse.groupBy({
      by: ['questionKey', 'answer'],
      where: { electionId: election.id },
      _count: { answer: true }
    }),
    prisma.ballot.findMany({
      where: { electionId: election.id },
      select: { voterId: true },
      distinct: ['voterId']
    }),
    prisma.user.findMany({
      where: { chapterId, membershipStatus: 'ACTIVE' },
      select: { name: true, email: true, alternateEmails: { select: { email: true } } },
      orderBy: { name: 'asc' }
    })
  ])

  const holders = terms.reduce<Partial<Record<LeadershipPosition, string[]>>>((acc, t) => {
    ;(acc[t.position] ??= []).push(t.holder.name)
    return acc
  }, {})

  const questions: QuestionTally[] = BALLOT_QUESTIONS.map((q) => {
    const rows = questionRows.filter((r) => r.questionKey === q.key)
    return {
      key: q.key,
      total: rows.reduce((sum, r) => sum + r._count.answer, 0),
      counts: rows.reduce((acc, r) => ({ ...acc, [r.answer]: r._count.answer }), {} as Record<QuestionAnswer, number>)
    }
  })

  const turnout = { voted: voters.length, eligible: members.length }

  console.log(`[${DRY_RUN ? 'DRY RUN' : 'SENDING'}] ${members.length} members`)
  console.log(`Turnout: ${turnout.voted} of ${turnout.eligible}`)
  console.log(`Seats: ${terms.length}\n`)

  for (const p of Object.keys(holders) as LeadershipPosition[]) {
    console.log(`  ${p}: ${holders[p]!.join(', ')}`)
  }
  console.log()

  if (DRY_RUN) {
    await resend.emails.send({
      from: FROM,
      to: TEST_EMAIL,
      subject: `[PREVIEW] Your ${year}-${year + 1} leadership`,
      html: electionResultsTemplate('Greg', year, holders, questions)
    })
    console.log(`Preview sent to ${TEST_EMAIL}. Pass --send to send for real.`)
    return
  }

  const payload = members.map((m) => ({
    from: FROM,
    to: [...new Set([m.email, ...m.alternateEmails.map((e) => e.email)].map((e) => e.trim().toLowerCase()))],
    subject: `Your ${year}-${year + 1} leadership`,
    html: electionResultsTemplate(m.name.split(' ')[0], year, holders, questions)
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
