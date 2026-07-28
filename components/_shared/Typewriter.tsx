'use client'

import { useEffect, useState } from 'react'

interface TypewriterProps {
  text: string
  speed?: number
  startDelay?: number
  className?: string
  onComplete?: () => void
}

export function Typewriter({ text, speed = 30, startDelay = 0, className, onComplete }: TypewriterProps) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    setDisplayed('')

    let i = 0
    let interval: ReturnType<typeof setInterval> | null = null

    const startTimer = setTimeout(() => {
      interval = setInterval(() => {
        i++
        setDisplayed(text.slice(0, i))

        if (i >= text.length) {
          if (interval) clearInterval(interval)
          onComplete?.()
        }
      }, speed)
    }, startDelay)

    return () => {
      clearTimeout(startTimer)
      if (interval) clearInterval(interval)
    }
  }, [text, speed, startDelay, onComplete])

  return <span className={className}>{displayed}</span>
}
