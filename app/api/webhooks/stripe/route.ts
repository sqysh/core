import { chapterId } from '@/app/lib/constants/api/chapterId'
import { ANNUAL_PRICE_ID, QUARTERLY_PRICE_ID, statusMap, WEBHOOK_SECRET } from '@/app/lib/constants/stripe.constants'
import { pusher } from '@/app/lib/pusher/pusher'
import { stripe } from '@/app/lib/stripe'
import { createLog } from '@/app/lib/utils/api/createLog'
import prisma from '@/prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
  } catch (error) {
    console.log('WEBHOOK ERROR:', error instanceof Error ? error.message : error)

    await createLog('error', 'Webhook signature verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type as string) {
      case 'customer.subscription.created': {
        const newSub = event.data.object as Stripe.Subscription
        const fullSub = await stripe.subscriptions.retrieve(newSub.id)
        if (fullSub.status === 'active') {
          await handleSubscriptionCreated(fullSub)
        }
        break
      }

      case 'customer.subscription.updated': {
        const updatedSub = event.data.object as Stripe.Subscription
        const statusesToHandle = ['active', 'past_due', 'canceled', 'unpaid', 'incomplete']
        if (statusesToHandle.includes(updatedSub.status)) {
          await handleSubscriptionUpdated(updatedSub)
        }
        break
      }

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod)
        break

      case 'payment_method.detached':
        await handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod)
        break

      case 'payment_method.updated':
        await handlePaymentMethodUpdated(event.data.object as Stripe.PaymentMethod)
        break

      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent
        const type = intent.metadata?.type

        if (type === 'ATTENDANCE_CORRECTION') {
          await handleAttendanceCorrectionPayment(intent)
        }

        break
      }

      default:
        await createLog('info', 'Unhandled webhook event', {
          eventType: event.type,
          eventId: event.id
        })
        break
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    await createLog('error', 'Webhook handler failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

export async function handleSubscriptionCreated(sub: Stripe.Subscription) {
  const stripeCustomerId = sub.customer as string
  const priceId = sub.items.data[0]?.price?.id

  if (!priceId) {
    await createLog('error', 'handleSubscriptionCreated — no priceId on subscription', {
      subId: sub.id,
      stripeCustomerId
    })
    return
  }

  const isAnnual = priceId === ANNUAL_PRICE_ID
  const isQuarterly = priceId === QUARTERLY_PRICE_ID

  if (!isAnnual && !isQuarterly) {
    await createLog('info', 'handleSubscriptionCreated — unrecognized priceId, skipping', {
      subId: sub.id,
      priceId
    })
    return
  }

  // Idempotency guard — webhook events can fire multiple times for the same subscription
  // (retries, manual replays, network issues), so skip if we've already created an Order
  const existingOrder = await prisma.order.findFirst({
    where: { stripeSubId: sub.id }
  })

  if (existingOrder) {
    await createLog('info', 'handleSubscriptionCreated — order already exists, skipping', {
      subId: sub.id,
      orderId: existingOrder.id
    })
    return
  }

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId },
    select: { id: true, name: true, email: true }
  })

  if (!user) {
    await createLog('error', 'handleSubscriptionCreated — no user found for stripeCustomerId', {
      subId: sub.id,
      stripeCustomerId
    })
    return
  }

  const type = isAnnual ? 'ANNUAL' : 'QUARTERLY'
  const amount = (sub.items.data[0]?.price?.unit_amount ?? 0) / 100

  const billingAnchor = sub.billing_cycle_anchor ? new Date(sub.billing_cycle_anchor * 1000) : null

  await Promise.all([
    prisma.order.create({
      data: {
        userId: user.id,
        chapterId,
        type,
        status: 'SCHEDULED',
        amount,
        stripeCustomerId,
        stripeSubId: sub.id,
        stripePriceId: priceId,
        currentPeriodStart: null,
        currentPeriodEnd: billingAnchor
      }
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        membershipStatus: 'ACTIVE',
        ...(isAnnual
          ? { hasAnnualSubscription: true, annualSubscriptionId: sub.id }
          : { hasQuarterlySubscription: true, quarterlySubscriptionId: sub.id })
      }
    })
  ])

  await createLog('info', `${user.name} started ${type.toLowerCase()} subscription`, {
    action: 'SUBSCRIPTION_CREATED',
    userId: user.id,
    subId: sub.id,
    priceId,
    amount,
    type,
    status: sub.status
  })

  await pusher.trigger(`user-${user.id}`, 'subscription-confirmed', {
    type,
    amount,
    subId: sub.id
  })
}

export async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const stripeCustomerId = sub.customer as string
  const newStatus = statusMap[sub.status]

  if (!newStatus) {
    await createLog('info', 'handleSubscriptionUpdated — unhandled status, skipping', {
      subId: sub.id,
      status: sub.status
    })
    return
  }

  const order = await prisma.order.findFirst({
    where: { stripeSubId: sub.id },
    select: {
      id: true,
      status: true,
      type: true,
      userId: true,
      cancelledAt: true,
      user: { select: { name: true } }
    }
  })

  if (!order) {
    if (sub.status === 'active') {
      await createLog('info', 'handleSubscriptionUpdated — no order yet, treating as creation', {
        subId: sub.id,
        stripeCustomerId
      })
      await handleSubscriptionCreated(sub)
      return
    }

    await createLog('error', 'handleSubscriptionUpdated — no order found for subscription', {
      subId: sub.id,
      stripeCustomerId,
      status: sub.status
    })
    return
  }

  // ── Detect cancel_at_period_end transition ─────────────────────────
  // When the user clicks cancel, Stripe sends an `updated` event with
  // status still 'active' but cancel_at_period_end = true. Capture that
  // moment for audit/UI purposes.
  const isPendingCancellation = sub.cancel_at_period_end === true && !order.cancelledAt

  if (isPendingCancellation) {
    await prisma.order.update({
      where: { id: order.id },
      data: { cancelledAt: new Date() }
    })

    await createLog('info', `${order.user.name} scheduled subscription cancellation at period end`, {
      action: 'SUBSCRIPTION_CANCEL_SCHEDULED',
      userId: order.userId,
      subId: sub.id,
      type: order.type,
      cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null
    })

    // If the Order status hasn't changed, we're done — don't fall through
    if (order.status === newStatus) return
  }

  // No status change — skip
  if (order.status === newStatus) return

  const isTerminated = sub.status === 'canceled' || sub.status === 'unpaid'

  await Promise.all([
    prisma.order.update({
      where: { id: order.id },
      data: {
        status: newStatus as any,
        ...(isTerminated && !order.cancelledAt ? { cancelledAt: new Date() } : {})
      }
    }),

    isTerminated
      ? prisma.user.update({
          where: { id: order.userId },
          data: {
            ...(order.type === 'ANNUAL'
              ? { hasAnnualSubscription: false, annualSubscriptionId: null }
              : { hasQuarterlySubscription: false, quarterlySubscriptionId: null })
          }
        })
      : Promise.resolve()
  ])

  await createLog('info', `${order.user.name} subscription updated to ${newStatus}`, {
    action: 'SUBSCRIPTION_UPDATED',
    userId: order.userId,
    subId: sub.id,
    previousStatus: order.status,
    newStatus,
    type: order.type
  })
}

export async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const stripeCustomerId = sub.customer as string

  const order = await prisma.order.findFirst({
    where: { stripeSubId: sub.id },
    select: { id: true, type: true, userId: true, user: { select: { name: true } }, cancelledAt: true }
  })

  if (!order) {
    await createLog('error', 'handleSubscriptionDeleted — no order found for subscription', {
      subId: sub.id,
      stripeCustomerId
    })
    return
  }

  await Promise.all([
    prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        ...(order.cancelledAt ? {} : { cancelledAt: new Date() })
      }
    }),

    prisma.user.update({
      where: { id: order.userId },
      data: {
        ...(order.type === 'ANNUAL'
          ? { hasAnnualSubscription: false, annualSubscriptionId: null }
          : { hasQuarterlySubscription: false, quarterlySubscriptionId: null })
      }
    })
  ])

  await createLog('info', `${order.user.name} ${order.type.toLowerCase()} subscription cancelled`, {
    action: 'SUBSCRIPTION_DELETED',
    userId: order.userId,
    subId: sub.id,
    type: order.type
  })
}

export async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const inv = invoice as any
  const subId = inv.parent?.subscription_details?.subscription ?? inv.subscription ?? null

  // Not a subscription invoice — skip
  if (!subId) return

  const order = await prisma.order.findFirst({
    where: { stripeSubId: subId },
    select: { id: true, type: true, userId: true, user: { select: { name: true } } }
  })

  // ── Card propagation — runs even if the order row isn't created yet ──
  // (invoice.payment_succeeded can arrive before customer.subscription.created)
  // We detect "annual" from the invoice's price, not the order, so a webhook
  // race can't skip it.
  const priceId = inv.lines?.data?.[0]?.price?.id ?? inv.lines?.data?.[0]?.pricing?.price_details?.price
  if (priceId === ANNUAL_PRICE_ID) {
    try {
      const customerId = inv.customer as string
      const pms = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 })
      const pmId = pms.data[0]?.id ?? null

      await createLog('info', 'card propagation check', {
        action: 'CARD_PROPAGATION_CHECK',
        customerId,
        pmId,
        hadOrder: !!order
      })

      if (customerId && pmId) {
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: pmId }
        })
        const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10 })
        for (const sub of subs.data) {
          if (!sub.default_payment_method) {
            await stripe.subscriptions.update(sub.id, { default_payment_method: pmId })
          }
        }
        await createLog('info', 'card propagated', { action: 'CARD_PROPAGATED', customerId, pmId })
      }
    } catch (err) {
      await createLog('error', 'Card propagation failed', {
        action: 'CARD_PROPAGATION_FAILED',
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }

  if (!order) return // order not created yet (webhook race); subscription.created will handle it

  const lineItem = invoice.lines.data[0] as any
  const currentPeriodStart = lineItem?.period?.start ? new Date(lineItem.period.start * 1000) : null
  const currentPeriodEnd = lineItem?.period?.end ? new Date(lineItem.period.end * 1000) : null

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'ACTIVE',
      currentPeriodStart,
      currentPeriodEnd,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdfUrl: invoice.invoice_pdf,
      invoiceNumber: invoice.number
    }
  })

  await createLog('info', `${order.user.name} ${order.type.toLowerCase()} payment succeeded`, {
    action: 'INVOICE_PAYMENT_SUCCEEDED',
    userId: order.userId,
    subId,
    invoiceId: invoice.id,
    amount: (invoice.amount_paid / 100).toFixed(2),
    periodEnd: currentPeriodEnd
  })

  // ── Propagate the card so the quarterly can charge on its billing date ──
  // Onboarding pays the annual on-session; the quarterly is anchored forward
  // with no card. When the ANNUAL invoice succeeds, set the customer default so
  // the quarterly (which charges "default payment method") can collect later.
  // Fully guarded so a lookup failure can never crash the webhook.
  if (order.type === 'ANNUAL') {
    try {
      const customerId = inv.customer as string
      let pmId: string | null = null

      // Simplest reliable source: the card was just attached to the customer
      // during onboarding, so the newest card on the customer is the right one.
      const pms = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
        limit: 1
      })
      pmId = pms.data[0]?.id ?? null

      await createLog('info', 'card propagation check', {
        action: 'CARD_PROPAGATION_CHECK',
        userId: order.userId,
        customerId,
        pmId
      })

      if (customerId && pmId) {
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: pmId }
        })

        const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10 })
        for (const sub of subs.data) {
          if (!sub.default_payment_method) {
            await stripe.subscriptions.update(sub.id, { default_payment_method: pmId })
          }
        }

        await createLog('info', `${order.user.name} card propagated`, {
          action: 'CARD_PROPAGATED',
          userId: order.userId,
          customerId,
          pmId
        })
      }
    } catch (err) {
      // Never let propagation crash the handler — the payment already succeeded.
      await createLog('error', 'Card propagation failed', {
        action: 'CARD_PROPAGATION_FAILED',
        userId: order.userId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      })
    }
  }
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const inv = invoice as any
  const subId = inv.parent?.subscription_details?.subscription ?? inv.subscription ?? null

  if (!subId) return

  const order = await prisma.order.findFirst({
    where: { stripeSubId: subId },
    select: { id: true, type: true, userId: true, user: { select: { name: true } } }
  })

  if (!order) {
    await createLog('error', 'handleInvoicePaymentFailed — no order found for subscription', {
      subId,
      invoiceId: invoice.id
    })
    return
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'PAST_DUE' }
  })

  await createLog('error', `${order.user.name} ${order.type.toLowerCase()} payment failed`, {
    action: 'INVOICE_PAYMENT_FAILED',
    userId: order.userId,
    subId,
    invoiceId: invoice.id,
    amount: (invoice.amount_due / 100).toFixed(2)
  })
}

export async function handlePaymentMethodAttached(pm: Stripe.PaymentMethod) {
  const stripeCustomerId = pm.customer as string

  if (!stripeCustomerId || !pm.card) return

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId },
    select: { id: true, name: true }
  })

  if (!user) {
    await createLog('error', 'handlePaymentMethodAttached — no user found for stripeCustomerId', {
      stripeCustomerId,
      paymentMethodId: pm.id
    })
    return
  }

  // If this is the first payment method, mark it as default
  const existingCount = await prisma.paymentMethod.count({
    where: { userId: user.id }
  })

  await prisma.paymentMethod.create({
    data: {
      userId: user.id,
      stripePaymentMethodId: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
      isDefault: existingCount === 0
    }
  })

  await createLog('info', `${user.name} added a payment method`, {
    action: 'PAYMENT_METHOD_ATTACHED',
    userId: user.id,
    paymentMethodId: pm.id,
    brand: pm.card.brand,
    last4: pm.card.last4
  })
}

export async function handlePaymentMethodDetached(pm: Stripe.PaymentMethod) {
  const existing = await prisma.paymentMethod.findUnique({
    where: { stripePaymentMethodId: pm.id },
    select: { id: true, isDefault: true, userId: true, user: { select: { name: true } } }
  })

  if (!existing) return

  await prisma.paymentMethod.delete({
    where: { id: existing.id }
  })

  // If it was the default, promote the next available card
  if (existing.isDefault) {
    const next = await prisma.paymentMethod.findFirst({
      where: { userId: existing.userId },
      orderBy: { createdAt: 'asc' }
    })
    if (next) {
      await prisma.paymentMethod.update({
        where: { id: next.id },
        data: { isDefault: true }
      })
    }
  }

  await createLog('info', `${existing.user.name} removed a payment method`, {
    action: 'PAYMENT_METHOD_DETACHED',
    userId: existing.userId,
    paymentMethodId: pm.id
  })
}

export async function handlePaymentMethodUpdated(pm: Stripe.PaymentMethod) {
  if (!pm.card) return

  const existing = await prisma.paymentMethod.findUnique({
    where: { stripePaymentMethodId: pm.id },
    select: { id: true, userId: true, user: { select: { name: true } } }
  })

  if (!existing) return

  await prisma.paymentMethod.update({
    where: { id: existing.id },
    data: {
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year
    }
  })

  await createLog('info', `${existing.user.name} updated a payment method`, {
    action: 'PAYMENT_METHOD_UPDATED',
    userId: existing.userId,
    paymentMethodId: pm.id,
    brand: pm.card.brand,
    last4: pm.card.last4
  })
}

export async function handleAttendanceCorrectionPayment(intent: Stripe.PaymentIntent) {
  const { meetingId, userId, userName, tipSqysh } = intent.metadata

  if (!meetingId || !userId) {
    await createLog('error', 'handleAttendanceCorrectionPayment — missing metadata', {
      paymentIntentId: intent.id
    })
    return
  }

  const amount = intent.amount / 100 // $150 or $200

  const [order] = await Promise.all([
    // Create order record
    prisma.order.create({
      data: {
        userId,
        chapterId,
        type: 'ATTENDANCE_CORRECTION',
        status: 'ACTIVE',
        amount,
        stripeCustomerId: intent.customer as string,
        stripeSubId: null,
        stripePriceId: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        meetingId
      }
    }),

    // Reinstate attendance
    prisma.attendance.upsert({
      where: { meetingId_userId: { meetingId, userId } },
      create: { meetingId, userId },
      update: {}
    })
  ])

  // Grab the receipt URL from the expanded charge
  try {
    const expandedIntent = await stripe.paymentIntents.retrieve(intent.id, {
      expand: ['latest_charge']
    })

    const charge = expandedIntent.latest_charge as Stripe.Charge | null
    if (charge?.receipt_url) {
      await prisma.order.update({
        where: { id: order.id },
        data: { hostedInvoiceUrl: charge.receipt_url }
      })
    }
  } catch (err) {
    // Don't fail the webhook if receipt URL retrieval fails
    await createLog('error', 'Could not retrieve receipt URL for attendance correction', {
      orderId: order.id,
      paymentIntentId: intent.id,
      error: err instanceof Error ? err.message : 'Unknown error'
    })
  }

  await createLog('info', `${userName} attendance reinstated via correction payment`, {
    action: 'ATTENDANCE_REINSTATED_WEBHOOK',
    meetingId,
    userId,
    paymentIntentId: intent.id,
    amount,
    tipSqysh: tipSqysh === 'true'
  })
}
