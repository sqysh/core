import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { RootState, useAppSelector } from '@/app/lib/redux/store'
import { useSounds } from '@/app/lib/hooks/useSounds'
import { finalizeMembership } from '@/app/lib/actions/membership/finalizeMembership'
import { startMembershipSetup } from '@/app/lib/actions/membership/startMembershipSetup'

interface MembershipSetupFormProps {
  onClose: () => void
  joinMonth: string
  setJoinMonth: (v: string) => void
  joinDay: string
  setJoinDay: (v: string) => void
}

export function MembershipSetupForm({
  onClose,
  joinMonth,
  setJoinMonth,
  joinDay,
  setJoinDay
}: MembershipSetupFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const isDark = useAppSelector((state: RootState) => state.app.isDark)
  const { play } = useSounds({ enabled: true })

  const daysInMonth = (() => {
    if (!joinMonth) return 31
    const month = parseInt(joinMonth)
    // Use a non-leap year to keep Feb at 28 — annual renewals on Feb 29 are a footgun anyway
    return new Date(2025, month, 0).getDate()
  })()

  const inputCls =
    'h-10 bg-white dark:bg-bg-dark border border-slate-300 dark:border-border-dark px-3 font-nunito text-[13px] text-text-light dark:text-text-dark placeholder:text-slate-400 dark:placeholder:text-muted-dark/50 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark transition-colors rounded-none'

  const isValid = !!joinMonth && !!joinDay

  async function handleSubmit() {
    if (!stripe || !elements || status === 'loading' || !isValid) return

    setStatus('loading')
    setErrorMsg('')

    // 1. Create customer + SetupIntent (NO subscriptions yet)
    const setupRes = await startMembershipSetup()
    if (!setupRes.success || !setupRes.clientSecret) {
      setStatus('error')
      setErrorMsg(setupRes.error ?? 'Something went wrong.')
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setStatus('error')
      setErrorMsg('Card field not found.')
      return
    }

    // 2. Confirm the card — saves it to the customer
    const { error, setupIntent } = await stripe.confirmCardSetup(setupRes.clientSecret, {
      payment_method: { card: cardElement }
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message ?? 'Card setup failed.')
      return
    }

    const paymentMethodId =
      typeof setupIntent?.payment_method === 'string' ? setupIntent.payment_method : setupIntent?.payment_method?.id

    if (!paymentMethodId) {
      setStatus('error')
      setErrorMsg('Card did not save correctly. Please try again.')
      return
    }

    console.log('[membership] setupIntent result', {
      status: setupIntent?.status,
      paymentMethod: paymentMethodId, // ← extracted correctly?
      error: error?.message
    })

    // 3. NOW create the subscriptions with the confirmed card as default
    const finalizeRes = await finalizeMembership({
      paymentMethodId,
      joinMonth: parseInt(joinMonth),
      joinDay: parseInt(joinDay)
    })

    if (!finalizeRes.success) {
      setStatus('error')
      setErrorMsg(finalizeRes.error ?? 'Failed to finish setup.')
      return
    }

    setStatus('success')
    play('se11')
    setTimeout(() => {
      onClose()
      router.refresh()
    }, 2000)
  }

  const handleMonthChange = (value: string) => {
    setJoinMonth(value)
    const max = new Date(2025, parseInt(value), 0).getDate()
    if (joinDay && parseInt(joinDay) > max) setJoinDay('')
  }

  return (
    <div>
      {/* Join date */}
      <div className="mb-4">
        <label className="block text-f10 font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark mb-1.5">
          Your Original Join Date
        </label>
        <div className="flex gap-2">
          <select
            value={joinMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            aria-label="Join month"
            className={`flex-1 ${inputCls} appearance-none cursor-pointer`}
          >
            <option value="" disabled>
              Month
            </option>
            {[
              'January',
              'February',
              'March',
              'April',
              'May',
              'June',
              'July',
              'August',
              'September',
              'October',
              'November',
              'December'
            ].map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={joinDay}
            onChange={(e) => setJoinDay(e.target.value)}
            aria-label="Join day"
            className={`w-24 ${inputCls} appearance-none cursor-pointer`}
          >
            <option value="" disabled>
              Day
            </option>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-1.5">
          No charge today — your card is just being saved for automatic renewals.
        </p>
      </div>

      {/* Card element */}
      <div className="border border-slate-300 dark:border-border-dark bg-white dark:bg-bg-dark px-3.5 py-3.5 mb-4">
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
        Your card will be saved securely for automatic renewal charges.
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
            Card saved — you're all set!
          </motion.p>
        )}
      </AnimatePresence>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!stripe || !isValid || status === 'loading' || status === 'success'}
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
            Saving…
          </>
        ) : status === 'success' ? (
          'Saved!'
        ) : (
          <>
            <Lock size={13} aria-hidden="true" />
            Save Card
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
  )
}
