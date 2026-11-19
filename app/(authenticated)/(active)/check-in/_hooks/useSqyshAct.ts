import { useEffect, useRef, useState } from 'react'
import type { Script } from '../_lib/script'
import type { SqyshMode } from '../_lib/types'

// Sqysh's act, driven off the script's mode schedule
export function useSqyshAct(script: Script) {
  const [mode, setMode] = useState<SqyshMode>('idle')
  const reduce = useRef(false)

  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce.current) return
    const ids = script.modes.map(([at, m]) => setTimeout(() => setMode(m), at * 1000))
    return () => ids.forEach(clearTimeout)
  }, [script])

  return { mode, setMode, reduce }
}
