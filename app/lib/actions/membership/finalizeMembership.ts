'use server'

// STEP 3 of the corrected onboarding flow (step 2 is the client confirming the
// card). Runs AFTER the card is confirmed, receiving the confirmed
// paymentMethodId. Now that a card provably exists on the customer:
//
//   1. Set it as the customer's invoice_settings.default_payment_method
//      → every future invoice (quarterly renewals) has a card to charge.
//   2. Create each subscription WITH default_payment_method set
//      → the immediate annual invoice charges the right card; no null-method
//        invoices, no incomplete subscriptions.
//
// This is the fix for the invoice.payment_failed / default_payment_method:null
// bug: the card exists and is designated before any invoice is created.

import prisma from '@/prisma/client'
import { auth } from '../../auth/auth'
import { stripe } from '../../stripe/stripe'
import { createLog } from '../../utils/api/createLog'
import { getAnnualBillingAnchor, getQuarterlyBillingAnchor } from '../../utils/billing.utils'
import { ANNUAL_PRICE_ID, QUARTERLY_PRICE_ID } from '../../constants/member/stripe.constants'

export async function finalizeMembership({
  paymentMethodId,
  joinMonth,
  joinDay
}: {
  paymentMethodId: string
  joinMonth: number
  joinDay: number
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  if (!paymentMethodId) return { success: false, error: 'Missing payment method' }
  if (!joinMonth || !joinDay) return { success: false, error: 'Join date is required' }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        stripeCustomerId: true,
        hasAnnualSubscription: true,
        hasQuarterlySubscription: true
      }
    })

    if (!user) return { success: false, error: 'User not found' }
    if (!user.stripeCustomerId) {
      return { success: false, error: 'No Stripe customer — run setup first' }
    }
    if (user.hasAnnualSubscription && user.hasQuarterlySubscription) {
      return { success: false, error: 'Membership is already set up' }
    }

    const stripeCustomerId = user.stripeCustomerId

    await createLog('info', 'finalizeMembership received card', {
      action: 'FINALIZE_START',
      userId: user.id,
      paymentMethodId, // ← did the card make it here?
      stripeCustomerId
    })

    // Make the confirmed card the default for ALL future invoices on this
    // customer. This alone fixes future quarterly renewals.
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId }
    })

    // Create the subscriptions, each explicitly pointed at the card. Both use
    // billing_cycle_anchor, so each one charges on its correct anchor date, not
    // at signup. Setting default_payment_method here means that when an invoice
    // does come due (annual on its anchor, quarterly on its billing day), there
    // is a card on file to charge — instead of the invoice going Incomplete,
    // which is exactly what happened before this fix.
    const results: { annualSubId?: string; quarterlySubId?: string } = {}

    if (!user.hasAnnualSubscription) {
      const annual = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: ANNUAL_PRICE_ID }],
        default_payment_method: paymentMethodId,
        billing_cycle_anchor: getAnnualBillingAnchor(joinMonth, joinDay),
        proration_behavior: 'none',
        metadata: { userId: user.id, flow: 'ONBOARDING' }
      })
      results.annualSubId = annual.id

      await createLog('info', 'annual sub created', {
        action: 'SUB_CREATED',
        subId: annual.id,
        status: annual.status, // active? incomplete?
        defaultPm: annual.default_payment_method // ← is the card actually on it?
      })
    }

    if (!user.hasQuarterlySubscription) {
      const quarterly = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: QUARTERLY_PRICE_ID }],
        default_payment_method: paymentMethodId,
        billing_cycle_anchor: getQuarterlyBillingAnchor(),
        proration_behavior: 'none',
        metadata: { userId: user.id, flow: 'ONBOARDING' }
      })
      results.quarterlySubId = quarterly.id
    }

    await createLog('info', `${user.name} completed membership setup`, {
      action: 'MEMBERSHIP_FINALIZED',
      userId: user.id,
      stripeCustomerId,
      paymentMethodId,
      ...results
    })

    // Note: the customer.subscription.created webhook still creates the Order
    // rows + flips hasAnnual/hasQuarterly, exactly as it does today. This action
    // just guarantees the subscriptions are created WITH a chargeable card.

    return { success: true }
  } catch (err) {
    await createLog('error', 'finalizeMembership failed', {
      action: 'MEMBERSHIP_FINALIZE_FAILED',
      userId: session.user.id,
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined
    })
    return { success: false, error: 'Failed to finish membership setup. Please try again.' }
  }
}
