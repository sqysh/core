'use server'

import { auth } from '@/app/lib/auth/auth'
import prisma from '@/prisma/client'
import { stripe } from '../../stripe/stripe'
import { createLog } from '../../utils/api/createLog'

export type CancelErrorCode =
  | 'UNAUTHORIZED'
  | 'USER_NOT_FOUND'
  | 'NO_ACTIVE_SUBSCRIPTIONS'
  | 'STRIPE_FAILED'
  | 'PARTIAL_CANCELLATION'
  | 'INTERNAL_ERROR'

export type CancelResult = {
  success: boolean
  error?: string
  code?: CancelErrorCode
}

const SUPPORT_LINE = 'If this keeps happening, contact support at greg@sqysh.com.'

export async function cancelSubscriptions(): Promise<CancelResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return {
      success: false,
      code: 'UNAUTHORIZED',
      error: "You're no longer signed in. Please sign back in — your membership has not been changed."
    }
  }

  const userId = session.user.id

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        membershipStatus: true,
        annualSubscriptionId: true,
        quarterlySubscriptionId: true
      }
    })

    if (!user) {
      await createLog('error', `Cancellation attempted but user record not found`, {
        action: 'CANCEL_SUBSCRIPTIONS_USER_NOT_FOUND',
        userId
      }).catch(() => null)

      return {
        success: false,
        code: 'USER_NOT_FOUND',
        error: `We couldn't find your account. ${SUPPORT_LINE}`
      }
    }

    // Idempotency: if already cancelled, treat as success.
    if (user.membershipStatus === 'CANCELLED') {
      return { success: true }
    }

    if (!user.annualSubscriptionId && !user.quarterlySubscriptionId) {
      return {
        success: false,
        code: 'NO_ACTIVE_SUBSCRIPTIONS',
        error: `There's no active subscription on your account to cancel. ${SUPPORT_LINE}`
      }
    }

    let annualOk = !user.annualSubscriptionId
    let quarterlyOk = !user.quarterlySubscriptionId
    let annualError: string | null = null
    let quarterlyError: string | null = null

    if (user.annualSubscriptionId) {
      try {
        await stripe.subscriptions.update(user.annualSubscriptionId, {
          cancel_at_period_end: true,
          metadata: { cancelled_by_user: 'true', cancelled_at: new Date().toISOString() }
        })
        annualOk = true
      } catch (err) {
        annualError = err instanceof Error ? err.message : String(err)
        console.error('[cancelSubscriptions] annual failed:', err)
      }
    }

    if (user.quarterlySubscriptionId) {
      try {
        await stripe.subscriptions.update(user.quarterlySubscriptionId, {
          cancel_at_period_end: true,
          metadata: { cancelled_by_user: 'true', cancelled_at: new Date().toISOString() }
        })
        quarterlyOk = true
      } catch (err) {
        quarterlyError = err instanceof Error ? err.message : String(err)
        console.error('[cancelSubscriptions] quarterly failed:', err)
      }
    }

    if (!annualOk && !quarterlyOk) {
      await createLog('error', `${user.name} attempted to cancel but Stripe rejected both subscriptions`, {
        action: 'CANCEL_SUBSCRIPTIONS_STRIPE_FAILED',
        userId: user.id,
        annualSubscriptionId: user.annualSubscriptionId,
        quarterlySubscriptionId: user.quarterlySubscriptionId,
        annualError,
        quarterlyError
      }).catch(() => null)

      return {
        success: false,
        code: 'STRIPE_FAILED',
        error: `We couldn't reach Stripe to cancel your subscriptions. Your membership has not been changed and you won't be charged extra. Please try again in a moment. ${SUPPORT_LINE}`
      }
    }

    if (!annualOk || !quarterlyOk) {
      const failedType = !annualOk ? 'annual admission' : 'quarterly room dues'

      await createLog('error', `${user.name} cancelled with partial failure — ${failedType} not cancelled`, {
        action: 'CANCEL_SUBSCRIPTIONS_PARTIAL',
        userId: user.id,
        annualSubscriptionId: user.annualSubscriptionId,
        quarterlySubscriptionId: user.quarterlySubscriptionId,
        annualOk,
        quarterlyOk,
        annualError,
        quarterlyError
      }).catch(() => null)

      return {
        success: false,
        code: 'PARTIAL_CANCELLATION',
        error: `We cancelled part of your membership, but the ${failedType} subscription couldn't be cancelled. Please don't click cancel again — contact support so we can finish it for you safely. ${SUPPORT_LINE}`
      }
    }

    const paymentMethod = await prisma.paymentMethod
      .findFirst({
        where: { userId: user.id },
        select: { stripePaymentMethodId: true }
      })
      .catch(() => null)

    if (paymentMethod) {
      try {
        await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId)
      } catch (err) {
        console.error('[cancelSubscriptions] stripe detach failed:', err)
        await createLog('warn', `Failed to detach payment method from Stripe for ${user.name}`, {
          action: 'CANCEL_SUBSCRIPTIONS_DETACH_FAILED',
          userId: user.id,
          stripePaymentMethodId: paymentMethod.stripePaymentMethodId,
          error: err instanceof Error ? err.message : String(err)
        }).catch(() => null)
      }

      await prisma.paymentMethod
        .delete({ where: { stripePaymentMethodId: paymentMethod.stripePaymentMethodId } })
        .catch((err) => console.error('[cancelSubscriptions] db delete failed:', err))
    }

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          membershipStatus: 'CANCELLED',
          hasAnnualSubscription: false,
          hasQuarterlySubscription: false,
          annualSubscriptionId: null,
          quarterlySubscriptionId: null
        }
      })
    } catch (err) {
      console.error('[cancelSubscriptions] user update failed:', err)

      await createLog('error', `${user.name}'s Stripe subscriptions cancelled but DB user update failed`, {
        action: 'CANCEL_SUBSCRIPTIONS_DB_UPDATE_FAILED',
        userId: user.id,
        error: err instanceof Error ? err.message : String(err)
      }).catch(() => null)

      return {
        success: false,
        code: 'INTERNAL_ERROR',
        error: `Your subscriptions were cancelled in Stripe — you won't be billed again — but we couldn't update our records. Please refresh the page in a moment. ${SUPPORT_LINE}`
      }
    }

    await createLog('info', `${user.name} cancelled their subscriptions`, {
      action: 'CANCEL_SUBSCRIPTIONS',
      userId: user.id,
      annualSubscriptionId: user.annualSubscriptionId,
      quarterlySubscriptionId: user.quarterlySubscriptionId
    }).catch(() => null)

    return { success: true }
  } catch (err) {
    console.error('[cancelSubscriptions] unexpected error:', err)

    await createLog('error', `Unexpected error cancelling subscriptions`, {
      action: 'CANCEL_SUBSCRIPTIONS_UNEXPECTED',
      userId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    }).catch(() => null)

    return {
      success: false,
      code: 'INTERNAL_ERROR',
      error: `Something unexpected went wrong. Your membership status is uncertain — please contact support so we can verify it's correct. ${SUPPORT_LINE}`
    }
  }
}
