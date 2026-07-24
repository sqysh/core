import { cardReminderTemplate } from './../app/lib/email-templates/card-reminder.template.ts'
import prisma from '../prisma/client.ts'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─────────────────────────────────────────────────────────────────────────────
// Members who already have a card on file — they won't get the reminder.
// Add emails here as people enter their card, then redeploy. Lowercased +
// trimmed on compare, so casing/whitespace here doesn't matter.
// ─────────────────────────────────────────────────────────────────────────────
const HAS_CARD_ON_FILE = ['page.driscoll@commpayhr.com', 'chris@cplaccounting.com']

const skipSet = new Set(HAS_CARD_ON_FILE.map((e) => e.trim().toLowerCase()))

// ─── Send ────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  console.log('Loading active members…')
  const activeUsers = await prisma.user.findMany({ where: { membershipStatus: 'ACTIVE' } })

  const users = activeUsers.filter((u) => !skipSet.has(u.email.trim().toLowerCase()))
  const skipped = activeUsers.length - users.length

  console.log(`Active: ${activeUsers.length} · eligible: ${users.length} · skipped (card on file): ${skipped}`)
  if (users.length === 0) {
    console.log('No one to email. Done.')
    return
  }
  const DASHBOARD_URL = 'https://coastalreferralxchange.com/dashboard'
  const results = []
  const BATCH_SIZE = 2
  const DELAY_MS = 1000
  const FROM = 'Coastal Referral Xchange <core@coastalreferralxchange.com>'
  const SUBJECT = 'Add your card — first quarterly charge is coming up'

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async (user) => {
        const firstName = (user.name && user.name.split(' ')[0]) || 'there'
        try {
          await resend.emails.send({
            from: FROM,
            to: user.email,
            subject: SUBJECT,
            html: cardReminderTemplate(firstName, DASHBOARD_URL)
          })
          console.log(`  ✅ ${user.email}`)
          return { success: true, email: user.email }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          console.log(`  ❌ ${user.email} — ${msg}`)
          return { success: false, email: user.email, error: msg }
        }
      })
    )
    results.push(...batchResults)
    if (i + BATCH_SIZE < users.length) await sleep(DELAY_MS)
  }

  const successful = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  console.log('\n─── Summary ───')
  console.log(`Sent:    ${successful}`)
  console.log(`Failed:  ${failed}`)
  console.log(`Skipped: ${skipped}`)
  if (failed > 0) {
    console.log('\nFailures:')
    results.filter((r) => !r.success).forEach((r) => console.log(`  ${r.email}: ${r.error}`))
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
