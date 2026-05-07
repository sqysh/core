'use server'

import { auth } from '@/app/lib/auth'
import prisma from '@/prisma/client'
import { stripe } from '../../stripe'
import { getAnnualBillingAnchor, getQuarterlyBillingAnchor } from '../../utils/date.utils'

const ANNUAL_PRICE_ID = process.env.STRIPE_ANNUAL_PRICE_ID!
const QUARTERLY_PRICE_ID = process.env.STRIPE_QUARTERLY_PRICE_ID!

export async function createSubscription({ joinMonth, joinDay }: { joinMonth: number; joinDay: number }): Promise<{
  success: boolean
  clientSecret?: string
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  if (!joinMonth || !joinDay) {
    return { success: false, error: 'Join date is required' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        stripeCustomerId: true,
        hasAnnualSubscription: true,
        hasQuarterlySubscription: true
      }
    })

    if (!user) return { success: false, error: 'User not found' }
    if (user.hasAnnualSubscription && user.hasQuarterlySubscription) {
      return { success: false, error: 'Membership is already set up' }
    }

    // Create Stripe customer if needed
    let stripeCustomerId = user.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: user.name,
        email: user.email
      })
      stripeCustomerId = customer.id
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId }
      })
    }

    // Create a SetupIntent to save the card once
    // and attach it to both subscriptions
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session'
    })

    // Create both subscriptions with default_incomplete
    // They will use the saved payment method after card setup confirms
    await Promise.all([
      !user.hasAnnualSubscription
        ? stripe.subscriptions.create({
            customer: stripeCustomerId,
            items: [{ price: ANNUAL_PRICE_ID }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            billing_cycle_anchor: getAnnualBillingAnchor(joinMonth, joinDay),
            proration_behavior: 'none'
          })
        : Promise.resolve(null),

      !user.hasQuarterlySubscription
        ? stripe.subscriptions.create({
            customer: stripeCustomerId,
            items: [{ price: QUARTERLY_PRICE_ID }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            billing_cycle_anchor: getQuarterlyBillingAnchor(),
            proration_behavior: 'none'
          })
        : Promise.resolve(null)
    ])

    const clientSecret = setupIntent.client_secret

    if (!clientSecret) return { success: false, error: 'Failed to get setup client secret' }

    return { success: true, clientSecret }
  } catch (err) {
    console.error('[createSubscription]', err)
    return { success: false, error: 'Failed to create subscription. Please try again.' }
  }
}
