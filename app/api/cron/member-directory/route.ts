import { createLog } from '@/app/lib/utils/api/createLog'
import { handleApiError } from '@/app/lib/utils/api/handleApiError'
import prisma from '@/prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { memberDirectoryTemplate } from '@/app/lib/email/member-directory.template'

const resend = new Resend(process.env.RESEND_API_KEY)

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

async function sendDirectoryReminders(req: NextRequest) {
  const baseUrl = getBaseUrl()
  const normalizedUrl = `${baseUrl}/api/cron/member-directory`

  try {
    const users = await prisma.user.findMany({
      where: { membershipStatus: 'ACTIVE' }
    })

    const results = []
    const BATCH_SIZE = 2
    const DELAY_MS = 1000

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE)

      const batchPromises = batch.map(async (user) => {
        try {
          const result = await resend.emails.send({
            from: 'Coastal Referral Exchange <core@coastalreferralxchange.com>',
            to: user.email,
            subject: 'CORE Member Directory — Latest Roster',
            html: memberDirectoryTemplate(user.name.split(' ')[0] || user.email.split('@')[0])
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

      if (i + BATCH_SIZE < users.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
      }
    }

    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length
    const failedEmails = results.filter((r) => !r.success).map((r) => ({ email: r.email, error: r.error }))

    await createLog('info', `Directory reminder emails sent`, {
      location: ['app route - GET /api/cron/member-directory'],
      message: `Sent ${successful}/${users.length} directory reminder emails successfully`,
      name: 'DirectoryRemindersSent',
      timestamp: new Date().toISOString(),
      url: normalizedUrl,
      method: req.method,
      metadata: {
        totalUsers: users.length,
        successfulEmails: successful,
        failedEmails: failed,
        executionTime: new Date().toISOString()
      }
    })

    if (failed > 0) {
      await createLog('error', `Some directory reminder emails failed`, {
        location: ['app route - GET /api/cron/member-directory'],
        message: `${failed}/${users.length} email(s) failed to send`,
        name: 'DirectoryRemindersPartialFailure',
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
      message: `Directory reminder sent to ${successful}/${users.length} active members`,
      count: users.length,
      successful,
      failed
    })
  } catch (error: any) {
    await createLog('error', `Directory reminder job failed`, {
      location: ['app route - GET /api/cron/member-directory'],
      message: `Fatal error in directory reminders: ${error instanceof Error ? error.message : 'Unknown error'}`,
      name: 'DirectoryRemindersError',
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
      action: 'send directory reminder email',
      statusCode: error.statusCode || error.status || 500
    })
  }
}

export async function GET(req: NextRequest) {
  return sendDirectoryReminders(req)
}

export async function POST(req: NextRequest) {
  return sendDirectoryReminders(req)
}
