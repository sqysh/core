'use server'

import { auth } from '@/app/lib/auth/auth'
import prisma from '@/prisma/client'
import { getUserAttendance } from '../attendance/getUserAttendance'
import { BillingOrder } from '@/types/billing.types'

export async function getBillingData(): Promise<{
  success: boolean
  data?: {
    subscriptions: BillingOrder[]
    corrections: BillingOrder[]
    missedMeetings: { meetingId: string; date: string }[]
  }
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  try {
    const [orders, attendanceResult] = await Promise.all([
      prisma.order.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          amount: true,
          createdAt: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          hostedInvoiceUrl: true,
          invoicePdfUrl: true,
          invoiceNumber: true,
          meeting: { select: { date: true } }
        }
      }),
      getUserAttendance()
    ])

    const serialize = (o: (typeof orders)[0]): BillingOrder => ({
      id: o.id,
      type: o.type,
      status: o.status,
      amount: Number(o.amount),
      createdAt: o.createdAt.toISOString(),
      currentPeriodStart: o.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: o.currentPeriodEnd?.toISOString() ?? null,
      meetingDate: o.meeting?.date.toISOString() ?? null,
      hostedInvoiceUrl: o.hostedInvoiceUrl ?? null,
      invoicePdfUrl: o.invoicePdfUrl ?? null,
      invoiceNumber: o.invoiceNumber ?? null
    })

    const missedMeetings = (attendanceResult.data?.rows ?? [])
      .filter((r) => !r.attended)
      .map((r) => ({ meetingId: r.meetingId, date: r.date }))

    return {
      success: true,
      data: {
        subscriptions: orders.filter((o) => o.type === 'ANNUAL' || o.type === 'QUARTERLY').map(serialize),
        corrections: orders.filter((o) => o.type === 'ATTENDANCE_CORRECTION').map(serialize),
        missedMeetings
      }
    }
  } catch (err) {
    console.error('[getBillingData]', err)
    return { success: false, error: 'Failed to load billing data.' }
  }
}
