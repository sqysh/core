'use client'

import { useEffect, useRef } from 'react'
import { EXTEND_H, HORIZON_Y, SCENE_H, SCENE_W } from '@/app/(authenticated)/(active)/attendance/_lib/harborMap'
import { lengthAt } from '@/app/(authenticated)/(active)/attendance/_lib/harborLayout'
import { playWash } from '@/app/(authenticated)/(active)/attendance/_lib/stormAudio'

/** Seconds between swells, picked fresh each time */
const GAP = [28, 85] as const
const SEA_BOTTOM = SCENE_H + EXTEND_H

/**
 * Now and then a big swell rolls in from the horizon toward the viewer, each a different size. Its crest is a band
 * of brighter water with a shadowed trough behind, growing taller as it nears (and foaming when it's a big one), and
 * every boat rises and rolls as it passes under, back to front. Boats carry a [data-swell] layer for this, with their
 * berth's depth in data-y.
 */
export function Swells({ depthLayer, triggerKey = 0 }: { depthLayer: HTMLElement | null; triggerKey?: number }) {
  const crest = useRef<HTMLDivElement>(null)
  const foam = useRef<HTMLDivElement>(null)
  const runRef = useRef<(size?: number) => void>(() => {})

  useEffect(() => {
    let raf = 0
    let timer: ReturnType<typeof setTimeout>
    let running = false

    function run(size = 0.3 + Math.random() * 0.7) {
      if (running) return
      running = true
      const seconds = 8 + size * 5 // bigger swells are longer and slower
      const start = performance.now()
      playWash(size, seconds)

      const frame = (now: number) => {
        const t = (now - start) / (seconds * 1000)
        // it covers the distant water slowly and speeds up on screen as it comes closer, like real perspective
        const y = HORIZON_Y + (SEA_BOTTOM + 200 - HORIZON_Y) * Math.pow(Math.min(1, t), 1.7)
        const near = lengthAt(y)
        const height = 30 + near * 0.55 * (0.4 + size)
        const fade = Math.min(1, t * 8, (1 - t) * 6)

        const c = crest.current
        if (c) {
          c.style.transform = `translateY(${(y - height / 2).toFixed(1)}px)`
          c.style.height = `${height.toFixed(1)}px`
          c.style.opacity = (fade * (0.5 + 0.5 * size)).toFixed(3)
        }
        const f = foam.current
        if (f) {
          f.style.transform = `translateY(${(y - height * 0.08).toFixed(1)}px) scaleY(${(0.4 + near / 600).toFixed(3)})`
          f.style.opacity = (fade * Math.max(0, size - 0.55) * 1.8).toFixed(3)
        }

        // each boat lifts as the crest reaches its depth and settles as it passes; it rolls up the face and down the back
        if (depthLayer) {
          const width = 40 + near * 0.6
          for (const el of depthLayer.querySelectorAll<HTMLElement>('[data-swell]')) {
            const by = Number(el.dataset.y)
            const d = (y - by) / width
            const env = Math.exp(-d * d)
            const lift = 34 * size * env * fade
            const roll = -9 * size * d * env * fade
            el.style.transform = `translateY(${(-lift).toFixed(2)}px) rotate(${roll.toFixed(2)}deg)`
          }
        }

        if (t < 1) raf = requestAnimationFrame(frame)
        else {
          running = false
          if (c) c.style.opacity = '0'
          if (f) f.style.opacity = '0'
          depthLayer?.querySelectorAll<HTMLElement>('[data-swell]').forEach((el) => (el.style.transform = ''))
          schedule()
        }
      }
      raf = requestAnimationFrame(frame)
    }

    function schedule() {
      clearTimeout(timer)
      timer = setTimeout(() => run(), (GAP[0] + Math.random() * (GAP[1] - GAP[0])) * 1000)
    }

    runRef.current = run
    schedule()
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [depthLayer])

  // a manual swell (the board's dev button)
  useEffect(() => {
    if (triggerKey) runRef.current(0.4 + Math.random() * 0.6)
  }, [triggerKey])

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        maskImage: 'url(/images/harbor/water-mask.png)',
        maskSize: '100% 100%',
        WebkitMaskImage: 'url(/images/harbor/water-mask.png)',
        WebkitMaskSize: '100% 100%'
      }}
      aria-hidden="true"
    >
      <div
        ref={crest}
        className="absolute left-0 top-0 will-change-transform"
        style={{
          width: SCENE_W,
          opacity: 0,
          background:
            'linear-gradient(to bottom, rgba(5,40,90,0) 0%, rgba(5,40,90,0.22) 18%, rgba(190,235,255,0.25) 42%, rgba(255,255,255,0.42) 50%, rgba(220,245,255,0.2) 58%, rgba(5,40,90,0.3) 74%, rgba(5,40,90,0) 100%)'
        }}
      />
      <div
        ref={foam}
        className="absolute left-0 top-0 will-change-transform"
        style={{
          width: SCENE_W,
          height: 14,
          opacity: 0,
          transformOrigin: 'center top',
          background:
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.85) 0 46px, rgba(255,255,255,0.25) 46px 70px, rgba(255,255,255,0.7) 70px 120px, rgba(255,255,255,0) 120px 160px)',
          filter: 'blur(1.5px)'
        }}
      />
    </div>
  )
}
