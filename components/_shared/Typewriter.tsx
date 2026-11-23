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
  // what has been typed so far, and the props it was typed for: when any of them changes it starts over from nothing
  const [typed, setTyped] = useState<{ count: number; deps: readonly unknown[] }>({ count: 0, deps: [] })
  const deps = [text, speed, startDelay, onComplete] as const
  const current = typed.deps.length === deps.length && deps.every((d, k) => Object.is(d, typed.deps[k]))
  const displayed = current ? text.slice(0, typed.count) : ''

  useEffect(() => {
    const forDeps = [text, speed, startDelay, onComplete] as const
    let i = 0
    let interval: ReturnType<typeof setInterval> | null = null

    const startTimer = setTimeout(() => {
      interval = setInterval(() => {
        i++
        setTyped({ count: i, deps: forDeps })

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
