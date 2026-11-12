'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import CoDirectorsTV from './CoDirectorsTV'
import { StagePerson } from '@/lib/constants/stage.constants'

const STEEL = '#7c93c4'

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function Portrait({ person, i, solo }: { person: StagePerson; i: number; solo: boolean }) {
  const [imgOk, setImgOk] = useState(true)
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + i * 0.12, duration: 0.6, ease: 'easeOut' }}
      className="flex flex-col items-center gap-[1.4vh]"
    >
      <div className="relative">
        <span
          className="absolute -inset-3 rounded-full blur-2xl"
          style={{ background: STEEL, opacity: 0.25 }}
          aria-hidden="true"
        />
        <div
          className={`relative aspect-square overflow-hidden rounded-full border-[3px] shadow-[0_16px_50px_rgba(0,0,0,0.55)] ${solo ? 'w-[18vw] max-w-[320px]' : 'w-[13vw] max-w-57.5 min-w-37.5'}`}
          style={{ borderColor: STEEL }}
        >
          {person.image && imgOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.image}
              alt={person.name}
              onError={() => setImgOk(false)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/5 font-sora text-[4.5vw] font-black text-white/80">
              {initials(person.name)}
            </div>
          )}
        </div>
      </div>
      <div className="text-center">
        <h2 className="font-sora text-[2.6vw] font-black leading-none text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.65)]">
          {person.name}
        </h2>
        {person.company && <p className="mt-[0.8vh] font-nunito text-[1.3vw] text-white/65">{person.company}</p>}
      </div>
    </motion.div>
  )
}

// Shown on the TV when the host taps "Co-Directors".
// The sailboat scene fills the screen; the leaders sit together on the right.
export function CoDirectorsIntro({ people }: { people: StagePerson[] }) {
  return (
    <div className="absolute inset-0 bg-[#0c1626]">
      <CoDirectorsTV className="absolute inset-0 h-full w-full" style={{ aspectRatio: 'auto' }} />

      {/* darken the right half so the names read over the water */}
      <div className="absolute inset-0 bg-linear-to-l from-black/70 via-black/30 to-transparent" aria-hidden="true" />

      <div className="absolute inset-y-0 right-0 flex w-[60%] flex-col items-center justify-center gap-[3.5vh] px-[4vw]">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="font-mono text-[1.3vw] font-semibold tracking-[0.42em] uppercase"
          style={{ color: STEEL }}
        >
          Your Co-Directors
        </motion.span>

        <div className="flex items-start justify-center gap-[4vw]">
          {people.map((p, i) => (
            <Portrait key={p.name + i} person={p} i={i} solo={people.length === 1} />
          ))}
        </div>

        <span className="h-0.75 w-[8vw] rounded-full" style={{ background: STEEL, opacity: 0.8 }} aria-hidden="true" />
      </div>
    </div>
  )
}
