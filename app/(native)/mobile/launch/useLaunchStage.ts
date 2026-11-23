import { useCallback, useEffect, useRef, useState } from 'react'
import { CAMERA_MS, prefersReducedMotion } from './_components/launchMotion'

export type LaunchStage = 'landing' | 'signIn'

/**
 * Which face of the launch screen is showing. A change is ignored while the last one is still playing out (the camera's
 * move and the controls arriving), so repeated taps can't stack transitions.
 */
export function useLaunchStage() {
  const [stage, setStage] = useState<LaunchStage>('landing')
  const busy = useRef(false)
  const timer = useRef<number>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const go = useCallback((next: LaunchStage) => {
    if (busy.current) return
    busy.current = true
    setStage(next)
    timer.current = window.setTimeout(() => (busy.current = false), prefersReducedMotion() ? 250 : CAMERA_MS + 200)
  }, [])

  return { stage, go }
}
