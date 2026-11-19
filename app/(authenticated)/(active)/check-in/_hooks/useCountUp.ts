import { useEffect, useRef } from 'react'

// Count the percentage up as the arc draws
export function useCountUp(pct: number, settle: number) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = `${pct}%`
      return
    }

    let frame = 0
    const start = performance.now() + (settle + 0.75) * 1000
    const dur = 950

    function tick(t: number) {
      const p = Math.min(1, Math.max(0, (t - start) / dur))
      const eased = 1 - Math.pow(1 - p, 3)
      if (el) el.textContent = `${Math.round(eased * pct)}%`
      if (p < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [pct, settle])

  return ref
}
