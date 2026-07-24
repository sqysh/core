'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth'
import { buildLogMessage, getRequestContext } from '../../utils/log.utils'
import { getActor } from './getActor'
import { createLog } from '../../utils/api/createLog'

export async function exportUserData(): Promise<{
  success: boolean
  data?: Record<string, unknown>
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'You need to be signed in to download your data.' }
  }

  const [context, actor] = await Promise.all([
    getRequestContext().catch(() => null),
    getActor(session).catch(() => 'Unknown')
  ])

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        industry: true,
        role: true,
        membershipStatus: true,
        createdAt: true,
        chapter: { select: { name: true } },
        attendances: {
          select: {
            createdAt: true,
            meeting: { select: { date: true } }
          },
          orderBy: { meeting: { date: 'asc' } }
        },
        orders: {
          select: {
            type: true,
            status: true,
            amount: true,
            stripeSubId: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelledAt: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        },
        paymentMethods: {
          select: {
            brand: true,
            last4: true,
            expMonth: true,
            expYear: true,
            isDefault: true
          }
        }
      }
    })

    if (!user) {
      return { success: false, error: "We couldn't find your account. Please contact support." }
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      profile: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        company: user.company,
        industry: user.industry,
        role: user.role,
        chapter: user.chapter?.name ?? null,
        member_since: user.createdAt.toISOString(),
        membership_status: user.membershipStatus
      },
      attendance: {
        total_meetings_attended: user.attendances.length,
        records: user.attendances.map((a) => ({
          meeting_date: a.meeting.date.toISOString(),
          checked_in_at: a.createdAt.toISOString()
        }))
      },
      billing: {
        payment_methods_on_file: user.paymentMethods.map((pm) => ({
          brand: pm.brand,
          last4: pm.last4,
          expires: `${pm.expMonth}/${pm.expYear}`,
          is_default: pm.isDefault
        })),
        order_history: user.orders.map((o) => ({
          type: o.type,
          status: o.status,
          amount: o.amount,
          stripe_subscription_id: o.stripeSubId,
          period_start: o.currentPeriodStart.toISOString(),
          period_end: o.currentPeriodEnd.toISOString(),
          cancelled_at: o.cancelledAt?.toISOString() ?? null,
          created_at: o.createdAt.toISOString()
        }))
      }
    }

    if (context) {
      const logMessage = await buildLogMessage(`exported their data on cancellation`, actor, context)
      await createLog('info', logMessage, {
        action: 'EXPORT_USER_DATA',
        userId: session.user.id
      }).catch(() => null)
    }

    return { success: true, data: exportData }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('exportUserData failed:', err)

    if (context) {
      const logMessage = await buildLogMessage(`failed to export data: ${errorMessage}`, actor, context).catch(
        () => `${actor} failed to export data`
      )
      await createLog('error', logMessage, {
        action: 'EXPORT_USER_DATA',
        userId: session.user.id,
        errorMessage
      }).catch(() => null)
    }

    return {
      success: false,
      error: "We couldn't prepare your data right now. Please try again in a moment."
    }
  }
}
