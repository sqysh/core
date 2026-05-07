'use server'

import { auth } from '@/app/lib/auth'
import prisma from '@/prisma/client'
import { stripe } from '../../stripe'
import { createLog } from '../../utils/api/createLog'

export async function cancelSubscriptions(): Promise<{
  success: boolean
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        annualSubscriptionId: true,
        quarterlySubscriptionId: true
      }
    })

    if (!user) return { success: false, error: 'User not found' }

    const cancellations: Promise<any>[] = []

    if (user.annualSubscriptionId) {
      cancellations.push(stripe.subscriptions.cancel(user.annualSubscriptionId).catch(() => null))
    }

    if (user.quarterlySubscriptionId) {
      cancellations.push(stripe.subscriptions.cancel(user.quarterlySubscriptionId).catch(() => null))
    }

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { userId: user.id },
      select: { stripePaymentMethodId: true }
    })

    await Promise.all([
      ...cancellations,
      stripe.paymentMethods.detach(paymentMethod!.stripePaymentMethodId).catch(() => null)
    ])

    await prisma.paymentMethod.delete({
      where: { stripePaymentMethodId: paymentMethod!.stripePaymentMethodId }
    })

    // Webhooks will handle Order status + user flags
    // but update optimistically in case of webhook delay
    await prisma.user.update({
      where: { id: user.id },
      data: {
        hasAnnualSubscription: false,
        hasQuarterlySubscription: false,
        annualSubscriptionId: null,
        quarterlySubscriptionId: null
      }
    })

    await createLog('info', `${user.name} cancelled their subscriptions`, {
      action: 'CANCEL_SUBSCRIPTIONS',
      userId: user.id
    })

    return { success: true }
  } catch (err) {
    console.error('[cancelSubscriptions]', err)
    return { success: false, error: 'Failed to cancel subscriptions. Please try again.' }
  }
}
