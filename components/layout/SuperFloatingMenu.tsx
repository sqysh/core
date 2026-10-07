'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield } from 'lucide-react'

export default function SuperFloatingMenu({
  onLaunchGame,
  launching,
  onInitiateGuidingLight,
  initiating,
  onSeedGL,
  currentJudge,
  onGenerateMatchups,
  generating,
  onOpenElection,
  openingElection
}: {
  onLaunchGame: () => void
  launching: boolean
  onInitiateGuidingLight: () => void
  initiating: boolean
  onSeedGL: () => void
  currentJudge: { name: string } | null
  onGenerateMatchups: () => void
  generating: boolean
  onOpenElection: () => void
  openingElection: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="flex flex-col gap-1.5 mb-1"
          >
            {/* Guiding Light */}
            <button
              onClick={() => {
                onInitiateGuidingLight()
                setOpen(false)
              }}
              disabled={initiating}
              className="h-9 px-4 bg-bg-dark/90 backdrop-blur border border-cyan-400/40 text-cyan-300 font-mono text-[9px] tracking-[0.15em] uppercase hover:border-cyan-400/70 transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              {initiating ? 'Opening…' : `Guiding Light${currentJudge ? ` · ${currentJudge.name.split(' ')[0]}` : ''}`}
            </button>

            {/* SoF */}
            <button
              onClick={() => {
                onLaunchGame()
                setOpen(false)
              }}
              disabled={launching}
              className="h-9 px-4 bg-bg-dark/90 backdrop-blur border border-amber-300/40 text-amber-300 font-mono text-[9px] tracking-[0.15em] uppercase hover:border-amber-300/70 transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              {launching ? 'Starting…' : 'Sqywheel of Fortune'}
            </button>

            {/* Matchups */}
            <button
              onClick={() => {
                onGenerateMatchups()
                setOpen(false)
              }}
              disabled={generating}
              className="h-9 px-4 bg-bg-dark/90 backdrop-blur border border-red-500/40 text-red-400 font-mono text-[9px] tracking-[0.15em] uppercase hover:border-red-500/70 transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              {generating ? 'Matching…' : '1-2-1 Matchups'}
            </button>

            {/* Election */}
            <button
              onClick={() => {
                onOpenElection()
                setOpen(false)
              }}
              disabled={openingElection}
              className="h-9 px-4 bg-bg-dark/90 backdrop-blur border border-violet-400/40 text-violet-300 font-mono text-[9px] tracking-[0.15em] uppercase hover:border-violet-400/70 transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              {openingElection ? 'Opening…' : 'Open Election'}
            </button>

            {/* Seed GL — dev only */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => {
                  onSeedGL()
                  setOpen(false)
                }}
                className="h-9 px-4 bg-bg-dark/90 backdrop-blur border border-white/10 text-white/30 font-mono text-[9px] tracking-[0.15em] uppercase hover:border-white/20 hover:text-white/50 transition-colors whitespace-nowrap"
              >
                Seed GL
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-10 h-10 flex items-center justify-center border transition-colors ${
          open
            ? 'border-primary-light/60 dark:border-primary-dark/60 bg-primary-light/10 dark:bg-primary-dark/10 text-primary-light dark:text-primary-dark'
            : 'border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark'
        }`}
        aria-label="Super menu"
      >
        <Shield size={14} />
      </button>
    </div>
  )
}
