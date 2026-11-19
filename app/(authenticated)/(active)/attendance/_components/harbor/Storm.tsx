'use client'

import { MutableRefObject, RefObject, useEffect, useRef, useState } from 'react'
import { StormAudio, startStormAudio } from '@/app/(authenticated)/(active)/attendance/_lib/stormAudio'
import {
  LIGHTNING_FROM,
  LIGHTNING_UNTIL,
  STORM_SECONDS,
  TRACKS,
  sample
} from '@/app/(authenticated)/(active)/attendance/_lib/stormTimeline'
import { HORIZON_Y, SCENE_W } from '@/app/(authenticated)/(active)/attendance/_lib/harborMap'
import { Cloud, STORM_TONE } from './Sky'
import { SKY_H, SkyRenderer, Weather } from './StormSky'

const VARS = ['--roll', '--storm', '--wave', '--part', '--sun'] as const

// Plain dark clouds, only used when the TV can't run WebGL
const FALLBACK_CLOUDS = [
  { top: -3, w: 48, left: -6 },
  { top: 4, w: 54, left: 12 },
  { top: -2, w: 62, left: 30 },
  { top: 9, w: 50, left: 46 },
  { top: 0, w: 58, left: 60 },
  { top: 12, w: 46, left: 74 },
  { top: 5, w: 52, left: 88 }
]

// Rain in three depths: fine and slow far off, long heavy streaks close to the glass
const RAIN_LAYERS = [
  { n: 700, len: [9, 16], speed: [1.0, 1.35], width: 1, color: '190,208,235', alpha: 0.24 },
  { n: 420, len: [18, 32], speed: [1.45, 1.9], width: 1.5, color: '200,216,240', alpha: 0.32 },
  { n: 120, len: [46, 80], speed: [2.3, 2.9], width: 2.8, color: '215,228,248', alpha: 0.2 }
] as const

type Pt = [number, number]
interface Branch {
  pts: Pt[]
  /** Where along the parent it forks off, 0-1, so it can grow in step with the leader */
  at: number
  kids: Branch[]
}
interface Bolt {
  main: Branch
  born: number
}

/** A jagged line from a to b: split every segment at its middle and push the middle sideways, finer each pass */
function jag(a: Pt, b: Pt, spread: number, passes = 7): Pt[] {
  let pts: Pt[] = [a, b]
  let d = spread
  for (let i = 0; i < passes; i++) {
    const next: Pt[] = [pts[0]]
    for (let j = 1; j < pts.length; j++) {
      const [ax, ay] = pts[j - 1]
      const [bx, by] = pts[j]
      next.push([(ax + bx) / 2 + (Math.random() - 0.5) * d, (ay + by) / 2 + (Math.random() - 0.5) * d * 0.25], pts[j])
    }
    pts = next
    d /= 1.9
  }
  return pts
}

/** A main channel with forks, and forks off the forks, each heading down and outward and dying away */
function growBolt(a: Pt, b: Pt, h: number, depth = 0): Branch {
  const pts = jag(a, b, Math.abs(b[1] - a[1]) * 0.28)
  const kids: Branch[] = []
  const forks = depth === 0 ? 3 + Math.floor(Math.random() * 3) : depth === 1 ? Math.floor(Math.random() * 2) : 0
  for (let i = 0; i < forks; i++) {
    const at = 0.15 + Math.random() * 0.6
    const from = pts[Math.floor(at * (pts.length - 1))]
    const dir = Math.random() < 0.5 ? -1 : 1
    const len = h * (depth === 0 ? 0.12 + Math.random() * 0.16 : 0.05 + Math.random() * 0.06)
    const to: Pt = [from[0] + dir * len * (0.5 + Math.random() * 0.6), from[1] + len]
    kids.push({ ...growBolt(from, to, h, depth + 1), at })
  }
  return { pts, at: 0, kids }
}

/**
 * The storm. Start it with a new runKey and it plays through its timeline once: clouds roll in and the sea gets up,
 * a little rain turns to a downpour, thunder and lightning, then the clouds part. The weather is a handful of CSS
 * variables on the scene (the sea and boats read them) plus the WebGL sky; this layer draws the rain, splashes and
 * lightning bolts in front of everything.
 */
export function Storm({
  runKey,
  root,
  skyRef
}: {
  runKey: number
  root: RefObject<HTMLElement | null>
  skyRef: MutableRefObject<SkyRenderer | null>
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [on, setOn] = useState(false)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    if (!runKey) return
    const el = root.current
    const cv = canvas.current
    if (!el || !cv) return
    const sky = skyRef.current
    setFallback(!sky)
    setOn(true)

    const ctx = cv.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = 0
    let H = 0
    const resize = () => {
      W = window.innerWidth
      H = window.innerHeight
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // where the sky and sea sit on screen: the picture is scaled to the screen's width and hung from the top
    const scale = () => W / SCENE_W
    const horizon = () => HORIZON_Y * scale()

    const audio: StormAudio | null = startStormAudio()
    const rnd = (r: readonly [number, number]) => r[0] + Math.random() * (r[1] - r[0])
    const layers = RAIN_LAYERS.map((l) =>
      Array.from({ length: l.n }, () => ({
        x: Math.random() * 1.3,
        y: Math.random(),
        len: rnd(l.len),
        speed: rnd(l.speed)
      }))
    )
    const splashes: { x: number; y: number; s: number; born: number }[] = []

    const weather: Weather = {
      time: 0,
      roll: 0,
      storm: 0,
      rain: 0,
      part: 0,
      sun: 0,
      flash: 0,
      flashX: 0.5,
      flashY: 0.3
    }
    const start = performance.now()
    let last = start
    let raf = 0
    let nextStrike = LIGHTNING_FROM + Math.random() * 1.5
    let nextAudio = 0
    let screenFlash = 0
    let splashDebt = 0
    const bolts: Bolt[] = []
    const timers: ReturnType<typeof setTimeout>[] = []

    function strike(now: number) {
      const hz = horizon()
      const sheet = Math.random() < 0.3
      const x = W * (0.1 + Math.random() * 0.8)
      const cloudY = hz * (0.42 + Math.random() * 0.12)
      weather.flashX = x / W
      weather.flashY = cloudY / (SKY_H * scale())
      if (sheet) {
        // lightning inside the cloud: the deck lights up, no bolt reaches the sea
        weather.flash = 0.8
        screenFlash = Math.max(screenFlash, 0.18)
      } else {
        const ground: Pt = [x + (Math.random() - 0.5) * W * 0.1, hz * (0.99 + Math.random() * 0.08)]
        bolts.push({ main: growBolt([x, cloudY], ground, H), born: now })
      }
      // sound is slower than light: the closer the strike, the shorter the wait
      const wait = (sheet ? 1.2 : 0.2) + Math.random() * 2.2
      timers.push(setTimeout(() => audio?.thunder((sheet ? 0.6 : 1) * (1 - wait / 3.6)), wait * 1000))
    }

    /** Draws a branch up to `grow` (0-1) of its length; forks start once the leader passes their fork point */
    function path(b: Branch, grow: number) {
      const n = Math.max(2, Math.ceil(b.pts.length * Math.min(1, grow)))
      ctx.moveTo(b.pts[0][0], b.pts[0][1])
      for (let i = 1; i < n; i++) ctx.lineTo(b.pts[i][0], b.pts[i][1])
      for (const k of b.kids) if (grow > k.at) path(k, (grow - k.at) / (1 - k.at))
    }

    function drawBolt(b: Bolt, now: number) {
      const age = (now - b.born) / 1000
      // the stepped leader feels its way down, the return stroke blazes, then it flickers and is gone
      const grow = Math.min(1, age / 0.09)
      let a: number
      if (age < 0.09) a = 0.45
      else if (age < 0.16) a = 1
      else if (age < 0.22) a = 0.25
      else if (age < 0.3) a = 0.95
      else a = Math.max(0, 0.7 - (age - 0.3) * 2.4)
      if (age >= 0.09 && age < 0.1) {
        weather.flash = 1
        screenFlash = 0.55
      }
      if (age >= 0.22 && age < 0.235) {
        weather.flash = Math.max(weather.flash, 0.75)
        screenFlash = Math.max(screenFlash, 0.4)
      }
      ctx.globalCompositeOperation = 'lighter'
      for (const [width, color, alpha] of [
        [16, '120,140,255', 0.07],
        [8, '160,180,255', 0.16],
        [3.5, '210,222,255', 0.55],
        [1.5, '255,255,255', 1]
      ] as const) {
        ctx.beginPath()
        path(b.main, grow)
        ctx.lineWidth = width
        ctx.strokeStyle = `rgba(${color},${alpha * a})`
        ctx.stroke()
      }
      ctx.globalCompositeOperation = 'source-over'
      return age < 0.62
    }

    function frame(now: number) {
      const t = (now - start) / 1000
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now

      const roll = sample(TRACKS.roll, t)
      const storm = sample(TRACKS.storm, t)
      const wave = sample(TRACKS.wave, t)
      const rain = sample(TRACKS.rain, t)
      const part = sample(TRACKS.part, t)
      const sun = sample(TRACKS.sun, t)
      el!.style.setProperty('--roll', roll.toFixed(3))
      el!.style.setProperty('--storm', storm.toFixed(3))
      el!.style.setProperty('--wave', wave.toFixed(3))
      el!.style.setProperty('--part', part.toFixed(3))
      el!.style.setProperty('--sun', sun.toFixed(3))

      if (audio && now > nextAudio) {
        nextAudio = now + 200
        audio.set(rain, storm)
      }
      if (t >= nextStrike && t < LIGHTNING_UNTIL) {
        strike(now)
        nextStrike = t + 1.8 + Math.random() * 4
      }

      ctx.clearRect(0, 0, W, H)

      // rain: three depths of slanted streaks, swaying as the wind gusts
      const slant = 0.14 + 0.3 * storm + 0.07 * Math.sin(t * 0.45) * storm
      ctx.lineCap = 'round'
      RAIN_LAYERS.forEach((l, li) => {
        const count = Math.floor(l.n * rain)
        if (!count) return
        ctx.beginPath()
        for (let i = 0; i < count; i++) {
          const d = layers[li][i]
          const fall = d.speed * (0.85 + rain * 0.6) * dt
          d.y += fall
          d.x -= fall * slant * (H / W)
          if (d.y > 1.05) {
            d.y -= 1.1
            d.x = Math.random() * 1.3
          }
          if (d.x < -0.1) d.x += 1.3
          const x = d.x * W
          const y = d.y * H
          const len = d.len * (0.7 + rain * 0.5)
          ctx.moveTo(x, y)
          ctx.lineTo(x - slant * len, y + len)
        }
        ctx.lineWidth = l.width
        ctx.strokeStyle = `rgba(${l.color},${l.alpha + weather.flash * 0.25})`
        ctx.stroke()
      })

      // splashes: rings opening on the water, small far off and larger close up
      const hz = horizon()
      splashDebt += rain * rain * 140 * dt
      while (splashDebt >= 1 && splashes.length < 320) {
        splashDebt -= 1
        const y = hz + Math.pow(Math.random(), 0.7) * (H - hz)
        splashes.push({ x: Math.random() * W, y, s: 0.35 + ((y - hz) / Math.max(1, H - hz)) * 1.6, born: now })
      }
      splashDebt = Math.min(splashDebt, 5)
      ctx.lineWidth = 1.2
      for (let i = splashes.length - 1; i >= 0; i--) {
        const sp = splashes[i]
        const k = (now - sp.born) / 420
        if (k >= 1) {
          splashes.splice(i, 1)
          continue
        }
        const r = sp.s * (2 + 11 * k)
        ctx.beginPath()
        ctx.ellipse(sp.x, sp.y, r, r * 0.28, 0, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(225,236,250,${(1 - k) * 0.5})`
        ctx.stroke()
        if (k < 0.35) {
          // the crown: a few droplets thrown up as it lands
          ctx.beginPath()
          for (const dx of [-1, 0, 1])
            ctx.rect(sp.x + dx * sp.s * 3, sp.y - sp.s * 7 * Math.sin(k * 9), sp.s * 1.3, sp.s * 1.3)
          ctx.fillStyle = `rgba(235,242,252,${(1 - k / 0.35) * 0.6})`
          ctx.fill()
        }
      }

      for (let i = bolts.length - 1; i >= 0; i--) if (!drawBolt(bolts[i], now)) bolts.splice(i, 1)

      if (screenFlash > 0.01) {
        ctx.fillStyle = `rgba(214,226,255,${screenFlash})`
        ctx.fillRect(0, 0, W, H)
        screenFlash *= Math.exp(-dt * 9)
      }

      weather.time = t
      weather.roll = roll
      weather.storm = storm
      weather.rain = rain
      weather.part = part
      weather.sun = sun
      sky?.render(weather)
      weather.flash *= Math.exp(-dt * 6)

      if (t < STORM_SECONDS) raf = requestAnimationFrame(frame)
      else finish()
    }

    function finish() {
      for (const p of VARS) el!.style.removeProperty(p)
      ctx.clearRect(0, 0, W, H)
      sky?.clear()
      audio?.stop()
      setOn(false)
    }

    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      for (const id of timers) clearTimeout(id)
      window.removeEventListener('resize', resize)
      // a restart or leaving the page: put the weather and the sound away at once
      for (const p of VARS) el.style.removeProperty(p)
      sky?.clear()
      audio?.stop()
    }
  }, [runKey, root, skyRef])

  return (
    <>
      {fallback && (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ visibility: on ? 'visible' : 'hidden' }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-x-0 top-0"
            style={{
              height: '55%',
              background: 'linear-gradient(to bottom, rgba(26,32,54,0.92), rgba(26,32,54,0))',
              opacity: 'calc(var(--roll, 0) * (1 - var(--part, 0)))'
            }}
          />
          {FALLBACK_CLOUDS.map((c, i) => (
            <div
              key={i}
              className="absolute"
              style={
                {
                  top: `${c.top}%`,
                  left: `${c.left}%`,
                  width: `${c.w}%`,
                  height: `${c.w * 0.4}vw`,
                  '--i': i,
                  '--p': 'clamp(0, calc(var(--roll, 0) * 1.7 - var(--i) * 0.12), 1)',
                  transform: `translateX(calc((1 - var(--p)) * -130vw + var(--part, 0) * ${i % 2 ? '' : '-'}110vw))`,
                  opacity: 'calc(var(--p) * (1 - var(--part, 0) * 0.85))'
                } as React.CSSProperties
              }
            >
              <Cloud variant={i} tone={STORM_TONE} />
            </div>
          ))}
        </div>
      )}
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
    </>
  )
}
