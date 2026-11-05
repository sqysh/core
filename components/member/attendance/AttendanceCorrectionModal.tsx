'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createAttendanceCorrectionPayment } from '@/lib/actions/stripe/createAttendanceCorrectionPayment'
import { useSounds } from '@/lib/hooks/useSounds'
import { fmtDate } from '@/lib/utils/date.utils'
import { AttendanceCorrectionModalProps } from '@/types/attendance.types'
import { SqyshSlime } from './SqyshSlime'

const SOFT_HOVER = 'hover:bg-black/3 dark:hover:bg-white/3'

// Amber until the tip is ticked, then everything takes Sqysh's purple.
// Full literal strings so Tailwind can see every class at build time.
const ACCENT = {
  amber: {
    edge: 'border-t-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'focus-visible:ring-amber-500',
    box: 'border-amber-500 bg-amber-500',
    button: 'bg-amber-500 hover:bg-amber-600'
  },
  sqysh: {
    edge: 'border-t-[#a855f7]',
    text: 'text-[#9333ea] dark:text-[#c084fc]',
    ring: 'focus-visible:ring-[#a855f7]',
    box: 'border-[#a855f7] bg-[#a855f7]',
    button: 'bg-[#7c42e0] hover:bg-[#6b34cf]'
  }
}

export function AttendanceCorrectionModal({ open, onClose, date, meetingId }: AttendanceCorrectionModalProps) {
  const router = useRouter()
  const [tipSqysh, setTipSqysh] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const { play } = useSounds({ enabled: true })

  const total = tipSqysh ? 200 : 150
  const a = tipSqysh ? ACCENT.sqysh : ACCENT.amber

  useEffect(() => {
    if (!open) return

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape' || status === 'loading') return
      onClose()
      play('se10')
    }

    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, status, onClose, play])

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
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-0 z-50 flex sm:items-end sm:justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Attendance correction"
          >
            <div
              className={`relative flex h-full w-full flex-col border-t-[3px] bg-bg-light transition-colors duration-300 dark:bg-surface-dark sm:h-auto sm:max-h-[90vh] sm:max-w-170 ${a.edge}`}
            >
              {/* Header */}
              <div className="flex shrink-0 items-start justify-between gap-3 px-4 pt-6 pb-3 sm:px-5">
                <div className="min-w-0">
                  <p
                    className={`mb-1 text-f10 font-mono tracking-[0.12em] uppercase transition-colors duration-300 ${a.text}`}
                  >
                    Attendance Correction · Powered by Sqysh
                  </p>
                  <h2 className="font-sora text-[20px] font-black leading-tight tracking-tight text-text-light dark:text-text-dark sm:text-[22px]">
                    {fmtDate(date)}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  disabled={status === 'loading'}
                  aria-label="Close"
                  className={`-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center text-muted-light transition-colors hover:text-text-light disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 dark:text-muted-dark dark:hover:text-text-dark ${a.ring}`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5">
                <p className="mb-5 font-nunito text-sm leading-relaxed text-muted-light dark:text-muted-dark">
                  Pay the $150 correction fee and your attendance is reinstated automatically using your card on file.
                  The money goes into the{' '}
                  <span className="font-semibold text-text-light dark:text-text-dark">chapter account</span>, which the
                  group puts toward things like the Boys &amp; Girls Club or the summer outing.
                </p>

                {/* Line items */}
                <div className="border border-border-light dark:border-border-dark">
                  <div className="flex items-center justify-between gap-3 border-b border-border-light px-4 py-3 dark:border-border-dark">
                    <p className="font-sora text-[13px] font-semibold text-text-light dark:text-text-dark">
                      Attendance Correction
                    </p>
                    <p className="shrink-0 font-sora text-[13px] font-bold tabular-nums text-text-light dark:text-text-dark">
                      $150.00
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      play(tipSqysh ? 'se14' : 'se15')
                      setTipSqysh((t) => !t)
                    }}
                    disabled={status === 'loading'}
                    aria-pressed={tipSqysh}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-300 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${a.ring} ${
                      tipSqysh ? 'bg-[#a855f7]/10' : SOFT_HOVER
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center border transition-colors duration-300 ${
                          tipSqysh ? a.box : 'border-border-light dark:border-border-dark'
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
                        <p className="font-sora text-[13px] font-semibold leading-tight text-text-light dark:text-text-dark">
                          Tip Sqysh $50
                        </p>
                        <p className="font-nunito text-[12px] leading-snug text-muted-light dark:text-muted-dark">
                          Optional, for building this ridiculous feature
                        </p>
                      </div>
                    </div>
                    <p
                      className={`shrink-0 font-sora text-[13px] font-bold tabular-nums transition-colors duration-300 ${
                        tipSqysh ? a.text : 'text-muted-light dark:text-muted-dark'
                      }`}
                    >
                      +$50.00
                    </p>
                  </button>

                  <div className="flex items-center justify-between gap-3 border-t border-border-light bg-black/3 px-4 py-3 dark:border-border-dark dark:bg-white/3">
                    <p className="text-f10 font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">
                      Total
                    </p>
                    <p className="font-sora text-xl font-black tabular-nums text-text-light dark:text-text-dark">
                      ${total}.00
                    </p>
                  </div>
                </div>

                <AnimatePresence>
                  {status === 'error' && errorMsg && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      role="alert"
                      className="mt-3 font-nunito text-[13px] leading-snug text-red-600 dark:text-red-400"
                    >
                      {errorMsg}
                    </motion.p>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {status === 'success' && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 font-nunito text-[13px] leading-snug text-green-700 dark:text-green-400"
                    >
                      Attendance reinstated.{tipSqysh ? ' Thank you for supporting Sqysh.' : ''} That $150 is in the
                      chapter account now.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <SqyshSlime tipSqysh={tipSqysh} />

              {/* Actions: opaque and above Sqysh, so he rises from behind it */}
              <div
                className="relative z-10 flex shrink-0 gap-2 border-t border-border-light bg-bg-light px-4 pt-4 dark:border-border-dark dark:bg-surface-dark sm:px-5"
                style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
              >
                <button
                  onClick={handleClose}
                  disabled={status === 'loading'}
                  className={`h-12 shrink-0 border border-border-light px-4 font-nunito text-sm text-text-light transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 dark:border-border-dark dark:text-text-dark ${a.ring} ${SOFT_HOVER}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={status === 'loading' || status === 'success'}
                  className={`flex h-12 min-w-0 flex-1 items-center justify-center gap-2 font-sora text-sm font-bold text-white transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${a.button} ${a.ring}`}
                >
                  {status === 'loading' ? (
                    <>
                      <svg
                        className="animate-spin"
                        width="14"
                        height="14"
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
                    'Reinstated'
                  ) : (
                    <>
                      <Lock size={14} aria-hidden="true" />
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
