'use client'

// A title-card intro for a leadership section: the role, then the person or the
// whole committee, over a drifting accent glow. Used for Event Coordinator and
// Membership Committee.

import { motion, useReducedMotion } from 'framer-motion'
import { StagePerson } from '@/lib/constants/stage.constants'
import { getInitials } from '@/lib/utils/shared.utils'

function Person({
  p,
  accent,
  solo,
  i,
  reduce
}: {
  p: StagePerson
  accent: string
  solo: boolean
  i: number
  reduce: boolean
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 28, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.35 + i * 0.12, type: 'spring', stiffness: 220, damping: 18 }}
      className="flex flex-col items-center gap-[1.6vh]"
    >
      <div
        className="grid aspect-square place-items-center overflow-hidden rounded-full border-2"
        style={{ width: solo ? '15vw' : '9vw', borderColor: accent }}
      >
        {p.image ? (
          <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
        ) : (
          <span className="font-sora font-black" style={{ fontSize: solo ? '5vw' : '3vw', color: accent }}>
            {getInitials(p.name)}
          </span>
        )}
      </div>
      <div>
        <p
          className="font-sora font-black leading-none tracking-[-0.03em] text-white"
          style={{ fontSize: solo ? '4.6vw' : '2.4vw' }}
        >
          {p.name}
        </p>
        {p.company && (
          <p
            className="mt-[1vh] font-mono uppercase tracking-[0.2em] text-white/45"
            style={{ fontSize: solo ? '1.4vw' : '1vw' }}
          >
            {p.company}
          </p>
        )}
      </div>
    </motion.div>
  )
}

export function RoleIntro({ label, people, accent }: { label: string; people: StagePerson[]; accent: string }) {
  const reduce = !!useReducedMotion()
  const solo = people.length === 1

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[6vh] overflow-hidden bg-[radial-gradient(130%_100%_at_50%_-10%,#0c1b2e_0%,#081421_55%,#06101b_100%)] px-[6vw] text-center">
      {/* drifting accent glow */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute -left-[12vw] top-[8vh] h-[54vh] w-[54vh] rounded-full blur-3xl"
        style={{ backgroundColor: accent, opacity: 0.12 }}
        animate={reduce ? undefined : { x: [0, 80, 0], y: [0, 50, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute -right-[12vw] bottom-[8vh] h-[46vh] w-[46vh] rounded-full blur-3xl"
        style={{ backgroundColor: accent, opacity: 0.08 }}
        animate={reduce ? undefined : { x: [0, -70, 0], y: [0, -40, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={reduce ? false : { opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative flex items-center gap-[1.2vw]"
      >
        <span className="h-px w-[4vw]" style={{ backgroundColor: accent }} />
        <p className="font-mono text-[1.6vw] font-semibold tracking-[0.4em] uppercase" style={{ color: accent }}>
          {label}
        </p>
        <span className="h-px w-[4vw]" style={{ backgroundColor: accent }} />
      </motion.div>

      <div className="relative flex flex-wrap items-start justify-center gap-x-[4vw] gap-y-[4vh]">
        {people.map((p, i) => (
          <Person key={`${p.name}-${i}`} p={p} accent={accent} solo={solo} i={i} reduce={reduce} />
        ))}
      </div>
    </div>
  )
}
