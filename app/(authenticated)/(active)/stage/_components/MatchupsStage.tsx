'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { sendMatchupEmails } from '@/lib/actions/matchups/sendMatchupEmails'

interface Member {
  id: string
  name: string
  company: string
  profileImage: string | null
}

interface Pair {
  id: string
  requester: Member
  recipient: Member
}

const SET_TICK_MS = 600
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&.'
const FLAP_MS = 50
const CHAR_STAGGER = 0.028
const ROW_STAGGER = 0.22

// base tile size in px; the whole board is scaled to fit the screen, so these set
// the look and the scaler keeps everyone on screen
const TW = 52
const TH = 86
const GAP = 4
const AW = 50
const FONT = 44

type Phase = 'ready' | 'set' | 'reveal'

// kept-alive audio per sound, rewound before each play (plays once the TV is unlocked)
const audioCache = new Map<string, HTMLAudioElement>()
function playSfx(name: string, vol = 0.5) {
  try {
    let a = audioCache.get(name)
    if (!a) {
      a = new Audio(`/sound-effects/${name}.mp3`)
      audioCache.set(name, a)
    }
    a.volume = vol
    a.currentTime = 0
    a.play().catch(() => {})
  } catch {}
}

// one split-flap tile: cycles random glyphs, then settles on its letter
function Flap({
  target,
  delay,
  reduce,
  w,
  h,
  font
}: {
  target: string
  delay: number
  reduce: boolean
  w: number
  h: number
  font: number
}) {
  const final = target.toUpperCase()
  const blank = final === ' '
  const [ch, setCh] = useState(reduce || blank ? final : ' ')
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (reduce || blank) {
      setCh(final)
      return
    }
    let steps = 5 + Math.floor(Math.random() * 7)
    let iv: ReturnType<typeof setInterval>
    const start = setTimeout(() => {
      iv = setInterval(() => {
        steps--
        setFrame((f) => f + 1)
        if (steps <= 0) {
          clearInterval(iv)
          setCh(final)
        } else {
          setCh(GLYPHS[Math.floor(Math.random() * GLYPHS.length)])
        }
      }, FLAP_MS)
    }, delay * 1000)
    return () => {
      clearTimeout(start)
      clearInterval(iv)
    }
  }, [final, delay, reduce, blank])

  return (
    <span
      className="relative inline-grid place-items-center overflow-hidden font-mono font-extrabold"
      style={{
        width: w,
        height: h,
        fontSize: font,
        color: '#f3f6fb',
        background: 'linear-gradient(#1b2433 0 50%, #0d121c 50% 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.65)',
        perspective: '340px'
      }}
    >
      <span
        className="pointer-events-none absolute inset-x-0 z-20"
        style={{ top: '50%', height: 2, transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.8)' }}
        aria-hidden="true"
      />
      <motion.span
        key={frame}
        initial={reduce ? false : { rotateX: -78, opacity: 0.45 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className="relative z-10 block"
        style={{ lineHeight: 1, transformOrigin: 'center' }}
      >
        {ch === ' ' ? ' ' : ch}
      </motion.span>
    </span>
  )
}

function FlapRow({
  pair,
  rowIndex,
  width,
  reduce,
  u
}: {
  pair: Pair
  rowIndex: number
  width: number
  reduce: boolean
  u: number
}) {
  const left = pair.requester.name.toUpperCase().padStart(width)
  const right = pair.recipient.name.toUpperCase().padEnd(width)
  const base = rowIndex * ROW_STAGGER
  const w = TW * u
  const h = TH * u
  const font = FONT * u

  return (
    <div className="flex items-center justify-center" style={{ gap: GAP * u }}>
      {[...left].map((c, i) => (
        <Flap key={`l${i}`} target={c} delay={base + i * CHAR_STAGGER} reduce={reduce} w={w} h={h} font={font} />
      ))}
      <span
        className="grid place-items-center font-mono font-black text-primary-dark"
        style={{ width: AW * u, height: h, fontSize: font * 0.8, background: 'rgba(96,165,250,0.16)' }}
      >
        &rarr;
      </span>
      {[...right].map((c, i) => (
        <Flap
          key={`r${i}`}
          target={c}
          delay={base + (width + 1 + i) * CHAR_STAGGER}
          reduce={reduce}
          w={w}
          h={h}
          font={font}
        />
      ))}
    </div>
  )
}

export default function MatchupsStage({
  pairs,
  isSuperUser,
  autoStart = false
}: {
  pairs: Pair[]
  isSuperUser: boolean
  autoStart?: boolean
}) {
  const reduce = !!useReducedMotion()
  const [phase, setPhase] = useState<Phase>('ready')
  const [count, setCount] = useState(3)
  const firedRef = useRef(false)

  // one column width that fits the longest FULL first name, so nobody is cut off
  const width = useMemo(() => {
    const lens = pairs.flatMap((p) => [p.requester.name.length, p.recipient.name.length])
    return Math.max(6, ...(lens.length ? lens : [6]))
  }, [pairs])

  // one multiplier applied to every tile dimension so the board fits the screen
  // (and grows when there's room). Scaling the sizes — not a CSS transform — keeps
  // the real layout box correct so the header and footer never get pushed off.
  const [u, setU] = useState(0.7)
  useEffect(() => {
    if (phase !== 'reveal') return
    const calc = () => {
      const cols = width // tiles per side
      const boardW = 2 * cols * TW + AW + 2 * cols * GAP
      const boardH = pairs.length * TH + (pairs.length - 1) * GAP * 2
      const availW = window.innerWidth * 0.97
      const availH = window.innerHeight * 0.88
      setU(Math.max(0.25, Math.min(availW / boardW, availH / boardH, 2.4)))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [phase, width, pairs.length])

  const begin = useCallback(() => {
    setCount(3)
    setPhase('set')
  }, [])

  useEffect(() => {
    if (autoStart && phase === 'ready' && pairs.length > 0) begin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  useEffect(() => {
    if (phase !== 'set') return
    if (count <= 0) {
      setPhase('reveal')
      return
    }
    const t = setTimeout(() => setCount((c) => c - 1), SET_TICK_MS)
    return () => clearTimeout(t)
  }, [phase, count])

  // on reveal: send emails once, run the board clatter, chime when it settles.
  // firedRef (not state) guards it so updating state can't re-run this effect and
  // clear the settle timeout before it fires.
  useEffect(() => {
    if (phase !== 'reveal' || firedRef.current) return
    firedRef.current = true
    // sendMatchupEmails()
    playSfx('flap-clatter', 0.55)
    const settleMs = pairs.length * ROW_STAGGER * 1000 + 1400
    const t = setTimeout(() => playSfx('flap-done', 0.6), settleMs)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // no pairs this week: say so instead of crashing on an undefined matchup
  if (pairs.length === 0) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#070a10] flex flex-col items-center justify-center gap-6">
        <p className="font-mono text-[13px] tracking-[0.3em] uppercase text-muted-dark">Coastal Referral Exchange</p>
        <p className="font-sora font-black text-[64px] text-white leading-none tracking-tight text-center">
          No 1-2-1s this week
        </p>
        <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-muted-dark">Check back next Thursday</p>
      </div>
    )
  }

  if (phase === 'ready') {
    return (
      <button
        onClick={begin}
        className="h-screen w-screen overflow-hidden bg-[#070a10] flex flex-col items-center justify-center gap-8 cursor-pointer group"
      >
        <p className="font-mono text-[13px] tracking-[0.3em] uppercase text-muted-dark">Coastal Referral Exchange</p>
        <p className="font-sora font-black text-[84px] text-white leading-none tracking-tight">1-2-1 Matchups</p>
        <motion.p
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="font-mono text-[11px] tracking-[0.25em] uppercase text-muted-dark mt-6 group-hover:text-primary-dark transition-colors"
        >
          Click anywhere to begin
        </motion.p>
      </button>
    )
  }

  if (phase === 'set') {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#070a10] flex flex-col items-center justify-center gap-10">
        <p className="font-mono text-[1.3vw] tracking-[0.35em] uppercase text-primary-dark">Find your partner</p>
        <motion.span
          key={count}
          initial={reduce ? false : { scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="font-sora font-black text-[26vh] leading-none tabular-nums text-white [text-shadow:0_0_90px_rgba(96,165,250,0.5)]"
        >
          {count > 0 ? count : 'Go'}
        </motion.span>
        <p className="font-mono text-[0.95vw] tracking-[0.25em] uppercase text-muted-dark">
          {pairs.length} matchups on the board
        </p>
      </div>
    )
  }

  // the split-flap departures board
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[radial-gradient(120%_90%_at_50%_-10%,#0d1420_0%,#080c13_60%,#05080d_100%)] flex flex-col items-center justify-center">
      {/* board (every dimension scaled by u to fill the screen) */}
      <div className="flex flex-col items-center" style={{ gap: GAP * 2 * u }}>
        {pairs.map((p, i) => (
          <FlapRow key={p.id} pair={p} rowIndex={i} width={width} reduce={reduce} u={u} />
        ))}
      </div>

      <motion.p
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: pairs.length * ROW_STAGGER + 0.8 }}
        className="absolute bottom-[2vh] font-mono text-[0.95vw] tracking-[0.2em] uppercase text-muted-dark"
      >
        Emails sent &middot; check your inbox
      </motion.p>

      {isSuperUser && (
        <button
          onClick={begin}
          className="absolute bottom-6 right-6 z-30 h-8 px-4 border border-border-dark text-muted-dark font-mono text-[9px] tracking-[0.15em] uppercase hover:border-primary-dark hover:text-primary-dark transition-colors"
        >
          Run it again
        </button>
      )}
    </div>
  )
}
