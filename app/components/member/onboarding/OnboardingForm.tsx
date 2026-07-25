'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { CreditCard, Lock, Loader2 } from 'lucide-react'
import { createOnboardingSubscriptions } from '@/app/lib/actions/stripe/createOnboardingSubscriptions'
import { useSession } from 'next-auth/react'
import { RootState, useAppSelector } from '@/app/lib/redux/store'
import { getPusherClient } from '@/app/lib/pusher/pusherClient'

export default function OnboardingForm() {
  const router = useRouter()
  const stripe = useStripe()
  const elements = useElements()
  const session = useSession()
  const userId = session.data?.user?.id

  const [isProcessing, setIsProcessing] = useState(false)
  const [cardComplete, setCardComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusText, setStatusText] = useState('Processing…')
  const isDark = useAppSelector((state: RootState) => state.app.isDark)

  const hasRouted = useRef(false)

  const setupPusherListener = () => {
    const pusher = getPusherClient()
    const channel = pusher.subscribe(`user-${userId}`)

    let annualConfirmed = false
    let quarterlyConfirmed = false

    const timeout = setTimeout(() => {
      if (!hasRouted.current) {
        hasRouted.current = true
        channel.unbind_all()
        pusher.unsubscribe(`user-${userId}`)
        router.push('/onboarding/welcome')
      }
    }, 15000)

    channel.bind('subscription-confirmed', (data: { type: 'ANNUAL' | 'QUARTERLY' }) => {
      if (data.type === 'ANNUAL') annualConfirmed = true
      if (data.type === 'QUARTERLY') quarterlyConfirmed = true

      if (annualConfirmed && quarterlyConfirmed && !hasRouted.current) {
        hasRouted.current = true
        clearTimeout(timeout)
        channel.unbind_all()
        router.push('/onboarding/welcome')
      }
    })
  }

  const handleSubmit = async () => {
    if (!stripe || !elements || !cardComplete || isProcessing) return

    setIsProcessing(true)
    setError(null)
    setStatusText('Processing…')

    try {
      const res = await createOnboardingSubscriptions()

      if (!res.success || !res.clientSecret) {
        setError(res.error || 'Could not start payment. Please try again.')
        setIsProcessing(false)
        return
      }

      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        setError('Card details are missing.')
        setIsProcessing(false)
        return
      }

      setupPusherListener()

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(res.clientSecret, {
        payment_method: { card: cardElement }
      })

      if (stripeError) {
        setError(stripeError.message || 'Payment failed. Please try again.')
        setIsProcessing(false)
        return
      }

      if (paymentIntent?.status !== 'succeeded') {
        setError('Payment did not complete. Please try again.')
        setIsProcessing(false)
        return
      }

      setStatusText('Finalizing membership…')
    } catch (err) {
      console.error('Membership payment error:', err)
      setError('Something went wrong. Please try again.')
      setIsProcessing(false)
    }
  }

  const isReady = stripe && elements && cardComplete && !isProcessing

  return (
    <>
      <p className="text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark mb-4">
        Payment Details
      </p>

      <div className="border border-slate-300 dark:border-border-dark bg-white dark:bg-bg-dark px-3.5 py-3.5 mb-5 flex items-center gap-3">
        <CreditCard size={16} className="text-muted-light dark:text-muted-dark shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '15px',
                  fontFamily: 'Nunito, sans-serif',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  '::placeholder': { color: '#94a3b8' },
                  iconColor: '#94a3b8'
                },
                invalid: {
                  color: '#ef4444',
                  iconColor: '#ef4444'
                }
              },
              hidePostalCode: false
            }}
            onChange={(event) => {
              setCardComplete(event.complete)
              if (event.error) {
                setError(event.error.message)
              } else {
                setError(null)
              }
            }}
          />
        </div>
      </div>

      {error && (
        <div className="border-l-2 border-rose-500 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 mb-4">
          <p className="text-[12.5px] font-nunito text-rose-700 dark:text-rose-300 leading-relaxed">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isReady}
        className={`w-full h-14 font-sora font-black text-[15px] tracking-wide flex items-center justify-center gap-2.5 transition-colors mb-4 ${
          isReady
            ? 'bg-primary-light dark:bg-button-dark text-white dark:text-primary-dark hover:bg-primary-light/90 dark:hover:bg-button-dark/80 cursor-pointer'
            : 'bg-primary-light/20 dark:bg-button-dark/30 text-primary-light/40 dark:text-primary-dark/30 cursor-not-allowed'
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            {statusText}
          </>
        ) : (
          <>
            <Lock size={15} aria-hidden="true" />
            Start Membership — $365
          </>
        )}
      </button>

      <p className="text-f10 font-mono text-muted-light dark:text-muted-dark text-center">
        Secured by Stripe · Card saved for automatic renewal
      </p>
    </>
  )
}
