'use server'

import Stripe from 'stripe'
import { auth } from '@/app/lib/auth/auth'
import prisma from '@/prisma/client'
import { createLog } from '../../utils/api/createLog'

const coreStripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

export async function createAttendanceCorrectionPayment({
  meetingId,
  tipSqysh
}: {
  meetingId: string
  tipSqysh: boolean
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        stripeCustomerId: true,
        paymentMethods: {
          where: { isDefault: true },
          select: { stripePaymentMethodId: true },
          take: 1
        }
      }
    })

    if (!user) return { success: false, error: 'User not found' }
    if (!user.stripeCustomerId)
      return { success: false, error: 'No Stripe customer found. Please complete membership setup.' }

    const paymentMethod = user.paymentMethods[0]
    if (!paymentMethod)
      return { success: false, error: 'No card on file. Please add a payment method in membership settings.' }

    await coreStripe.paymentIntents.create({
      amount: tipSqysh ? 20000 : 15000,
      currency: 'usd',
      customer: user.stripeCustomerId,
      payment_method: paymentMethod.stripePaymentMethodId,
      confirm: true,
      off_session: true,
      receipt_email: user.email ?? undefined,
      description: `Attendance correction — ${user.name}${tipSqysh ? ' (incl. $50 Sqysh tip)' : ''}`,
      metadata: {
        type: 'ATTENDANCE_CORRECTION',
        meetingId,
        userId: session.user.id,
        userName: user.name,
        tipSqysh: String(tipSqysh)
      }
    })

    await createLog('info', `${user.name} paid attendance correction fee`, {
      action: 'ATTENDANCE_CORRECTION_PAID',
      meetingId,
      userId: session.user.id,
      tipSqysh,
      coreAmount: 150,
      sqyshAmount: tipSqysh ? 50 : 0
    })

    return { success: true }
  } catch (err: any) {
    console.error('[createAttendanceCorrectionPayment]', err)

    // Stripe card errors are user-facing
    if (err?.type === 'StripeCardError') {
      return { success: false, error: err.message }
    }

    return { success: false, error: 'Payment failed. Please try again.' }
  }
}
