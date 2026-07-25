'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth/auth'
import { stripe } from '../../stripe/stripe'
import Stripe from 'stripe'
import { createLog } from '../../utils/api/createLog'
import { getQuarterlyBillingAnchor } from '../../utils/billing.utils'

const ANNUAL_PRICE_ID = process.env.STRIPE_ANNUAL_PRICE_ID!
const QUARTERLY_PRICE_ID = process.env.STRIPE_QUARTERLY_PRICE_ID!

export async function createOnboardingSubscriptions(): Promise<{
  success: boolean
  clientSecret?: string
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
        email: true,
        stripeCustomerId: true,
        hasAnnualSubscription: true,
        hasQuarterlySubscription: true
      }
    })

    if (!user) return { success: false, error: 'User not found' }
    if (user.hasAnnualSubscription || user.hasQuarterlySubscription) {
      await createLog('info', 'Onboarding attempted by user with existing membership', {
        action: 'ONBOARDING_BLOCKED',
        userId: user.id,
        hasAnnual: user.hasAnnualSubscription,
        hasQuarterly: user.hasQuarterlySubscription
      })
      return { success: false, error: 'Membership is already set up' }
    }

    // Create Stripe customer if needed
    let stripeCustomerId = user.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: user.name,
        email: user.email,
        metadata: { userId: user.id }
      })
      stripeCustomerId = customer.id
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId }
      })

      await createLog('info', `Created Stripe customer for ${user.name}`, {
        action: 'STRIPE_CUSTOMER_CREATED',
        userId: user.id,
        stripeCustomerId
      })
    }

    // Annual sub — charges $365 immediately, anchors next renewal to 1 year from today
    const annualSubscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: ANNUAL_PRICE_ID }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card']
      },
      expand: ['latest_invoice.confirmation_secret'],
      metadata: {
        userId: user.id,
        flow: 'ONBOARDING'
      }
    })

    // Quarterly sub — anchored to next quarter, no charge today
    const quarterlySubscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: QUARTERLY_PRICE_ID }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card']
      },
      billing_cycle_anchor: getQuarterlyBillingAnchor(),
      proration_behavior: 'none',
      metadata: {
        userId: user.id,
        flow: 'ONBOARDING'
      }
    })

    const latestInvoice = annualSubscription.latest_invoice as Stripe.Invoice & {
      confirmation_secret?: { client_secret: string; type: string }
    }
    const clientSecret = latestInvoice?.confirmation_secret?.client_secret

    if (!clientSecret) {
      console.error('No client_secret on invoice:', JSON.stringify(latestInvoice, null, 2))
      return { success: false, error: 'Failed to initialize payment.' }
    }

    await createLog('info', `${user.name} initiated onboarding`, {
      action: 'ONBOARDING_INITIATED',
      userId: user.id,
      annualSubId: annualSubscription.id,
      quarterlySubId: quarterlySubscription.id,
      stripeCustomerId
    })

    return { success: true, clientSecret }
  } catch (err) {
    await createLog('error', 'Onboarding subscription creation failed', {
      action: 'ONBOARDING_FAILED',
      userId: session.user.id,
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined
    })
    return { success: false, error: 'Failed to set up membership. Please try again.' }
  }
}
