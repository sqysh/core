'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import LighthouseTV from './LighthouseTV'
import { StagePerson } from '@/lib/constants/stage.constants'

const GOLD = '#f5c542'

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Shown on the TV when the host taps "Introduce the Guiding Light".
// The lighthouse scene fills the screen; the beam sweeps right toward the person.
export function GuidingLightIntro({ person }: { person: StagePerson }) {
  const [imgOk, setImgOk] = useState(true)

  return (
    <div className="absolute inset-0 bg-[#06101b]">
      {/* full-bleed animated scene (aspectRatio override lets it fill any screen) */}
      <LighthouseTV className="absolute inset-0 h-full w-full" style={{ aspectRatio: 'auto' }} />

      {/* darken the right half so the name reads over the shimmer */}
      <div className="absolute inset-0 bg-linear-to-l from-black/75 via-black/35 to-transparent" aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: 'easeOut' }}
        className="absolute inset-y-0 right-0 flex w-[56%] flex-col items-center justify-center gap-[2.5vh] px-[5vw] text-center"
      >
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="font-mono text-[1.3vw] font-semibold tracking-[0.42em] uppercase"
          style={{ color: GOLD }}
        >
          This week&rsquo;s Guiding Light
        </motion.span>

        <div className="relative">
          <span
            className="absolute -inset-4 rounded-full blur-2xl"
            style={{ background: GOLD, opacity: 0.3 }}
            aria-hidden="true"
          />
          <div
            className="relative aspect-square w-[20vw] max-w-85 min-w-45 overflow-hidden rounded-full border-[3px] shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
            style={{ borderColor: GOLD }}
          >
            {person.image && imgOk ? (
              <img
                src={person.image}
                alt={person.name}
                onError={() => setImgOk(false)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/5 font-sora text-[6vw] font-black text-white/80">
                {initials(person.name)}
              </div>
            )}
          </div>
        </div>

        <div>
          <h1 className="font-sora text-[4.6vw] font-black leading-none text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.65)]">
            {person.name}
          </h1>
          {person.company && <p className="mt-[1.6vh] font-nunito text-[1.9vw] text-white/70">{person.company}</p>}
        </div>

        <span
          className="mt-[1vh] h-0.75 w-[8vw] rounded-full"
          style={{ background: GOLD, opacity: 0.8 }}
          aria-hidden="true"
        />
      </motion.div>
    </div>
  )
}
