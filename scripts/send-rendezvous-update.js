import { rendezvousUpdateTemplate } from '../app/lib/email-templates/rendezvous-update.ts'
import prisma from '../prisma/client.ts'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function sendRendezvousUpdate() {
  console.log('🚀 Sending rendezvous update emails...')

  try {
    const users = await prisma.user.findMany({
      where: { membershipStatus: 'ACTIVE' }
    })

    console.log(`📋 Found ${users.length} active members`)

    const results = []
    const BATCH_SIZE = 2
    const DELAY_MS = 1000

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE)

      const batchPromises = batch.map(async (user) => {
        try {
          const result = await resend.emails.send({
            from: 'Sqysh @ CORE <changelog@coastalreferralxchange.com>',
            to: user.email,
            subject: 'Rendezvous Calendar Updated Through June 1st',
            html: rendezvousUpdateTemplate()
          })
          console.log(`✅ Sent to ${user.email}`)
          return { success: true, email: user.email, result }
        } catch (error) {
          console.error(`❌ Failed to send to ${user.email}:`, error)
          return { success: false, email: user.email, error: error.message }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      if (i + BATCH_SIZE < users.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
      }
    }

    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length
    const failedEmails = results.filter((r) => !r.success).map((r) => ({ email: r.email, error: r.error }))

    await prisma.log.create({
      data: {
        level: 'info',
        message: 'Rendezvous update emails sent',
        metadata: JSON.stringify({
          location: ['script - scripts/send-rendezvous-update.js'],
          name: 'RendezvousUpdateEmailsSent',
          timestamp: new Date().toISOString(),
          totalUsers: users.length,
          successfulEmails: successful,
          failedEmails: failed
        })
      }
    })

    if (failed > 0) {
      await prisma.log.create({
        data: {
          level: 'error',
          message: 'Some rendezvous update emails failed',
          metadata: JSON.stringify({
            location: ['script - scripts/send-rendezvous-update.js'],
            name: 'RendezvousUpdateEmailsPartialFailure',
            timestamp: new Date().toISOString(),
            failedCount: failed,
            failures: failedEmails
          })
        }
      })
    }

    console.log(`\n📊 Results: ${successful}/${users.length} sent successfully`)
    if (failed > 0)
      console.log(
        `⚠️  ${failed} failed:`,
        failedEmails.map((r) => r.email)
      )
  } catch (error) {
    await prisma.log.create({
      data: {
        level: 'error',
        message: 'Rendezvous update script fatal error',
        metadata: JSON.stringify({
          location: ['script - scripts/send-rendezvous-update.js'],
          name: 'RendezvousUpdateScriptError',
          timestamp: new Date().toISOString(),
          error: error.message,
          stack: error.stack
        })
      }
    })

    console.error('💥 Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

sendRendezvousUpdate()
