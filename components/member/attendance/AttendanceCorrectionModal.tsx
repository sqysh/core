'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createAttendanceCorrectionPayment } from '@/lib/actions/stripe/createAttendanceCorrectionPayment'
import { useSounds } from '@/lib/hooks/useSounds'
import Picture from '../../_shared/Picture'
import { fmtDate } from '@/lib/utils/date.utils'
import { AttendanceCorrectionModalProps } from '@/types/attendance.types'
import { SqyshSlime } from './SqyshSlime'

export function AttendanceCorrectionModal({ open, onClose, date, meetingId }: AttendanceCorrectionModalProps) {
  const router = useRouter()
  const [tipSqysh, setTipSqysh] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const { play } = useSounds({ enabled: true })

  const total = tipSqysh ? 200 : 150

  async function handleSubmit() {
    if (status === 'loading') return
    setStatus('loading')
    setErrorMsg('')

    const res = await createAttendanceCorrectionPayment({ meetingId, tipSqysh })

    if (!res.success) {
      setStatus('error')
      setErrorMsg(res.error ?? 'Payment failed. Please try again.')
      return
    }

    play('se11')
    setStatus('success')
    setTimeout(() => {
      onClose()
      router.refresh()
      setStatus('idle')
      setTipSqysh(false)
    }, 2000)
  }

  function handleClose() {
    if (status === 'loading') return
    onClose()
    play('se10')
    setTimeout(() => {
      setStatus('idle')
      setErrorMsg('')
      setTipSqysh(false)
    }, 300)
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
            onClick={handleClose}
            className="fixed inset-0 z-40 backdrop-blur-sm bg-black/50"
          />
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-x-0 bottom-0 z-50 flex justify-center"
          >
            {/* Sqysh peek */}
            <AnimatePresence>
              {tipSqysh && (
                <motion.div
                  key="sqysh-peek"
                  initial={{ y: 80, opacity: 0 }}
                  animate={{
                    y: 0,
                    opacity: 1,
                    transition: {
                      y: { type: 'spring', stiffness: 260, damping: 16 },
                      opacity: { duration: 0.2 }
                    }
                  }}
                  exit={{
                    y: 80,
                    opacity: 0,
                    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] }
                  }}
                  aria-hidden="true"
                  className="absolute left-1/2 -translate-x-1/2 -top-30 z-10 pointer-events-none"
                >
                  <motion.div
                    animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
                    transition={{ duration: 0.7, delay: 0.2, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}
                    className="origin-bottom"
                  >
                    <Picture
                      priority={false}
                      src="/images/sqysh-logo.png"
                      alt="Sqysh"
                      width={120}
                      height={120}
                      className="w-full h-44 drop-shadow-lg"
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              className="relative z-20 w-full max-w-170 bg-bg-light dark:bg-surface-dark border-t-[3px] border-t-amber-500 px-5 pt-6"
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            >
              {/* Sqysh Slime */}
              <SqyshSlime tipSqysh={tipSqysh} />

              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-f10 font-mono tracking-widest uppercase text-amber-500 mb-1">
                    Attendance Correction · Powered by Sqysh
                  </p>
                  <h2 className="font-sora font-black text-[22px] text-text-light dark:text-text-dark tracking-tight leading-none">
                    {fmtDate(date)}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  disabled={status === 'loading'}
                  aria-label="Close"
                  className="mt-0.5 p-1 text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-40"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Description */}
              <p className="font-nunito text-sm text-muted-light dark:text-muted-dark leading-relaxed mb-5">
                Pay the $150 correction fee and your attendance will be reinstated automatically using your card on
                file. The full amount goes toward the chapter's{' '}
                <span className="text-text-light dark:text-text-dark font-semibold">
                  quarterly attendance prize pool — up to $250 split among members with the best attendance each quarter
                </span>
                .
              </p>

              {/* Line items */}
              <div className="border border-border-light dark:border-border-dark mb-5">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark">
                  <p className="text-[13px] font-sora font-semibold text-text-light dark:text-text-dark">
                    Attendance Correction
                  </p>
                  <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark">$150.00</p>
                </div>

                {/* Sqysh tip toggle */}
                <button
                  onClick={() => {
                    if (tipSqysh) {
                      play('se14')
                    } else {
                      play('se15')
                    }
                    setTipSqysh((t) => !t)
                  }}
                  disabled={status === 'loading'}
                  className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left disabled:opacity-40 ${
                    tipSqysh ? 'bg-amber-500/10' : 'hover:bg-surface-light dark:hover:bg-bg-dark'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-4 h-4 border flex items-center justify-center shrink-0 transition-colors ${
                        tipSqysh ? 'border-amber-500 bg-amber-500' : 'border-border-light dark:border-border-dark'
                      }`}
                    >
                      {tipSqysh && (
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-sora font-semibold text-text-light dark:text-text-dark leading-tight">
                        Tip Sqysh $50 💸
                      </p>
                      <p className="text-[11px] font-nunito text-muted-light dark:text-muted-dark">
                        Optional — for building this ridiculous feature
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-[13px] font-sora font-bold shrink-0 ml-4 transition-colors ${
                      tipSqysh ? 'text-amber-500' : 'text-muted-light dark:text-muted-dark'
                    }`}
                  >
                    +$50.00
                  </p>
                </button>

                {/* Total */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-bg-dark">
                  <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark">
                    Total
                  </p>
                  <p className="font-sora font-black text-xl text-text-light dark:text-text-dark">${total}.00</p>
                </div>
              </div>

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
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3"
                  >
                    <p className="text-[11px] font-mono text-green-600 dark:text-green-400">
                      ✓ Attendance reinstated.{tipSqysh ? ' Thank you for supporting Sqysh 🙏' : ''} Keep showing up —
                      top attendance each quarter wins a share of $250.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  disabled={status === 'loading'}
                  className="h-11 px-4 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark font-nunito text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={status === 'loading' || status === 'success'}
                  className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-white font-sora font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
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
                      Processing…
                    </>
                  ) : status === 'success' ? (
                    'Reinstated!'
                  ) : (
                    <>
                      <Lock size={13} aria-hidden="true" />
                      Pay ${total}.00
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
