'use client'

import { motion } from 'framer-motion'

interface PhraseBoardProps {
  phrase: string
  revealed: string[]
  /** Smaller tiles for phone; default is TV-sized. */
  compact?: boolean
}

export default function PhraseBoard({ phrase, revealed, compact }: PhraseBoardProps) {
  const revealedSet = new Set(revealed)
  const words = phrase.trim().split(/\s+/)

  // Total letters across all words — drives dynamic tile sizing on TV so the
  // board fills the width whether the phrase is short or long.
  const letterCount = words.reduce((n, w) => n + w.length, 0)

  if (compact) {
    // Phone: fixed small tiles, wrap naturally.
    return (
      <div className="flex flex-wrap items-center justify-center gap-y-1.5">
        {words.map((word, wi) => (
          <div key={wi} className="flex gap-1 mx-2">
            {word.split('').map((ch, ci) => (
              <Tile key={ci} ch={ch} open={revealedSet.has(ch)} className="w-7 h-9 text-lg" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  // TV: size tiles to fill the container width. cqw = 1% of container width.
  // Fewer letters → bigger tiles (capped), more letters → smaller (floored).
  const tileW = `clamp(2.5rem, ${Math.floor(88 / Math.max(letterCount, 8))}cqw, 6rem)`

  return (
    <div className="w-full" style={{ containerType: 'inline-size' }}>
      <div className="flex flex-wrap items-center justify-center gap-y-3">
        {words.map((word, wi) => (
          <div key={wi} className="flex gap-[0.4cqw] mx-[1.5cqw]">
            {word.split('').map((ch, ci) => {
              const open = revealedSet.has(ch)
              return (
                <div
                  key={ci}
                  className={`flex items-center justify-center font-quicksand font-black border ${
                    open ? 'bg-white text-slate-900 border-white' : 'bg-white/5 text-transparent border-white/15'
                  }`}
                  style={{
                    width: tileW,
                    height: `calc(${tileW} * 1.33)`,
                    fontSize: `calc(${tileW} * 0.55)`,
                    perspective: 600
                  }}
                >
                  <motion.span
                    initial={false}
                    animate={{ rotateX: open ? 0 : 90, opacity: open ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                    style={{ display: 'inline-block' }}
                  >
                    {ch}
                  </motion.span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function Tile({ ch, open, className }: { ch: string; open: boolean; className: string }) {
  return (
    <div
      className={`${className} flex items-center justify-center font-quicksand font-black border ${
        open ? 'bg-white text-slate-900 border-white' : 'bg-white/5 text-transparent border-white/15'
      }`}
      style={{ perspective: 600 }}
    >
      <motion.span
        initial={false}
        animate={{ rotateX: open ? 0 : 90, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ display: 'inline-block' }}
      >
        {ch}
      </motion.span>
    </div>
  )
}
