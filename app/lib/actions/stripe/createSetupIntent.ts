'use server'

import { auth } from '@/app/lib/auth'
import prisma from '@/prisma/client'
import { stripe } from '../../stripe'

export async function createSetupIntent(): Promise<{
  success: boolean
  clientSecret?: string
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

    const setupIntent = await stripe.setupIntents.create({
      customer: user.stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session'
    })

    return { success: true, clientSecret: setupIntent.client_secret ?? undefined }
  } catch (err) {
    console.error('[createSetupIntent]', err)
    return { success: false, error: 'Failed to create setup intent.' }
  }
}
