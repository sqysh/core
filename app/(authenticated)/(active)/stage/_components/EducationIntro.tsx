'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import EducationTV from './EducationTV'
import { StagePerson } from '@/lib/constants/stage.constants'

const GREEN = '#34d399'

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Shown on the TV when the host taps "Education moment".
// The lantern scene fills the screen; the coordinator sits on the lit right side.
export function EducationIntro({ person }: { person: StagePerson }) {
  const [imgOk, setImgOk] = useState(true)

  return (
    <div className="absolute inset-0 bg-[#0a1f26]">
      <EducationTV className="absolute inset-0 h-full w-full" style={{ aspectRatio: 'auto' }} />

      {/* darken the right half so the name reads over the water */}
      <div className="absolute inset-0 bg-linear-to-l from-black/70 via-black/30 to-transparent" aria-hidden="true" />

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
          style={{ color: GREEN }}
        >
          This week&rsquo;s Education moment
        </motion.span>

        <div className="relative">
          <span className="absolute -inset-4 rounded-full blur-2xl" style={{ background: GREEN, opacity: 0.28 }} aria-hidden="true" />
          <div
            className="relative aspect-square w-[20vw] max-w-[340px] min-w-[180px] overflow-hidden rounded-full border-[3px] shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
            style={{ borderColor: GREEN }}
          >
            {person.image && imgOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={person.image} alt={person.name} onError={() => setImgOk(false)} className="h-full w-full object-cover" />
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

        <span className="mt-[1vh] h-[3px] w-[8vw] rounded-full" style={{ background: GREEN, opacity: 0.8 }} aria-hidden="true" />
      </motion.div>
    </div>
  )
}
