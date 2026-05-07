'use server'

import { auth } from '@/app/lib/auth'
import prisma from '@/prisma/client'
import { stripe } from '../../stripe'

export async function updatePaymentMethod(newStripePaymentMethodId: string): Promise<{
  success: boolean
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true }
    })

    if (!user?.stripeCustomerId) return { success: false, error: 'No Stripe customer found' }

    const oldPaymentMethod = await prisma.paymentMethod.findFirst({
      where: { userId: session.user.id, isDefault: true },
      select: { stripePaymentMethodId: true }
    })

    await Promise.all([
      // Attach new payment method to customer
      stripe.paymentMethods.attach(newStripePaymentMethodId, {
        customer: user.stripeCustomerId
      }),

      // Set as default on customer
      stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: { default_payment_method: newStripePaymentMethodId }
      })
    ])

    // Detach old payment method if exists
    if (oldPaymentMethod) {
      await stripe.paymentMethods.detach(oldPaymentMethod.stripePaymentMethodId)
    }

    return { success: true }
  } catch (err) {
    console.error('[updatePaymentMethod]', err)
    return { success: false, error: 'Failed to update payment method. Please try again.' }
  }
}
