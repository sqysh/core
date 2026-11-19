import { useEffect } from 'react'
import { playCheckInChime } from '@/lib/audio/checkInChime'
import { getAudioContext } from '@/lib/audio/audioContext'

/** How long after landing a first tap still counts, for phones that won't play sound before a touch */
const TAP_WINDOW_MS = 20_000

// A fresh check-in rings a soft "accepted" chime and a double buzz. Browsers often hold sound back until the page has
// had a touch, so if it can't ring right away it rings on the first tap in the next few seconds.
export function useCheckInChime(active: boolean) {
  useEffect(() => {
    if (!active) return
    navigator.vibrate?.([30, 50, 30])
    getAudioContext()
    if (playCheckInChime()) return

    const onTap = () => {
      // the same tap that wakes the audio context; give it a beat to start running
      setTimeout(() => {
        if (playCheckInChime()) cleanup()
      }, 50)
    }
    const cleanup = () => {
      window.removeEventListener('pointerdown', onTap)
      clearTimeout(timer)
    }
    const timer = setTimeout(cleanup, TAP_WINDOW_MS)
    window.addEventListener('pointerdown', onTap)
    return cleanup
  }, [active])
}
