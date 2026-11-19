'use client'

import { Elements } from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe/stripe-client'

export function StripeProvider({ children }: { children: React.ReactNode }) {
  return <Elements stripe={getStripe()}>{children}</Elements>
}
