import { coreTemplate } from '@/app/lib/email-templates/core'
import { createLog } from '@/app/lib/utils/api/createLog'
import { handleApiError } from '@/app/lib/utils/api/handleApiError'
import prisma from '@/prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Helper to get the correct base URL
function getBaseUrl() {
  // Use custom domain in production, fallback to VERCEL_URL for previews
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}

async function sendCoreReminders(req: NextRequest) {
  const baseUrl = getBaseUrl()
  const normalizedUrl = `${baseUrl}/api/cron/core`

  try {
    const users = await prisma.user.findMany({ where: { membershipStatus: 'ACTIVE' } })

    const weekEndDate = 'tonight (Wednesday at 11:59 PM)'

    // Send emails with rate limiting (2 per second for Resend free tier)
    const results = []
    const BATCH_SIZE = 2
    const DELAY_MS = 1000 // 1 second between batches

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE)

      const batchPromises = batch.map(async (user) => {
        try {
          const result = await resend.emails.send({
            from: 'Coastal Referral Exchange <noreply@coastalreferralxchange.com>',
            to: user.email,
            subject: 'Log Your Activities',
            html: coreTemplate(user.name.split(' ')[0] || user.email.split('@')[0])
          })
          return { success: true, email: user.email, result }
        } catch (error) {
          return {
            success: false,
            email: user.email,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Wait before next batch (unless it's the last batch)
      if (i + BATCH_SIZE < users.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
      }
    }

    // Count successes and failures
    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length
    const failedEmails = results.filter((r) => !r.success).map((r) => ({ email: r.email, error: r.error }))

    // Log success
    await createLog('info', `Core reminder emails sent`, {
      location: ['app route - POST /api/cron/core'],
      message: `Sent ${successful}/${users.length} core reminder emails successfully`,
      name: 'CoreRemindersSent',
      timestamp: new Date().toISOString(),
      url: normalizedUrl,
      method: req.method,
      metadata: {
        totalUsers: users.length,
        successfulEmails: successful,
        failedEmails: failed,
        weekEndDate,
        executionTime: new Date().toISOString()
      }
    })

    // Log failures separately if any
    if (failed > 0) {
      await createLog('error', `Some core reminder emails failed`, {
        location: ['app route - POST /api/cron/core'],
        message: `${failed}/${users.length} email(s) failed to send`,
        name: 'CoreRemindersPartialFailure',
        timestamp: new Date().toISOString(),
        url: normalizedUrl,
        method: req.method,
        metadata: {
          failedCount: failed,
          failures: failedEmails
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `Core reminder sent to ${successful}/${users.length} active members`,
      count: users.length,
      successful,
      failed
    })
  } catch (error: any) {
    await createLog('error', `Core reminder job failed`, {
      location: ['app route - POST /api/cron/core'],
      message: `Fatal error in core reminders: ${error instanceof Error ? error.message : 'Unknown error'}`,
      name: 'CoreRemindersError',
      timestamp: new Date().toISOString(),
      url: normalizedUrl,
      method: req.method,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    })

    return handleApiError({
      error,
      req,
      action: 'send core reminder email',
      statusCode: error.statusCode || error.status || 500
    })
  }
}

// Handle both GET (cron) and POST (manual trigger)
export async function GET(req: NextRequest) {
  return sendCoreReminders(req)
}

export async function POST(req: NextRequest) {
  return sendCoreReminders(req)
}
