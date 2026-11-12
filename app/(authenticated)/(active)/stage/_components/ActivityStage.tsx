// app/(authenticated)/(active)/stage/_components/ActivityStage.tsx
// The Activity Round TV screen: the three things everyone reports, with a
// spotlight that cycles between them forever while the room goes around.
'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { DollarSign, Send, Users } from 'lucide-react'

const ITEMS = [
  { label: '1-2-1s', sub: 'Who did you sit down with this week?', Icon: Users },
  { label: 'Referrals passed', sub: 'Who did you send business to?', Icon: Send },
  { label: 'TYFCB', sub: 'Thank you for closed business', Icon: DollarSign }
]

const HOLD_MS = 4000

export function ActivityStage() {
  const reduce = !!useReducedMotion()
  const [active, setActive] = useState(0)
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => {
      setActive((i) => (i + 1) % ITEMS.length)
      setCycle((c) => c + 1)
    }, HOLD_MS)
    return () => clearInterval(id)
  }, [reduce])

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[6vh] overflow-hidden bg-[radial-gradient(130%_100%_at_50%_-10%,#0c1b2e_0%,#081421_55%,#06101b_100%)] px-[6vw] text-center">
      {/* drifting glow, looping forever */}
      <motion.span
        className="pointer-events-none absolute -left-[12vw] top-[6vh] h-[52vh] w-[52vh] rounded-full bg-primary-dark/10 blur-3xl"
        animate={reduce ? undefined : { x: [0, 70, 0], y: [0, 50, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      />
      <motion.span
        className="pointer-events-none absolute -right-[12vw] bottom-[4vh] h-[46vh] w-[46vh] rounded-full bg-emerald-400/8 blur-3xl"
        animate={reduce ? undefined : { x: [0, -60, 0], y: [0, -40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      />
      {/* motes rising through the room */}
      {Array.from({ length: 10 }).map((_, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute bottom-[-4vh] h-1.5 w-1.5 rounded-full bg-primary-dark/60"
          style={{ left: `${8 + i * 9}%` }}
          animate={reduce ? undefined : { y: ['0vh', '-100vh'], opacity: [0, 0.7, 0] }}
          transition={{ duration: 9 + (i % 5) * 2, repeat: Infinity, delay: i * 0.9, ease: 'linear' }}
          aria-hidden="true"
        />
      ))}

      <div className="relative">
        <p className="font-mono text-[1.6vw] tracking-[0.4em] uppercase text-primary-dark">Activity Round</p>
        <h1 className="mt-[1.4vh] font-sora text-[5.4vw] font-black leading-none tracking-[-0.03em] text-white">
          Share your week.
        </h1>
      </div>

      <div className="relative flex w-full max-w-[86vw] items-stretch justify-center gap-[2vw]">
        {ITEMS.map((it, i) => {
          const isActive = reduce || i === active
          return (
            <motion.div
              key={it.label}
              animate={reduce ? undefined : i === active ? { scale: 1.05, opacity: 1 } : { scale: 1, opacity: 0.5 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`relative flex flex-1 flex-col items-center gap-[2vh] overflow-hidden border px-[2vw] py-[4.5vh] ${
                isActive
                  ? 'border-primary-dark/70 bg-primary-dark/10 shadow-[0_0_44px_rgba(96,165,250,0.14)]'
                  : 'border-white/10 bg-white/3'
              }`}
            >
              <motion.span
                animate={!reduce && i === active ? { y: [0, -7, 0] } : { y: 0 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden="true"
              >
                <it.Icon
                  className={`h-[3.6vw] w-[3.6vw] ${isActive ? 'text-primary-dark' : 'text-white/40'}`}
                  strokeWidth={1.75}
                />
              </motion.span>
              <p className="font-sora text-[2.4vw] font-black leading-tight text-white">{it.label}</p>
              <p className="font-nunito text-[1.3vw] leading-snug text-white/50">{it.sub}</p>
              {!reduce && i === active && (
                <motion.span
                  key={cycle}
                  className="absolute bottom-0 left-0 h-1.25 bg-primary-dark"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: HOLD_MS / 1000, ease: 'linear' }}
                  aria-hidden="true"
                />
              )}
            </motion.div>
          )
        })}
      </div>

      <p className="relative font-nunito text-[1.6vw] text-white/40">Go around the room.</p>
    </div>
  )
}
