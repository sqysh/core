import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Script } from '@/app/(authenticated)/(active)/check-in/_lib/script'
import type { SqyshMode } from '@/app/(authenticated)/(active)/check-in/_lib/types'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

// Sqysh's act, driven off the script's mode schedule
export function useSqyshAct(script: Script) {
  const [mode, setMode] = useState<SqyshMode>('idle')
  const reduce = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false
  )

  useEffect(() => {
    if (window.matchMedia(REDUCED_MOTION).matches) return
    const ids = script.modes.map(([at, m]) => setTimeout(() => setMode(m), at * 1000))
    return () => ids.forEach(clearTimeout)
  }, [script])

  return { mode, setMode, reduce }
}
