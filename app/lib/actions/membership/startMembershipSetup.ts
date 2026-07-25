'use server'

// STEP 1 of the corrected onboarding flow.
//
// Creates (or reuses) the Stripe customer and a SetupIntent, then returns the
// SetupIntent client_secret. NO subscriptions are created here — the card must
// exist and be confirmed BEFORE any subscription/invoice is created, otherwise
// invoices are born with default_payment_method: null and fail (the bug).
//
// Flow:
//   1. startMembershipSetup()  → SetupIntent client_secret
//   2. client confirmCardSetup → card saved, returns payment_method id
//   3. finalizeMembership({ paymentMethodId, joinMonth, joinDay })
//      → subscriptions created WITH that card as default_payment_method

import prisma from '@/prisma/client'
import { auth } from '../../auth/auth'
import { stripe } from '../../stripe/stripe'
import { createLog } from '../../utils/api/createLog'

export async function startMembershipSetup(): Promise<{
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
    if (user.hasAnnualSubscription && user.hasQuarterlySubscription) {
      return { success: false, error: 'Membership is already set up' }
    }

    // Reuse the existing customer or create one — single source of truth so the
    // card and the subscriptions always land on the SAME customer.
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

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session', // we charge them automatically each cycle
      metadata: { userId: user.id, flow: 'ONBOARDING' }
    })

    if (!setupIntent.client_secret) {
      await createLog('error', 'startMembershipSetup — no client_secret on SetupIntent', {
        userId: user.id,
        stripeCustomerId
      })
      return { success: false, error: 'Failed to initialize card setup.' }
    }

    return { success: true, clientSecret: setupIntent.client_secret }
  } catch (err) {
    await createLog('error', 'startMembershipSetup failed', {
      action: 'MEMBERSHIP_SETUP_FAILED',
      userId: session.user.id,
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined
    })
    return { success: false, error: 'Failed to start setup. Please try again.' }
  }
}
