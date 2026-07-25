'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useRouter } from 'next/navigation'
import { X, CreditCard, Lock } from 'lucide-react'
import { createSetupIntent } from '@/app/lib/actions/stripe/createSetupIntent'
import { updatePaymentMethod } from '@/app/lib/actions/stripe/updatePaymentMethod'
import { RootState, useAppSelector } from '@/app/lib/redux/store'
import { capitalize } from '@/app/lib/utils/string.utils'

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

interface EditCardModalProps {
  open: boolean
  onClose: () => void
  currentPaymentMethod: PaymentMethod | null
}

export function EditCardModal({ open, onClose, currentPaymentMethod }: EditCardModalProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const isDark = useAppSelector((state: RootState) => state.app.isDark)

  async function handleSubmit() {
    if (!stripe || !elements || status === 'loading') return

    setStatus('loading')
    setErrorMsg('')

    // Create a SetupIntent
    const res = await createSetupIntent()
    if (!res.success || !res.clientSecret) {
      setStatus('error')
      setErrorMsg(res.error ?? 'Something went wrong.')
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return

    // Confirm the new card
    const { error, setupIntent } = await stripe.confirmCardSetup(res.clientSecret, {
      payment_method: { card: cardElement }
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message ?? 'Card setup failed.')
      return
    }

    const newPaymentMethodId =
      typeof setupIntent?.payment_method === 'string' ? setupIntent.payment_method : setupIntent?.payment_method?.id

    if (!newPaymentMethodId) {
      setStatus('error')
      setErrorMsg('Failed to get payment method.')
      return
    }

    // Swap the card
    const updateRes = await updatePaymentMethod(newPaymentMethodId)
    if (!updateRes.success) {
      setStatus('error')
      setErrorMsg(updateRes.error ?? 'Failed to update card.')
      return
    }

    setStatus('success')
    setTimeout(() => {
      onClose()
      router.refresh()
    }, 1500)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
          />
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-x-0 bottom-0 z-50 flex justify-center"
          >
            <div
              className="w-full max-w-170 bg-bg-light dark:bg-surface-dark border-t-[3px] border-t-primary-light dark:border-t-primary-dark px-5 pt-6"
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-f10 font-mono tracking-widest uppercase text-primary-light dark:text-primary-dark mb-1">
                    Payment Method
                  </p>
                  <h2 className="font-sora font-black text-[22px] text-text-light dark:text-text-dark tracking-tight leading-none">
                    Update Card
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="mt-0.5 p-1 text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Current card */}
              {currentPaymentMethod && (
                <div className="flex items-center gap-3 px-3.5 py-3 border border-border-light dark:border-border-dark bg-surface-light dark:bg-bg-dark mb-4">
                  <CreditCard size={13} className="text-muted-light dark:text-muted-dark shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-[13px] font-sora font-semibold text-text-light dark:text-text-dark leading-tight">
                      Current card
                    </p>
                    <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-0.5">
                      {capitalize(currentPaymentMethod.brand)} ending in {currentPaymentMethod.last4} · expires{' '}
                      {currentPaymentMethod.expMonth}/{currentPaymentMethod.expYear}
                    </p>
                  </div>
                </div>
              )}

              {/* New card */}
              <p className="text-f10 font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark mb-1.5">
                New Card
              </p>
              <div className="border border-slate-300 dark:border-border-dark bg-white dark:bg-bg-dark px-3.5 py-3.5 mb-1.5">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '14px',
                        fontFamily: 'Nunito, sans-serif',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        '::placeholder': { color: '#94a3b8' }
                      },
                      invalid: { color: '#ef4444' }
                    }
                  }}
                />
              </div>
              <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mb-4">
                Your new card will be saved and used for all future charges.
              </p>

              {/* Error */}
              <AnimatePresence>
                {status === 'error' && errorMsg && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[11px] font-mono text-red-500 dark:text-red-400 mb-3"
                  >
                    {errorMsg}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Success */}
              <AnimatePresence>
                {status === 'success' && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[11px] font-mono text-green-600 dark:text-green-400 mb-3"
                  >
                    Card updated successfully!
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!stripe || status === 'loading' || status === 'success'}
                className="w-full h-12 bg-primary-light dark:bg-primary-dark text-white font-sora font-bold text-[13px] tracking-wide flex items-center justify-center gap-2 hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark mb-3"
              >
                {status === 'loading' ? (
                  <>
                    <svg
                      className="animate-spin"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeOpacity="0.3" />
                      <path d="M21 12a9 9 0 0 1-9 9" />
                    </svg>
                    Updating…
                  </>
                ) : status === 'success' ? (
                  'Updated!'
                ) : (
                  <>
                    <Lock size={13} aria-hidden="true" />
                    Update Card
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                disabled={status === 'loading'}
                className="w-full h-10 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark font-nunito text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
