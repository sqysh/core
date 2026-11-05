'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

// Vector Sqysh, traced from the measured silhouette of sqysh.webp so the parts
// can move. Shared by the correction modal (pop + idle) and the check-in screen
// (wave on arrival).
//
//   idle     darting eyes with holds, tentacles swaying out of phase
//   excited  happy-arc eyes, tentacles fling outward then spring back
//   wave     right-hand tentacle lifts and wags, eyes follow it
//   think    eyes up and to the side, inner tentacles drum like fingers on a desk

export type SqyshMode = 'idle' | 'excited' | 'wave' | 'think'

export const SQYSH_SKIN = ['#f055f9', '#bf66ef', '#7c42e0'] as const

// Geometry in the asset's own 252x278 space. Lobe centres sit on the body's
// bottom edge; the inner pair are bigger and hang lower, as drawn.
const BODY = 'M31,240 C22,206 6,160 6,116 C6,52 48,12 126,12 C204,12 246,52 246,116 C246,160 230,206 221,240 Z'

// fling: how far each lobe flies outward on the excited splat, signed away from centre.
const LOBES = [
  { cx: 55, cy: 232, r: 22, fling: -18 },
  { cx: 108, cy: 241, r: 27, fling: -7 },
  { cx: 160, cy: 240, r: 27, fling: 7 },
  { cx: 205, cy: 230, r: 22, fling: 18 }
]

const WAVER = 3 // the outer-right lobe does the waving
const DRUMMERS = [1, 2] // the inner pair drum while thinking

const EYES = [
  { cx: 78.5, hx: 75 },
  { cx: 172.5, hx: 168 }
]

const IDLE_EYES = {
  x: [0, 0, 9, 9, -9, -9, 0, 0],
  times: [0, 0.22, 0.3, 0.5, 0.58, 0.78, 0.86, 1]
}

export function SqyshVector({
  mode,
  reduce,
  className = 'block h-full w-auto overflow-visible',
  id = 'sq-skin'
}: {
  mode: SqyshMode
  reduce: boolean
  className?: string
  /** Gradient id; pass something unique if two Sqyshes share a page */
  id?: string
}) {
  const excited = mode === 'excited'
  const waving = mode === 'wave'
  const thinking = mode === 'think'
  const happy = excited || waving

  return (
    <svg viewBox="0 0 252 278" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="252" y2="278">
          <stop offset="0" stopColor={SQYSH_SKIN[0]} />
          <stop offset="0.5" stopColor={SQYSH_SKIN[1]} />
          <stop offset="1" stopColor={SQYSH_SKIN[2]} />
        </linearGradient>
      </defs>

      <motion.g
        animate={reduce ? undefined : { scaleY: [1, 1.015, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '50%', originY: '100%' }}
      >
        {LOBES.map((l, i) => {
          const isWaver = waving && i === WAVER
          const isDrummer = thinking && DRUMMERS.includes(i)

          const animate = reduce
            ? undefined
            : isWaver
              ? // Lift clear of the body, wag three times, drop back
                {
                  x: [0, 22, 34, 22, 34, 22, 34, 0],
                  y: [0, -46, -52, -46, -52, -46, -52, 0],
                  scale: [1, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 1]
                }
              : isDrummer
                ? { x: 0, y: [0, -10, 0] }
                : excited
                  ? {
                      x: [0, 0, l.fling, -l.fling * 0.3, l.fling * 0.12, 0],
                      y: [0, 0, 8, -3, 1, 0]
                    }
                  : { x: [0, 2.5, 0, -2.5, 0], y: 0 }

          const transition = isWaver
            ? { duration: 1.4, times: [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 1], ease: 'easeInOut' as const }
            : isDrummer
              ? { duration: 0.36, delay: (i - DRUMMERS[0]) * 0.18, repeat: Infinity, ease: 'easeInOut' as const }
              : excited
                ? { duration: 0.95, times: [0, 0.47, 0.6, 0.76, 0.88, 1], ease: 'easeOut' as const }
                : { duration: 2.6, delay: i * 0.35, repeat: Infinity, ease: 'easeInOut' as const }

          return (
            <motion.circle
              key={i}
              cx={l.cx}
              cy={l.cy}
              r={l.r}
              fill={`url(#${id})`}
              animate={animate}
              transition={transition}
            />
          )
        })}

        <path d={BODY} fill={`url(#${id})`} />

        {/* Eyes: dart while idle, glance at the waving tentacle, look up and away while thinking, hold while excited */}
        <motion.g
          animate={
            reduce || excited
              ? { x: 0, y: 0 }
              : waving
                ? { x: 7, y: 0 }
                : thinking
                  ? { x: -9, y: -9 }
                  : { x: IDLE_EYES.x, y: 0 }
          }
          transition={
            excited || waving || thinking
              ? { duration: 0.25 }
              : { duration: 5.2, times: IDLE_EYES.times, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          <motion.g
            initial={{ opacity: happy ? 0 : 1 }}
            animate={{ opacity: happy ? 0 : 1 }}
            transition={{ duration: 0.12 }}
          >
            {EYES.map((e) => (
              <g key={e.cx}>
                <ellipse cx={e.cx} cy="113.5" rx="15.5" ry="20.5" fill="#0b0b12" />
                <ellipse cx={e.hx} cy="105.5" rx="3.2" ry="5.5" fill="#ffffff" />
              </g>
            ))}
          </motion.g>

          <motion.g
            fill="none"
            stroke="#0b0b12"
            strokeWidth="7"
            strokeLinecap="round"
            initial={{ opacity: happy ? 1 : 0 }}
            animate={{ opacity: happy ? 1 : 0 }}
            transition={{ duration: 0.12 }}
          >
            {EYES.map((e) => (
              <path key={e.cx} d={`M${e.cx - 16.5},122 Q${e.cx},96 ${e.cx + 16.5},122`} />
            ))}
          </motion.g>
        </motion.g>
      </motion.g>
    </svg>
  )
}

// ─── TypeText ─────────────────────────────────────────────────────────────────
// Types `text` one character at a time, `startAt` seconds after mount. The full
// line sits underneath, invisible, so the bubble is already its final size
// before the first letter lands. Shared with the check-in screen.

export const TYPE_MS = 34

export function TypeText({
  text,
  startAt = 0,
  reduce,
  onDone
}: {
  text: string
  startAt?: number
  reduce: boolean
  onDone?: () => void
}) {
  const [shown, setShown] = useState(reduce ? text.length : 0)
  const typing = shown < text.length

  // Latest onDone without making it an effect dep; callers pass inline functions
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (reduce) return
    let n = 0
    let interval: ReturnType<typeof setInterval> | undefined
    const start = setTimeout(() => {
      interval = setInterval(() => {
        n += 1
        setShown(n)
        if (n >= text.length) clearInterval(interval)
      }, TYPE_MS)
    }, startAt * 1000)
    return () => {
      clearTimeout(start)
      if (interval) clearInterval(interval)
    }
  }, [text, startAt, reduce])

  // Fire onDone from an effect, never from inside a state updater
  useEffect(() => {
    if (shown >= text.length) onDoneRef.current?.()
  }, [shown, text.length])

  return (
    <span className="relative inline-block">
      <span className="invisible" aria-hidden="true">
        {text}
      </span>
      <span className="absolute inset-0 text-left" aria-hidden="true">
        {text.slice(0, shown)}
        {typing && <span className="ml-px inline-block h-[0.95em] w-[2px] translate-y-[0.12em] bg-(--key)" />}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  )
}

// ─── SqyshGuide ───────────────────────────────────────────────────────────────
// Sqysh in the top-right corner walking someone through a page, one line at a
// time: drops in, waves, types the first line, then Next / Got it. Pass a
// `storageKey` and he only does it once per browser for that key.
//
// Fixed to the top of the viewport, so it stays put while the page scrolls. It sets the
// --key colour itself so it works on light and dark pages.

export function SqyshGuide({
  lines,
  storageKey,
  onDone,
  accent = '#a855f7'
}: {
  lines: string[]
  storageKey?: string
  onDone?: () => void
  accent?: string
}) {
  const reduce = !!useReducedMotion()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [typed, setTyped] = useState(false)
  const [mode, setMode] = useState<SqyshMode>('wave')

  // Mount check: skip if this guide has already been seen
  useEffect(() => {
    if (storageKey) {
      try {
        if (localStorage.getItem(storageKey)) return
      } catch {
        // storage blocked; just show it
      }
    }
    setOpen(true)
  }, [storageKey])

  useEffect(() => {
    if (!open || reduce) {
      setMode('idle')
      return
    }
    const id = setTimeout(() => setMode('idle'), 1900)
    return () => clearTimeout(id)
  }, [open, reduce])

  function finish() {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, '1')
      } catch {
        // fine
      }
    }
    setOpen(false)
    onDone?.()
  }

  function next() {
    if (step + 1 >= lines.length) return finish()
    setTyped(false)
    setMode('excited')
    setTimeout(() => setMode('idle'), 900)
    setStep((s) => s + 1)
  }

  if (!open) return null

  const last = step + 1 >= lines.length

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-end gap-3 px-4 pt-[calc(env(safe-area-inset-top)+12px)]"
      style={{ ['--key' as string]: accent }}
    >
      <div
        key={step}
        className="pointer-events-auto relative mt-1 min-w-0 flex-1 border border-border-light bg-bg-light px-4 py-3 shadow-lg dark:border-border-dark dark:bg-surface-dark opacity-0 animate-[ciLift_0.5s_cubic-bezier(0.16,1,0.3,1)_0.3s_both]"
      >
        <p className="m-0 font-sora text-[15px] font-semibold leading-snug tracking-[-0.015em] text-text-light dark:text-text-dark xs:text-[16px]">
          <TypeText
            text={lines[step]}
            startAt={step === 0 ? 0.7 : 0.15}
            reduce={reduce}
            onDone={() => setTyped(true)}
          />
        </p>
        <div
          className={`mt-3 flex items-center justify-between gap-3 transition-opacity duration-300 ${
            typed ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <span className="font-mono text-[11px] tabular-nums text-muted-light dark:text-muted-dark">
            {step + 1} / {lines.length}
          </span>
          <div className="flex gap-2">
            {!last && (
              <button
                type="button"
                onClick={finish}
                className="flex h-11 items-center justify-center border border-border-light px-4 font-mono text-[12px] text-muted-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--key) dark:border-border-dark dark:text-muted-dark"
              >
                Skip
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="flex h-11 items-center justify-center bg-(--key) px-5 font-sora text-[13px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--key)"
            >
              {last ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
        <span
          className="absolute -right-1.75 top-6 h-3 w-3 rotate-45 border-r border-t border-border-light bg-bg-light dark:border-border-dark dark:bg-surface-dark"
          aria-hidden="true"
        />
      </div>

      <motion.div
        className="h-16 shrink-0 xs:h-18"
        initial={reduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -36, scale: 0.6 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.34, 1.4, 0.64, 1] }}
      >
        <motion.div
          className="h-full drop-shadow-[0_0_18px_rgba(168,85,247,0.45)]"
          animate={reduce ? undefined : { y: [0, -5, 0], rotate: [0, -1.5, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        >
          <SqyshVector mode={mode} reduce={reduce} id="sq-skin-guide" />
        </motion.div>
      </motion.div>
    </div>
  )
}
