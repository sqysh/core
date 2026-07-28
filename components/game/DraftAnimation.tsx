'use client'

import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { SerializedPlayer } from '@/types/game.types'

interface DraftAnimationProps {
  players: SerializedPlayer[]
  onDone: () => void
}

export default function DraftAnimation({ players, onDone }: DraftAnimationProps) {
  const teamA = useMemo(() => players.filter((p) => p.team === 'A'), [players])
  const teamB = useMemo(() => players.filter((p) => p.team === 'B'), [players])

  useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [onDone])

  const stagger = (teamOffset: number, i: number) => 0.4 + (i * 2 + teamOffset) * 0.14

  return (
    <div className="min-h-[70vh] flex items-center justify-center w-full">
      <div className="grid grid-cols-2 gap-16 md:gap-32 w-full max-w-5xl">
        {/* Team A column */}
        <div className="flex flex-col items-end gap-4">
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="font-mono text-sm tracking-[0.3em] mb-2"
            style={{ color: '#3DDC97' }}
          >
            TEAM A
          </motion.p>
          {teamA.map((p, i) => (
            <motion.span
              key={p.id}
              initial={{ opacity: 0, x: -120 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: stagger(0, i), ease: [0.16, 1, 0.3, 1] }}
              className="inline-block px-6 py-3 font-quicksand font-black text-2xl border-2 whitespace-nowrap w-full text-center"
              style={{ color: '#3DDC97', borderColor: '#3DDC97', background: 'rgba(8,20,32,0.95)' }}
            >
              {p.name}
            </motion.span>
          ))}
        </div>

        {/* Team B column */}
        <div className="flex flex-col items-start gap-4">
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="font-mono text-sm tracking-[0.3em] mb-2"
            style={{ color: '#FF6B6B' }}
          >
            TEAM B
          </motion.p>
          {teamB.map((p, i) => (
            <motion.span
              key={p.id}
              initial={{ opacity: 0, x: 120 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: stagger(1, i), ease: [0.16, 1, 0.3, 1] }}
              className="inline-block px-6 py-3 font-quicksand font-black text-2xl border-2 whitespace-nowrap w-full text-center"
              style={{ color: '#FF6B6B', borderColor: '#FF6B6B', background: 'rgba(8,20,32,0.95)' }}
            >
              {p.name}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  )
}
