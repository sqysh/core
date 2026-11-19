import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { Corner, Spot } from '@/app/(authenticated)/(active)/check-in/_lib/types'

// One Sqysh for the whole scene. He lives in the riser (so he moves with the
// ring for free) and is driven through four spots in pixels: off-stage below
// the ring, its centre, parked on its top edge, and the top-right corner.
export function useSqyshStage() {
  const riserRef = useRef<HTMLDivElement | null>(null)
  const slotRef = useRef<HTMLDivElement | null>(null)
  const [sq, setSq] = useState<{ w: number; h: number } | null>(null)
  const [spot, setSpot] = useState<Spot>('below')
  const [corner, setCorner] = useState<Corner | null>(null)

  // Where the top-right corner is, relative to the riser. Measured when needed
  // (riser settled) rather than at mount.
  const measureCorner = useCallback(() => {
    const r = riserRef.current?.getBoundingClientRect()
    const slot = slotRef.current?.getBoundingClientRect()
    if (!r || !slot || !sq) return null
    const size = window.innerWidth < 480 ? 64 : 72
    const cw = (size * 252) / 278
    return {
      x: window.innerWidth - 16 - cw / 2 - (r.left + r.width / 2),
      y: slot.top + size / 2 - (r.top + r.height / 2),
      scale: cw / sq.w
    }
  }, [sq])

  const jumpToCorner = useCallback(() => {
    const c = measureCorner()
    if (!c) return false
    setCorner(c)
    setSpot('corner')
    return true
  }, [measureCorner])

  useLayoutEffect(() => {
    function measure() {
      const r = riserRef.current
      if (!r) return
      const w = r.offsetWidth * 0.67
      setSq({ w, h: (w * 278) / 252 })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  return { riserRef, slotRef, sq, spot, setSpot, corner, jumpToCorner }
}
