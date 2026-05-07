import { chapterId } from '@/app/lib/constants/api/chapterId'
import { pusher } from '@/app/lib/pusher'
import { stripe } from '@/app/lib/stripe'
import { createLog } from '@/app/lib/utils/api/createLog'
import prisma from '@/prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
const ANNUAL_PRICE_ID = process.env.STRIPE_ANNUAL_PRICE_ID!
const QUARTERLY_PRICE_ID = process.env.STRIPE_QUARTERLY_PRICE_ID!

const statusMap: Record<string, string> = {
  active: 'ACTIVE',
  past_due: 'PAST_DUE',
  canceled: 'CANCELLED',
  unpaid: 'PAST_DUE',
  incomplete: 'INCOMPLETE'
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  console.log('webhook secret:', process.env.STRIPE_WEBHOOK_SECRET?.slice(0, 10))
  console.log('signature:', req.headers.get('stripe-signature')?.slice(0, 20))

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
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

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId },
    select: { id: true, name: true }
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
  const item = sub.items.data[0]
  const currentPeriodStart = new Date((item as any).current_period_start * 1000)
  const currentPeriodEnd = new Date((item as any).current_period_end * 1000)

  await Promise.all([
    // Create order record
    prisma.order.create({
      data: {
        userId: user.id,
        chapterId: chapterId,
        type,
        status: 'ACTIVE',
        amount,
        stripeCustomerId,
        stripeSubId: sub.id,
        stripePriceId: priceId,
        currentPeriodStart,
        currentPeriodEnd
      }
    }),

    // Update user subscription flags
    prisma.user.update({
      where: { id: user.id },
      data: {
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
    type
  })

  await pusher.trigger(`user-${user.id}`, 'subscription-confirmed', {
    type,
    amount,
    subId: sub.id
  })
}

//  keeping Order.status in sync with whatever Stripe says the subscription status is
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
    select: { id: true, status: true, type: true, userId: true, user: { select: { name: true } } }
  })

  if (!order) {
    await createLog('error', 'handleSubscriptionUpdated — no order found for subscription', {
      subId: sub.id,
      stripeCustomerId
    })
    return
  }

  // No change — skip
  if (order.status === newStatus) return

  // If cancelled or unpaid, update user subscription flags
  const isTerminated = sub.status === 'canceled' || sub.status === 'unpaid'

  await Promise.all([
    prisma.order.update({
      where: { id: order.id },
      data: {
        status: newStatus as any,
        ...(isTerminated ? { cancelledAt: new Date() } : {})
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
    select: { id: true, type: true, userId: true, user: { select: { name: true } } }
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
      data: { status: 'CANCELLED', cancelledAt: new Date() }
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

  if (!order) {
    await createLog('error', 'handleInvoicePaymentSucceeded — no order found for subscription', {
      subId,
      invoiceId: invoice.id
    })
    return
  }

  const currentPeriodStart = invoice.period_start ? new Date(invoice.period_start * 1000) : null
  const currentPeriodEnd = invoice.period_end ? new Date(invoice.period_end * 1000) : null

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'ACTIVE',
      currentPeriodStart,
      currentPeriodEnd
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
