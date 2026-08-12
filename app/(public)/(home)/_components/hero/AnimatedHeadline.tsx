import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const WORDS = ['Real business.', 'Real relationships.', 'Every Thursday.']

export function AnimatedHeadline() {
  const [index, setIndex] = useState(0)
  const [prevIndex, setPrevIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => {
        setPrevIndex(i)
        return (i + 1) % WORDS.length
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <span className="relative inline-block text-white xs:whitespace-nowrap" style={{ perspective: '1200px' }}>
      <span aria-hidden className="invisible inline-block">
        {WORDS.reduce((a, b) => (a.length > b.length ? a : b))}
      </span>

      <WordCubes key={`out-${prevIndex}`} word={WORDS[prevIndex]} mode="exit" />
      <WordCubes key={`in-${index}`} word={WORDS[index]} mode="enter" />
    </span>
  )
}

function WordCubes({ word, mode }: { word: string; mode: 'enter' | 'exit' }) {
  const letters = word.split('')

  return (
    <span className="absolute left-0 top-0 inline-block whitespace-nowrap">
      {letters.map((letter, i) => {
        const char = letter === ' ' ? '\u00A0' : letter

        return (
          <span key={i} className="relative inline-block align-baseline" style={{ transformStyle: 'preserve-3d' }}>
            <span aria-hidden className="inline-block invisible">
              {char}
            </span>

            <motion.span
              className="absolute left-0 top-0 w-full h-full flex items-center justify-center"
              initial={mode === 'enter' ? { rotateX: 90, opacity: 0 } : { rotateX: 0, opacity: 1 }}
              animate={mode === 'enter' ? { rotateX: 0, opacity: 1 } : { rotateX: -90, opacity: 0 }}
              transition={{
                duration: 0.5,
                delay: i * 0.05,
                ease: [0.65, 0, 0.35, 1],
                opacity: {
                  duration: 0.3,
                  delay: i * 0.05 + (mode === 'enter' ? 0.2 : 0)
                }
              }}
              style={{ transformOrigin: '50% 50%' }}
            >
              {char}
            </motion.span>
          </span>
        )
      })}
    </span>
  )
}
