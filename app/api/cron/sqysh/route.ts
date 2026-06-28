import sqyshGoogleReviewTemplate from '@/app/lib/email-templates/sqysh-google-review'
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

async function sendSqyshGoogleReviewReminders(req: NextRequest) {
  const baseUrl = getBaseUrl()
  const normalizedUrl = `${baseUrl}/api/cron/sqysh`

  try {
    const users = await prisma.user.findMany({ where: { membershipStatus: 'ACTIVE' } })

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
            subject: 'Help Sqysh Grow - Share Your Experience',
            html: sqyshGoogleReviewTemplate(user?.name?.split(' ')[0])
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
    await createLog('info', `Sqysh google review reminder emails sent`, {
      location: ['app route - POST /api/cron/sqysh'],
      message: `Sent ${successful}/${users.length} sqysh google review reminder emails successfully`,
      name: 'SqyshGoogleReviewRemindersSent',
      timestamp: new Date().toISOString(),
      url: normalizedUrl,
      method: req.method,
      metadata: {
        totalUsers: users.length,
        successfulEmails: successful,
        failedEmails: failed,
        presenter: 'Sqysh',
        executionTime: new Date().toISOString()
      }
    })

    // Log failures separately if any
    if (failed > 0) {
      await createLog('error', `Some sqysh google review reminder emails failed`, {
        location: ['app route - POST /api/cron/sqysh'],
        message: `${failed}/${users.length} email(s) failed to send`,
        name: 'SqyshGoogleReviewRemindersPartialFailure',
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
      message: `Sqysh google review reminder sent to ${successful}/${users.length} active members`,
      count: users.length,
      successful,
      failed
    })
  } catch (error: any) {
    await createLog('error', `Sqysh google review reminder job failed`, {
      location: ['app route - POST /api/cron/sqysh'],
      message: `Fatal error in sqysh google review reminders: ${error instanceof Error ? error.message : 'Unknown error'}`,
      name: 'SqyshGoogleReviewRemindersError',
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
      action: 'send sqysh google review reminder email',
      statusCode: error.statusCode || error.status || 500
    })
  }
}

// Handle both GET (cron) and POST (manual trigger)
export async function GET(req: NextRequest) {
  return sendSqyshGoogleReviewReminders(req)
}

export async function POST(req: NextRequest) {
  return sendSqyshGoogleReviewReminders(req)
}
