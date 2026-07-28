'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, AlertCircle, ArrowLeft } from 'lucide-react'
import { useSounds } from '@/lib/hooks/useSounds'
import { cancelSubscriptions } from '@/lib/actions/stripe/cancelSubscriptions'

export function CancelMembershipClient() {
  const router = useRouter()
  const { play } = useSounds({ enabled: true })
  const { data: session } = useSession()

  const userName = session?.user?.name ?? 'Member'
  const userEmail = session?.user?.email ?? ''

  const [cancelling, startCancelTransition] = useTransition()
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelLocked, setCancelLocked] = useState(false)
  const [confirmStep, setConfirmStep] = useState(false)

  function handleConfirmCancel() {
    setCancelError(null)
    startCancelTransition(async () => {
      const res = await cancelSubscriptions()

      if (res.success) {
        router.push('/membership/cancelled')
      } else {
        setCancelError(res.error)
        if (res.code === 'PARTIAL_CANCELLATION') {
          setCancelLocked(true)
        }
      }
    })
  }

  return (
    <main className="min-h-screen bg-bg-light dark:bg-bg-dark px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[10px] sm:text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
        >
          <ArrowLeft size={11} aria-hidden="true" />
          Back to Dashboard
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark"
        >
          {/* Header */}
          <div className="px-5 sm:px-7 py-5 sm:py-6 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={14} className="text-amber-500 dark:text-amber-400 shrink-0" aria-hidden="true" />
              <p className="text-[10px] sm:text-f10 font-mono tracking-[0.2em] uppercase text-amber-700 dark:text-amber-400 font-bold">
                Cancel Your Membership
              </p>
            </div>
            <h1 className="font-sora font-black text-2xl sm:text-3xl text-text-light dark:text-text-dark leading-tight tracking-tight">
              Before you go, {userName.split(' ')[0]}…
            </h1>
            <p className="font-nunito text-sm sm:text-base text-muted-light dark:text-muted-dark mt-3 leading-relaxed">
              Here's exactly what will happen if you cancel your CORE membership. Take a moment to review before
              confirming.
            </p>
          </div>

          {/* What will happen */}
          <div className="px-5 sm:px-7 py-5 sm:py-6 border-b border-border-light dark:border-border-dark">
            <p className="text-[10px] sm:text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-4 font-bold">
              What Will Happen
            </p>

            <ul className="space-y-3">
              {[
                {
                  title: 'Dashboard access ends immediately',
                  body: "The moment you confirm, you'll lose access to the member dashboard, directory, attendance check-ins, and all other member features."
                },
                {
                  title: 'Your payment card will be removed',
                  body: "We'll automatically remove your saved card from the system as part of the cancellation. If you reactivate later, you'll add a new one then."
                },
                {
                  title: "You'll be able to download your data after",
                  body: "After cancelling, you'll be taken to a page where you can download a full export of your CORE history. That page stays accessible until your current billing period ends."
                },
                {
                  title: 'No further charges',
                  body: "Your annual admission and quarterly room dues won't renew. You won't be charged again unless you reactivate your membership."
                },
                {
                  title: 'You can come back anytime',
                  body: 'If you change your mind, your spot in the chapter can be reactivated. Reach out to your chapter leadership or contact us directly.'
                }
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 w-5 h-5 border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark flex items-center justify-center text-[10px] font-mono font-bold text-primary-light dark:text-primary-dark">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] sm:text-sm font-sora font-bold text-text-light dark:text-text-dark leading-tight">
                      {item.title}
                    </p>
                    <p className="text-[12px] sm:text-[13px] font-nunito text-muted-light dark:text-muted-dark leading-relaxed mt-1">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Cancel action */}
          <div className="px-5 sm:px-7 py-5 sm:py-6 border-b border-border-light dark:border-border-dark">
            <p className="text-[10px] sm:text-f10 font-mono tracking-[0.2em] uppercase text-red-600 dark:text-red-400 mb-3 font-bold">
              Cancel Your Membership
            </p>

            {cancelError && (
              <div className="mb-3 px-3 py-2 border border-red-500/40 dark:border-red-400/40 bg-red-500/5 dark:bg-red-400/5">
                <p className="text-[12px] font-nunito text-red-600 dark:text-red-400">{cancelError}</p>
              </div>
            )}

            <AnimatePresence mode="wait">
              {confirmStep ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <p className="text-[13px] sm:text-sm font-nunito text-text-light dark:text-text-dark flex-1 leading-relaxed">
                    Are you sure? This cancels both your annual admission and quarterly room dues, locks dashboard
                    access, and removes your saved card from the system.
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setConfirmStep(false)}
                      disabled={cancelling}
                      className="px-4 py-2.5 border border-border-light dark:border-border-dark text-text-light dark:text-text-dark text-[10px] sm:text-f10 font-mono tracking-[0.2em] uppercase font-bold hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                    >
                      Keep My Membership
                    </button>
                    <button
                      onClick={handleConfirmCancel}
                      disabled={cancelling || cancelLocked}
                      className="px-4 py-2.5 border border-red-500 dark:border-red-400 bg-red-500 dark:bg-red-400 text-white dark:text-bg-dark text-[10px] sm:text-f10 font-mono tracking-[0.2em] uppercase font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                      {cancelling ? 'Cancelling…' : 'Confirm Cancellation'}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="initial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-[13px] sm:text-sm font-nunito text-muted-light dark:text-muted-dark leading-relaxed mb-4">
                    Once you confirm, you'll be locked out of the member dashboard immediately and routed to a page
                    where you can download your data.
                  </p>
                  <button
                    onClick={() => {
                      play('se12')
                      setConfirmStep(true)
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 border border-red-500 dark:border-red-400 text-red-600 dark:text-red-400 text-[10px] sm:text-f10 font-mono tracking-[0.2em] uppercase font-bold hover:bg-red-500/5 dark:hover:bg-red-400/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    Cancel Membership
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-7 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-[11px] font-nunito text-muted-light dark:text-muted-dark leading-relaxed">
              Signed in as <span className="font-mono text-text-light dark:text-text-dark">{userEmail}</span>
            </p>
            <button
              onClick={() => signOut({ redirectTo: '/' })}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-border-light dark:border-border-dark text-text-light dark:text-text-dark text-[10px] sm:text-f10 font-mono tracking-[0.2em] uppercase font-bold hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
            >
              <LogOut size={11} aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
