'use client'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

interface LetterTrayProps {
  revealed: string[] // hits
  guessed: string[] // every attempt
  compact?: boolean
}

export default function LetterTray({ revealed, guessed, compact }: LetterTrayProps) {
  const hitSet = new Set(revealed)
  const guessedSet = new Set(guessed)

  const size = compact ? 'w-6 h-6 text-[11px]' : 'w-14 h-14 text-xl'

  return (
    <div className={`flex flex-wrap justify-center ${compact ? 'gap-1' : 'gap-2'}`}>
      {ALPHABET.map((L) => {
        const tried = guessedSet.has(L)
        const hit = hitSet.has(L)
        let cls = 'border-white/15 text-white/70'
        if (tried && hit) cls = 'border-emerald-400 text-emerald-300 bg-emerald-400/10'
        else if (tried) cls = 'border-white/5 text-white/25 line-through'
        return (
          <div key={L} className={`${size} flex items-center justify-center border-2 font-mono font-bold ${cls}`}>
            {L}
          </div>
        )
      })}
    </div>
  )
}
