'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useRouter } from 'next/navigation'
import { X, CreditCard, Lock, CheckCircle, Pencil } from 'lucide-react'
import { SectionLabel } from '../common/SectionLabel'
import { createSubscription } from '@/app/lib/actions/stripe/createSubscription'
import { fmtDate } from '@/app/lib/utils/date.utils'
import { capitalize } from '@/app/lib/utils/string.utils'
import { RootState, useAppSelector } from '@/app/lib/redux/store'
import { getStripe } from '@/app/lib/stripe-client'
import { EditCardModal } from '../modals/EditCardModal'
import { cancelSubscriptions } from '@/app/lib/actions/stripe/cancelSubscriptions'

interface Order {
  type: 'ANNUAL' | 'QUARTERLY'
  currentPeriodEnd: string | null
}

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  stripePaymentMethodId: string
}

interface MembershipSetupProps {
  membership: {
    annualOrder: Order | null
    quarterlyOrder: Order | null
    paymentMethod: PaymentMethod | null
  }
}

// ─── Card form ────────────────────────────────────────────────────────────────

function CardForm({ onClose }: { onClose: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [joinMonth, setJoinMonth] = useState('')
  const [joinDay, setJoinDay] = useState('')
  const isDark = useAppSelector((state: RootState) => state.app.isDark)

  const inputCls =
    'h-10 bg-white dark:bg-bg-dark border border-slate-300 dark:border-border-dark px-3 font-nunito text-[13px] text-text-light dark:text-text-dark placeholder:text-slate-400 dark:placeholder:text-muted-dark/50 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark transition-colors rounded-none'

  const isValid = !!joinMonth && !!joinDay

  async function handleSubmit() {
    if (!stripe || !elements || status === 'loading' || !isValid) return

    setStatus('loading')
    setErrorMsg('')

    const res = await createSubscription({
      joinMonth: parseInt(joinMonth),
      joinDay: parseInt(joinDay)
    })

    if (!res.success || !res.clientSecret) {
      setStatus('error')
      setErrorMsg(res.error ?? 'Something went wrong.')
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return

    const { error } = await stripe.confirmCardSetup(res.clientSecret, {
      payment_method: { card: cardElement }
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message ?? 'Card setup failed.')
      return
    }

    setStatus('success')
    setTimeout(() => {
      onClose()
      router.refresh()
    }, 1500)
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
            onChange={(e) => setJoinMonth(e.target.value)}
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
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-1.5">
          Used to set your annual renewal date. Room dues will begin next quarter.
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

// ─── Modal ────────────────────────────────────────────────────────────────────

function PaymentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
                    Membership Setup
                  </p>
                  <h2 className="font-sora font-black text-[22px] text-text-light dark:text-text-dark tracking-tight leading-none">
                    Room Dues + Annual Admission
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="mt-0.5 p-1 text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark rounded-sm"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Description */}
              <p className="text-[13px] font-nunito text-muted-light dark:text-muted-dark leading-relaxed mb-5">
                Enter your original join date and save your card. You won't be charged today — room dues begin next
                quarter and annual dues renew on your join anniversary.
              </p>

              {/* Card form */}
              <CardForm onClose={onClose} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Active membership card ───────────────────────────────────────────────────

function MembershipActive({
  membership,
  onEdit
}: {
  membership: MembershipSetupProps['membership']
  onEdit: () => void
}) {
  const { annualOrder, quarterlyOrder, paymentMethod } = membership
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelSubscriptions()
      if (res.success) {
        setConfirming(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="border border-border-light dark:border-border-dark">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle size={13} className="text-green-500 shrink-0" aria-hidden="true" />
          <p className="text-f10 font-mono tracking-widest uppercase text-green-600 dark:text-green-400">
            Membership Active
          </p>
        </div>
        <button
          onClick={onEdit}
          aria-label="Update payment method"
          className="flex items-center gap-1.5 h-7 px-3 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark hover:border-primary-light dark:hover:border-primary-dark transition-colors text-f10 font-mono tracking-widest uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
        >
          <Pencil size={10} aria-hidden="true" />
          Edit Card
        </button>
      </div>

      {/* Subscription rows */}
      <div className="divide-y divide-border-light dark:divide-border-dark">
        {annualOrder && (
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-sora font-semibold text-text-light dark:text-text-dark leading-tight">
                Annual Admission
              </p>
              <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-0.5">
                $365/yr · renews {fmtDate(new Date(annualOrder.currentPeriodEnd).toISOString())}
              </p>
            </div>
            <span className="text-f10 font-mono tracking-widest uppercase text-green-600 dark:text-green-400 shrink-0">
              Active
            </span>
          </div>
        )}

        {quarterlyOrder && (
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-sora font-semibold text-text-light dark:text-text-dark leading-tight">
                Room Dues
              </p>
              <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-0.5">
                $60/qtr · renews {fmtDate(new Date(quarterlyOrder.currentPeriodEnd).toISOString())}
              </p>
            </div>
            <span className="text-f10 font-mono tracking-widest uppercase text-green-600 dark:text-green-400 shrink-0">
              Active
            </span>
          </div>
        )}
      </div>

      {/* Payment method */}
      {paymentMethod && (
        <div className="px-4 py-3 border-t border-border-light dark:border-border-dark flex items-center gap-3">
          <CreditCard size={13} className="text-muted-light dark:text-muted-dark shrink-0" aria-hidden="true" />
          <p className="text-f10 font-mono text-muted-light dark:text-muted-dark">
            {capitalize(paymentMethod.brand)} ending in {paymentMethod.last4} · expires {paymentMethod.expMonth}/
            {paymentMethod.expYear}
          </p>
        </div>
      )}

      {/* Cancel */}
      <div className="px-4 py-3 border-t border-border-light dark:border-border-dark">
        <AnimatePresence mode="wait">
          {confirming ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <p className="text-xs font-nunito text-muted-light dark:text-muted-dark flex-1">
                This will cancel both subscriptions. Are you sure?
              </p>
              <button
                onClick={() => setConfirming(false)}
                disabled={isPending}
                className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
              >
                Keep
              </button>
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="h-7 px-3 text-f10 font-mono tracking-widest uppercase text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {isPending ? 'Cancelling…' : 'Confirm'}
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="cancel-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirming(true)}
              className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark hover:text-red-500 dark:hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              Cancel Membership
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function MembershipSetup({ membership }: MembershipSetupProps) {
  const [openModal, setOpenModal] = useState(false)
  const [openEditCardModal, setOpenEditCardModal] = useState(false)
  const quarterlyDone = !!membership.quarterlyOrder
  const annualDone = !!membership.annualOrder
  const bothDone = annualDone && quarterlyDone

  return (
    <Elements stripe={getStripe()}>
      <div>
        <SectionLabel>Membership Setup</SectionLabel>

        {bothDone ? (
          <MembershipActive membership={membership} onEdit={() => setOpenEditCardModal(true)} />
        ) : (
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpenModal(true)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 border border-border-light dark:border-border-dark border-l-2 border-l-primary-light dark:border-l-primary-dark bg-bg-light dark:bg-bg-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CreditCard size={13} className="text-muted-light dark:text-muted-dark shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark leading-tight">
                  Complete Membership Setup
                </p>
                <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-0.5">
                  {!quarterlyDone && !annualDone
                    ? 'Room dues ($60/qtr) · Annual admission ($365/yr)'
                    : !quarterlyDone
                      ? 'Room dues remaining · $60/qtr'
                      : 'Annual admission remaining · $365/yr'}
                </p>
              </div>
            </div>
            <span className="text-f10 font-mono tracking-widest uppercase text-primary-light dark:text-primary-dark shrink-0">
              Set Up →
            </span>
          </motion.button>
        )}
      </div>

      <EditCardModal
        open={openEditCardModal}
        onClose={() => setOpenEditCardModal(false)}
        currentPaymentMethod={membership.paymentMethod}
      />
      <PaymentModal open={openModal} onClose={() => setOpenModal(false)} />
    </Elements>
  )
}
