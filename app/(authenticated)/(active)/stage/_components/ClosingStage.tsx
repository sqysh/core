'use client'

// app/(authenticated)/(active)/stage/_components/ClosingStage.tsx
// The end-of-meeting screen. First an intro: the brand animates in and Sqysh waves
// the room off. Then philosopher quotes crossfade on rotation while everyone heads
// out. Shown automatically once the host finishes the closing words.

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CLOSING_QUOTES } from '@/lib/constants/stage.constants'
import { SqyshVector, TypeText, type SqyshMode } from '@/components/_shared/SqyshVector'

const HOLD_MS = 8000
const INTRO_MS = 5200
const BRAND = ['Coastal', 'Referral', 'Exchange']

export function ClosingStage() {
  const reduce = !!useReducedMotion()
  const [phase, setPhase] = useState<'intro' | 'quotes'>(reduce ? 'quotes' : 'intro')
  const [sqMode, setSqMode] = useState<SqyshMode>('wave')
  const [i, setI] = useState(0)

  // intro choreography: Sqysh waves, then gets excited, then settles; then quotes
  useEffect(() => {
    if (phase !== 'intro') return
    const a = setTimeout(() => setSqMode('excited'), 1300)
    const b = setTimeout(() => setSqMode('idle'), 3400)
    const done = setTimeout(() => setPhase('quotes'), INTRO_MS)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
      clearTimeout(done)
    }
  }, [phase])

  // quote rotation
  useEffect(() => {
    if (phase !== 'quotes' || reduce) return
    const id = setInterval(() => setI((x) => (x + 1) % CLOSING_QUOTES.length), HOLD_MS)
    return () => clearInterval(id)
  }, [phase, reduce])

  const q = CLOSING_QUOTES[i]

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(130%_100%_at_50%_-10%,#0c1b2e_0%,#081421_55%,#06101b_100%)] px-[10vw] text-center [--key:var(--color-primary-dark)]">
      {/* slow drifting glow so the screen breathes */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute -left-[12vw] top-[8vh] h-[54vh] w-[54vh] rounded-full bg-primary-dark/10 blur-3xl"
        animate={reduce ? undefined : { x: [0, 80, 0], y: [0, 50, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute -right-[12vw] bottom-[8vh] h-[48vh] w-[48vh] rounded-full bg-[#f5c542]/8 blur-3xl"
        animate={reduce ? undefined : { x: [0, -70, 0], y: [0, -40, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />

      <AnimatePresence mode="wait">
        {phase === 'intro' ? (
          <motion.div
            key="intro"
            exit={reduce ? undefined : { opacity: 0, scale: 0.96, y: -20 }}
            transition={{ duration: 0.6, ease: 'easeIn' }}
            className="relative flex flex-col items-center gap-[4vh]"
          >
            <motion.div
              initial={reduce ? false : { y: 50, opacity: 0, scale: 0.7 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="h-[24vh]"
            >
              <SqyshVector
                mode={sqMode}
                reduce={reduce}
                className="block h-full w-auto overflow-visible drop-shadow-[0_0_40px_rgba(168,85,247,0.4)]"
              />
            </motion.div>

            <h1 className="flex flex-wrap items-center justify-center gap-x-[1.4vw] font-sora text-[5.2vw] font-black leading-none tracking-[-0.03em] text-white">
              {BRAND.map((w, wi) => (
                <motion.span
                  key={w}
                  initial={reduce ? false : { y: 34, opacity: 0, filter: 'blur(10px)' }}
                  animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                  transition={{ delay: 0.35 + wi * 0.16, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  {w}
                </motion.span>
              ))}
            </h1>

            <motion.span
              aria-hidden="true"
              className="h-[3px] bg-primary-dark shadow-[0_0_14px] shadow-primary-dark"
              initial={reduce ? false : { width: 0, opacity: 0 }}
              animate={{ width: '14vw', opacity: 1 }}
              transition={{ delay: 1, duration: 0.7, ease: 'easeOut' }}
            />

            <p className="font-mono text-[1.4vw] tracking-[0.35em] uppercase text-primary-dark">
              <TypeText text="thanks for being here" startAt={1.5} reduce={reduce} />
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="quotes"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="relative flex flex-col items-center"
          >
            <span className="mb-[3vh] font-sora text-[9vw] leading-none text-primary-dark/25" aria-hidden="true">
              &ldquo;
            </span>

            <AnimatePresence mode="wait">
              <motion.div
                key={i}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -24 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="relative -mt-[5vh]"
              >
                <p className="mx-auto max-w-[80vw] font-sora text-[4.4vw] font-black leading-[1.15] tracking-[-0.02em] text-balance text-white">
                  {q.text}
                </p>
                <p className="mt-[3.5vh] font-mono text-[1.4vw] tracking-[0.35em] uppercase text-primary-dark">
                  {q.who}
                </p>
              </motion.div>
            </AnimatePresence>

            <p className="absolute -bottom-[16vh] font-mono text-[1vw] tracking-[0.3em] uppercase text-white/30">
              See you next Thursday
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
