'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { SqyshMode, TYPE_MS, SqyshVector, TypeText } from '@/components/_shared/SqyshVector'
import { AttendanceCorrectionModal } from '@/components/member/attendance/AttendanceCorrectionModal'

interface CheckInClientProps {
  result: {
    success: boolean
    alreadyCheckedIn?: boolean
    error?: string
  }
  userName: string
  attendance: { attended: number; total: number }
  presenterName: string | null
  /** Newest first, at most three. Empty when there's nothing to reinstate. */
  missed: MissedMeeting[]
  /** What shipped this week. Empty and Sqysh skips the tour. */
  updates?: SqyshUpdate[]
  /** This week's counts, with links to log more before the Activity Round */
  week?: { f2f: number; referrals: number; tyfcb: number } | null
  /** True when this member is judging today's Guiding Light round */
  isGuidingLight?: boolean
  /** True when this member is hosting today's meeting (drives the stage from the remote) */
  isHost?: boolean
  /** True when this member is the treasurer (gives the report from the treasurer screen) */
  isTreasurer?: boolean
  /** Preview only: run the round-opened send-off on a timer instead of waiting for Pusher */
  previewOpen?: boolean
  /** True when this member is a super user (gets the command deck) */
  isSuper?: boolean
}

const JUDGE_HREF = '/stage/guiding-light/judge'
const REMOTE_HREF = '/stage/remote'
const TREASURER_HREF = '/treasurer'

export interface SqyshUpdate {
  title: string
  detail?: string
}

export interface MissedMeeting {
  meetingId: string
  date: string // YYYY-MM-DD
}

function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type StateKey = 'ok' | 'again' | 'window' | 'fail'

// ─── Script ───────────────────────────────────────────────────────────────────
// Sqysh floats in, greets, "logs" the attendance, celebrates, then parks on the
// ring and explains it. Everything downstream is timed off `settle`, the second
// the ring starts to draw, so adding a beat to his act shifts the rest along.

interface Bubble {
  at: number // seconds in
  until: number // seconds the fade-out starts; leave room to read after the typing finishes
  text: (name: string) => string
  dots?: boolean // trailing thinking dots
  parked?: boolean // shown after he's parked on the ring, so it sits higher
}

const TYPE_LAG = 0.3 // the bubble pops at `at`; typing starts this much later

interface Script {
  bubbles: Bubble[]
  modes: [number, SqyshMode][]
  settle: number
  headline: string
  sub: string
  clock: boolean
}

const EXPLAIN: Bubble = {
  at: 1.0,
  until: 6.6,
  parked: true,
  text: () => 'That’s your attendance this season. Tap the ring to see every Thursday.'
}

// Swapped in for EXPLAIN when they're judging today
const EXPLAIN_GL: Bubble = {
  at: 1.0,
  until: 7.6,
  parked: true,
  text: () => 'And you’re the Guiding Light today. Keep this screen open, I’ll bring the shortlist up myself.'
}

// Swapped in for EXPLAIN when they're hosting today
const EXPLAIN_HOST: Bubble = {
  at: 1.0,
  until: 7.6,
  parked: true,
  text: () => 'And you’re hosting today. Open the remote when you’re ready and I’ll walk you through it.'
}

const EXPLAIN_SUPER: Bubble = {
  at: 1.0,
  until: 7.6,
  parked: true,
  text: () => 'Command deck is ready. Open it when you want to run the room.'
}

// Swapped in for EXPLAIN when they're the treasurer today
const EXPLAIN_TREASURER: Bubble = {
  at: 1.0,
  until: 7.6,
  parked: true,
  text: () =>
    'And you’ve got the Treasurer’s report. Open your screen now and keep it up, I’ll cue you when it’s your turn.'
}

// Seconds after settle that Sqysh leaves the ring for the top of the screen
const TOUR_AT = 7.0

const SCRIPT: Record<StateKey, Script> = {
  ok: {
    bubbles: [
      { at: 0.95, until: 3.0, text: (n) => `Good morning, ${n}.` },
      { at: 3.15, until: 5.6, text: () => 'Logging your attendance', dots: true },
      { at: 5.75, until: 8.3, text: () => 'Done. You’re checked in.' }
    ],
    modes: [
      [0.9, 'wave'],
      [3.1, 'think'],
      [5.7, 'excited'],
      [7.9, 'idle']
    ],
    settle: 8.4,
    headline: "You're checked in.",
    sub: 'Checked in at ',
    clock: true
  },
  again: {
    bubbles: [
      { at: 0.95, until: 3.0, text: (n) => `Welcome back, ${n}.` },
      { at: 3.15, until: 5.2, text: () => 'Checking the log', dots: true },
      { at: 5.35, until: 8.2, text: () => 'You’re already in from earlier.' }
    ],
    modes: [
      [0.9, 'wave'],
      [3.1, 'think'],
      [5.3, 'excited'],
      [7.8, 'idle']
    ],
    settle: 8.3,
    headline: "You're already in.",
    sub: 'Logged earlier at ',
    clock: true
  },
  window: {
    bubbles: [{ at: 0.95, until: 4.3, text: (n) => `Hey, ${n}. Check-in opens Thursday at 7.` }],
    modes: [
      [0.9, 'wave'],
      [2.5, 'idle']
    ],
    settle: 4.5,
    headline: 'See you Thursday.',
    sub: 'Check-in opens Thursdays at 7:00am',
    clock: false
  },
  fail: {
    bubbles: [{ at: 0.95, until: 4.0, text: (n) => `Hey, ${n}. Something went wrong.` }],
    modes: [
      [0.9, 'wave'],
      [2.5, 'idle']
    ],
    settle: 4.2,
    headline: 'Something went wrong.',
    sub: '',
    clock: false
  }
}

// Full literal strings so Tailwind can see them at build time.
const GL_KEY = '[--key:#f5c542] [--key-soft:rgba(245,197,66,0.3)]'
const HOST_KEY = '[--key:#60a5fa] [--key-soft:rgba(96,165,250,0.3)]'
const SUPER_KEY = '[--key:#22d3ee] [--key-soft:rgba(34,211,238,0.3)]'
const TREASURER_KEY = '[--key:#818cf8] [--key-soft:rgba(129,140,248,0.3)]'
const KEY_VARS: Record<StateKey, string> = {
  ok: '[--key:#a855f7] [--key-soft:rgba(168,85,247,0.32)]',
  again: '[--key:#38bdf8] [--key-soft:rgba(56,189,248,0.32)]',
  window: '[--key:#fbbf24] [--key-soft:rgba(251,191,36,0.32)]',
  fail: '[--key:#f87171] [--key-soft:rgba(248,113,113,0.32)]'
}

const LIFT = 'animate-[ciLift_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards]'

// Routes for logging each one; point at your existing forms
const WEEK_ROWS = [
  { key: 'f2f', label: '1-2-1s', href: '/face-to-face/new' },
  { key: 'referrals', label: 'Referrals', href: '/referrals/new' },
  { key: 'tyfcb', label: 'Closed', href: '/thank-you/new' }
] as const

const delay = (...s: number[]) => ({ animationDelay: s.map((v) => `${v.toFixed(2)}s`).join(', ') })

// The jump from the ring to the corner: a quadratic curve from the parked spot
// to the landing spot, bowed upward, sampled with an eased parameter so Motion
// can tween it linearly point to point and it still reads as one smooth arc.
// He leans into the direction of travel and straightens as he lands.
function jumpPath(from: { x: number; y: number; scale: number }, to: { x: number; y: number; scale: number }) {
  const N = 16
  const ctrl = { x: from.x + (to.x - from.x) * 0.35, y: Math.min(from.y, to.y) - 72 }
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

  const x: number[] = []
  const y: number[] = []
  const scale: number[] = []
  const rotate: number[] = []

  for (let i = 0; i <= N; i++) {
    const u = ease(i / N)
    const a = (1 - u) * (1 - u)
    const b = 2 * (1 - u) * u
    const c = u * u
    x.push(a * from.x + b * ctrl.x + c * to.x)
    y.push(a * from.y + b * ctrl.y + c * to.y)
    // Shrink through the flight, with a small stretch at the top of the arc
    scale.push(from.scale + (to.scale - from.scale) * u + 0.03 * Math.sin(Math.PI * u))
    rotate.push(14 * Math.sin(Math.PI * u) * Math.sign(to.x - from.x))
  }

  return { x, y, scale, rotate }
}

// The offer, once Sqysh has landed in the corner. Sits in a fixed-width slot
// to his left so it can never run off the screen. Mounted when the tour starts,
// so every animation here is relative to mount.
function TourBubble({ reduce, onShow, onDismiss }: { reduce: boolean; onShow: () => void; onDismiss: () => void }) {
  return (
    <div className="pointer-events-auto relative ml-auto w-fit max-w-full border border-white/15 bg-white/7 px-4 py-3 backdrop-blur-md opacity-0 animate-[ciLift_0.5s_cubic-bezier(0.16,1,0.3,1)_0.3s_both]">
      <p className="m-0 font-sora text-[15px] font-semibold leading-snug tracking-[-0.015em] xs:text-[16px]">
        <TypeText text="Wanna see what I was up to this week?" startAt={0.7} reduce={reduce} />
      </p>
      <div className="mt-3 flex gap-2 opacity-0 animate-[ciLift_0.5s_cubic-bezier(0.16,1,0.3,1)_2.2s_forwards]">
        <button
          type="button"
          onClick={onShow}
          className="flex h-11 flex-1 items-center justify-center bg-(--key) px-4 font-sora text-[13px] font-bold text-[#09090f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Show me
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-11 items-center justify-center border border-white/20 px-4 font-mono text-[12px] text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Not now
        </button>
      </div>
      <span
        className="absolute -right-1.75 top-6 h-3 w-3 rotate-45 border-r border-t border-white/15 bg-white/7"
        aria-hidden="true"
      />
    </div>
  )
}

// The changelog panel. Slides up over the stage; the top Sqysh stays put above it.
function UpdatesPanel({ updates, onClose }: { updates: SqyshUpdate[]; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="This week at Sqysh"
      className="absolute inset-x-0 bottom-0 z-5 flex flex-col bg-[#09090f]/96 backdrop-blur-md top-[calc(env(safe-area-inset-top)+96px)] xs:top-[calc(env(safe-area-inset-top)+104px)] opacity-0 animate-[ciLift_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards]"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-105 flex-1 flex-col px-[max(24px,env(safe-area-inset-left))]">
        <p className="m-0 shrink-0 font-mono text-[10px] tracking-[0.22em] uppercase text-(--key)">
          This week at Sqysh
        </p>
        <h2 className="mt-2 shrink-0 font-sora text-[24px] font-black leading-[1.05] tracking-[-0.04em] text-balance xs:text-[28px]">
          What shipped since last Thursday
        </h2>

        <ol className="m-0 mt-5 min-h-0 flex-1 list-none overflow-y-auto p-0 pr-1">
          {updates.map((u, i) => (
            <li
              key={u.title}
              className="flex gap-3 border-t border-white/10 py-3.5 opacity-0 animate-[ciLift_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards]"
              style={delay(0.25 + i * 0.09)}
            >
              <span className="mt-0.5 w-6 shrink-0 font-mono text-[11px] tabular-nums text-(--key)">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <p className="m-0 font-sora text-[15px] font-semibold leading-snug tracking-[-0.01em]">{u.title}</p>
                {u.detail && (
                  <p className="m-0 mt-1 font-nunito text-[13px] leading-relaxed text-white/60">{u.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="shrink-0 border-t border-white/10 pt-4 pb-[max(26px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="flex h-13 w-full items-center justify-center gap-2 border border-white/20 bg-white/6 font-sora text-[14.5px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            Back to check-in
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CheckInClient({
  result,
  userName,
  attendance,
  presenterName,
  missed,
  updates = [],
  week = null,
  isGuidingLight = false,
  isHost = false,
  isTreasurer = false,
  previewOpen = false,
  isSuper
}: CheckInClientProps) {
  const router = useRouter()
  const firstName = userName.split(' ')[0]
  const [fixing, setFixing] = useState<MissedMeeting | null>(null)
  const [tour, setTour] = useState<'hidden' | 'ask' | 'open' | 'dismissed'>('hidden')

  // One Sqysh for the whole scene. He lives in the riser (so he moves with the
  // ring for free) and is driven through four spots in pixels: off-stage below
  // the ring, its centre, parked on its top edge, and the top-right corner.
  const riserRef = useRef<HTMLDivElement | null>(null)
  const slotRef = useRef<HTMLDivElement | null>(null)
  const [sq, setSq] = useState<{ w: number; h: number } | null>(null)
  const [spot, setSpot] = useState<'below' | 'centre' | 'park' | 'corner' | 'hover'>('below')
  const [sendOff, setSendOff] = useState(false)
  const [corner, setCorner] = useState<{ x: number; y: number; scale: number } | null>(null)
  const SUPER_HREF = '/stage/super'

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

  const stateKey: StateKey = result.success
    ? result.alreadyCheckedIn
      ? 'again'
      : 'ok'
    : result.error?.includes('7:00 AM')
      ? 'window'
      : 'fail'

  const script = SCRIPT[stateKey]
  const S = script.settle
  const pct = attendance.total > 0 ? Math.round((attendance.attended / attendance.total) * 100) : 0

  // Sqysh's act, driven off the script's mode schedule
  const [sqyshMode, setSqyshMode] = useState<SqyshMode>('idle')
  const reduceMotion = useRef(false)

  useEffect(() => {
    reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion.current) return
    const ids = script.modes.map(([at, mode]) => setTimeout(() => setSqyshMode(mode), at * 1000))
    return () => ids.forEach(clearTimeout)
  }, [script])

  const checkedIn = stateKey === 'ok' || stateKey === 'again'
  // The host and the judge each have a job; hosting wins if somehow both are true
  const sup = isSuper && checkedIn
  const host = isHost && checkedIn && !sup
  const treasurer = isTreasurer && checkedIn && !host && !sup
  const gl = isGuidingLight && checkedIn && !host && !treasurer && !sup

  // The judge needs the phone awake until the round opens and the redirect fires
  useEffect(() => {
    if (!gl || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null

    async function acquire() {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        // Low battery or a backgrounded tab; nothing to do but try again on return
      }
    }

    function onVisible() {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release()
    }
  }, [gl])

  // The judge waits here for the round to open. The global listener skips this
  // path so Sqysh can do the send-off: lift off the ring, get excited, say so,
  // then go to the shortlist. A hard cut would be the first thing they'd notice.
  useEffect(() => {
    if (!gl) return
    const timers: ReturnType<typeof setTimeout>[] = []

    // Hop up, get excited, say the line, jump to the corner, then change page.
    // He drops into that same corner on the judge screen, so it reads as one move.
    function sendOffAndGo() {
      setSendOff(true)
      setSpot('hover')
      setSqyshMode('excited')
      timers.push(
        setTimeout(() => setSqyshMode('idle'), 900),
        setTimeout(() => {
          const c = measureCorner()
          if (c) {
            setCorner(c)
            setSpot('corner')
          }
        }, 2300),
        setTimeout(() => router.push(previewOpen ? `${JUDGE_HREF}?preview=1` : JUDGE_HREF), 3500)
      )
    }

    if (previewOpen) {
      timers.push(setTimeout(sendOffAndGo, (S + 9) * 1000))
      return () => timers.forEach(clearTimeout)
    }

    const channel = getPusherClient().subscribe('guiding-light')
    channel.bind('round-opened', sendOffAndGo)

    return () => {
      timers.forEach(clearTimeout)
      channel.unbind_all()
      releaseChannel('guiding-light')
    }
  }, [gl, router, previewOpen, S, measureCorner])

  // Only after a real check-in, only when there's something to show, never for the judge or host
  const hasTour = updates.length > 0 && checkedIn && !gl && !host && !treasurer

  useEffect(() => {
    const ids = [setTimeout(() => setSpot('centre'), 150), setTimeout(() => setSpot('park'), (S + 0.1) * 1000)]
    if (hasTour && !sup) {
      ids.push(
        setTimeout(
          () => {
            const c = measureCorner()
            if (!c) return
            setCorner(c)
            setSpot('corner')
          },
          (S + TOUR_AT) * 1000
        ),
        setTimeout(() => setSqyshMode('wave'), (S + TOUR_AT + 0.9) * 1000),
        setTimeout(() => setSqyshMode('idle'), (S + TOUR_AT + 2.6) * 1000),
        setTimeout(() => setTour('ask'), (S + TOUR_AT + 0.6) * 1000)
      )
    }
    return () => ids.forEach(clearTimeout)
  }, [hasTour, S, measureCorner])

  const numRef = useRef<HTMLElement | null>(null)
  const [stamp, setStamp] = useState('')

  useEffect(() => {
    setStamp(
      new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
    )
  }, [])

  // Count the percentage up as the arc draws
  useEffect(() => {
    const el = numRef.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = `${pct}%`
      return
    }

    let frame = 0
    const start = performance.now() + (S + 0.75) * 1000
    const dur = 950

    function tick(t: number) {
      const p = Math.min(1, Math.max(0, (t - start) / dur))
      const eased = 1 - Math.pow(1 - p, 3)
      if (el) el.textContent = `${Math.round(eased * pct)}%`
      if (p < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [pct, S])

  const subText = script.clock ? `${script.sub}${stamp}` : script.sub || (result.error ?? 'Please try again.')
  const bubbles = !checkedIn
    ? script.bubbles
    : [
        ...script.bubbles,
        sup ? EXPLAIN_SUPER : host ? EXPLAIN_HOST : treasurer ? EXPLAIN_TREASURER : gl ? EXPLAIN_GL : EXPLAIN
      ]

  return (
    <div
      className={`ci-scene fixed inset-0 flex flex-col overflow-hidden bg-[#09090f] text-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${
        sup ? SUPER_KEY : host ? HOST_KEY : treasurer ? TREASURER_KEY : gl ? GL_KEY : KEY_VARS[stateKey]
      }`}
    >
      <div className="ci-grain pointer-events-none absolute inset-0 opacity-5 mix-blend-overlay" aria-hidden="true" />

      <p
        className={`relative z-4 shrink-0 px-4 pt-7 text-center font-mono text-[10px] tracking-[0.22em] uppercase text-white/35 opacity-0 animate-[ciFade_0.9s_ease_0.4s_forwards] transition-opacity duration-300 ${
          tour === 'hidden' ? '' : 'opacity-0!'
        }`}
      >
        Coastal Referral Exchange
      </p>

      {/* Stage: takes whatever height is left and centres the badge in it */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
        <div
          ref={riserRef}
          className="relative translate-y-22 animate-[ciUp_0.85s_cubic-bezier(0.65,0,0.35,1)_forwards]"
          style={delay(S)}
        >
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2"
            aria-hidden="true"
          >
            <div className="h-full w-full rounded-full bg-[radial-gradient(circle,var(--key-soft)_0%,transparent_62%)] opacity-0 animate-[ciHalo_5.4s_ease_forwards]" />
          </div>

          {sendOff && (
            <div className="absolute bottom-full left-1/2 z-3 mb-12 w-max max-w-[min(calc(100vw-2rem),300px)] border border-white/15 bg-white/7 px-4 py-3 text-center backdrop-blur-md xs:px-5 opacity-0 animate-[ciBubIn_0.55s_cubic-bezier(0.34,1.5,0.64,1)_0.35s_both,ciBubOut_0.4s_ease_2.1s_forwards]">
              <p className="relative m-0 font-sora text-[15px] font-semibold leading-snug tracking-[-0.015em] text-balance xs:text-[16px]">
                <TypeText text="Here we go. Opening your shortlist." startAt={0.6} reduce={reduceMotion.current} />
              </p>
              <span
                className="absolute left-1/2 -bottom-1.75 -ml-1.5 h-3 w-3 rotate-45 border-r border-b border-white/15 bg-white/7"
                aria-hidden="true"
              />
            </div>
          )}

          {/* Speech bubbles: all anchored above the ring, each on its own in/out timing */}
          {bubbles.map((b, i) => (
            <div
              key={i}
              className={`absolute bottom-full left-1/2 w-max max-w-[min(calc(100vw-2rem),300px)] border border-white/15 bg-white/7 px-4 py-3 text-center backdrop-blur-md xs:px-5 opacity-0 animate-[ciBubIn_0.55s_cubic-bezier(0.34,1.5,0.64,1)_both,ciBubOut_0.45s_ease_forwards] ${
                b.parked ? 'mb-8' : 'mb-3'
              }`}
              style={delay(b.parked ? S + b.at : b.at, b.parked ? S + b.until : b.until)}
            >
              <p className="relative m-0 font-sora text-[15px] font-semibold leading-snug tracking-[-0.015em] text-balance xs:text-[16px]">
                <TypeText
                  text={b.text(firstName)}
                  startAt={(b.parked ? S + b.at : b.at) + TYPE_LAG}
                  reduce={reduceMotion.current}
                />
                {b.dots && (
                  <span className="ml-0.5 inline-flex" aria-hidden="true">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="opacity-0 animate-[ciDots_1.2s_ease-in-out_infinite]"
                        style={delay(b.at + TYPE_LAG + (b.text(firstName).length * TYPE_MS) / 1000 + d * 0.2)}
                      >
                        .
                      </span>
                    ))}
                  </span>
                )}
              </p>
              <span
                className="absolute left-1/2 -bottom-1.75 -ml-1.5 h-3 w-3 rotate-45 border-r border-b border-white/15 bg-white/7"
                aria-hidden="true"
              />
            </div>
          ))}

          <Link
            href="/attendance/history"
            className="group relative block h-52 w-52 text-inherit no-underline xs:h-58 xs:w-58 sm:h-64 sm:w-64 focus-visible:outline-none"
            aria-label={`View your full attendance, ${pct} percent`}
          >
            <span
              className="ci-sheen absolute inset-2.5 rounded-full opacity-0 animate-[ciFade_0.9s_ease_forwards,ciSpin_4.2s_linear_infinite]"
              style={delay(S + 1.75, S + 1.75)}
              aria-hidden="true"
            />

            <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 168 168" aria-hidden="true">
              <circle
                className="fill-(--key) opacity-0 transition-opacity duration-200 group-hover:opacity-12 group-focus-visible:opacity-12 group-active:opacity-18"
                cx="84"
                cy="84"
                r="72"
              />
              <circle
                className="fill-none stroke-white/20 stroke-[2.6] [stroke-dasharray:1] [stroke-dashoffset:1] animate-[ciDraw_0.9s_cubic-bezier(0.65,0,0.35,1)_forwards]"
                style={delay(S + 0.25)}
                cx="84"
                cy="84"
                r="72"
                pathLength="1"
                transform="rotate(-90 84 84)"
              />
              <circle
                className="fill-none stroke-(--key) stroke-[4.5] [stroke-linecap:round] [stroke-dasharray:1] [stroke-dashoffset:1] animate-[ciArc_1s_cubic-bezier(0.65,0,0.35,1)_forwards]"
                style={delay(S + 0.75)}
                cx="84"
                cy="84"
                r="72"
                pathLength="1"
                transform="rotate(-90 84 84)"
              />
            </svg>

            <div
              className="absolute inset-0 flex flex-col items-center justify-center opacity-0 animate-[ciLift_0.6s_ease_forwards]"
              style={delay(S + 0.8)}
            >
              <span
                className="flex flex-col items-center animate-[ciPctMake_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards]"
                style={delay(S + 2.15)}
              >
                <b
                  ref={numRef}
                  className="font-sora text-[50px] font-extrabold leading-none tracking-[-0.04em] tabular-nums xs:text-[56px] sm:text-[60px]"
                >
                  0%
                </b>
                <i className="mt-2 font-mono text-[11px] not-italic tracking-[0.2em] uppercase text-white/55 xs:text-[12px]">
                  Attendance
                </i>
              </span>
              <u
                className="mt-0 max-h-0 overflow-hidden text-center font-mono text-[11px] leading-[1.4] tracking-[0.16em] uppercase text-(--key) xs:text-[12px] no-underline opacity-0 animate-[ciViewAll_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards]"
                style={delay(S + 2.15)}
              >
                View all →
              </u>
            </div>
          </Link>

          {sq && (
            <motion.div
              className="pointer-events-none absolute left-1/2 top-1/2 z-2"
              style={{ width: sq.w, height: sq.h, marginLeft: -sq.w / 2, marginTop: -sq.h / 2 }}
              initial={{ x: 0, y: sq.h * 0.37, scale: 0.55, opacity: 0 }}
              animate={
                spot === 'below'
                  ? { x: 0, y: sq.h * 0.37, scale: 0.55, opacity: 0 }
                  : spot === 'centre'
                    ? { x: 0, y: 0, scale: 1, opacity: 1 }
                    : spot === 'hover'
                      ? { x: 0, y: -sq.h * 0.58 - 36, scale: 0.55, rotate: 0, opacity: 1 }
                      : spot === 'park' || !corner
                        ? { x: 0, y: -sq.h * 0.58, scale: 0.4, rotate: 0, opacity: 1 }
                        : { ...jumpPath({ x: 0, y: -sq.h * 0.58, scale: 0.4 }, corner), opacity: 1 }
              }
              transition={
                spot === 'centre'
                  ? { duration: 0.85, ease: [0.34, 1.4, 0.64, 1] }
                  : spot === 'park'
                    ? { duration: 0.85, ease: [0.65, 0, 0.35, 1] }
                    : spot === 'corner'
                      ? { duration: 1.1, ease: 'linear' }
                      : spot === 'hover'
                        ? { type: 'spring', stiffness: 220, damping: 14 }
                        : { duration: 0 }
              }
            >
              <motion.div
                animate={sqyshMode === 'excited' ? { y: [0, -sq.h * 0.14, 0] } : { y: 0 }}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <div className="animate-[ciBob_3.4s_ease-in-out_1s_infinite] drop-shadow-[0_0_26px_rgba(168,85,247,0.45)]">
                  <SqyshVector
                    mode={sqyshMode}
                    reduce={reduceMotion.current}
                    className="block h-auto w-full overflow-visible"
                    id="sq-skin-checkin"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Resting content */}
      <div className="relative z-4 mx-auto w-full max-w-105 shrink-0 pb-6.5 pl-[max(24px,env(safe-area-inset-left))] pr-[max(24px,env(safe-area-inset-right))] text-center">
        <h1 className="m-0 font-sora text-[26px] font-black leading-[1.04] tracking-[-0.04em] text-balance xs:text-[30px]">
          <span className="block overflow-hidden pb-[0.09em]">
            <em
              className="block translate-y-[112%] not-italic animate-[ciReveal_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]"
              style={delay(S + 1.25)}
            >
              {sup
                ? 'Command deck.'
                : host
                  ? 'You\u2019re hosting today.'
                  : treasurer
                    ? 'You\u2019ve got the report.'
                    : gl
                      ? 'You\u2019re the Guiding Light.'
                      : script.headline}
            </em>
          </span>
        </h1>

        <p
          className={`mt-3 font-mono text-[11px] tracking-widest tabular-nums text-white/55 opacity-0 ${LIFT}`}
          style={delay(S + 1.65)}
        >
          {subText}
        </p>

        {sup ? (
          <div className={`mt-6 border-t border-white/10 pt-4 opacity-0 ${LIFT}`} style={delay(S + 1.85)}>
            <p className="m-0 font-mono text-[10px] tracking-[0.18em] uppercase text-(--key)">Command deck · online</p>
            <p className="mt-2 font-sora text-[17px] font-bold leading-snug tracking-[-0.02em] text-balance xs:text-[18px]">
              You have full control.
            </p>
            <p className="mx-auto mt-2 max-w-[36ch] font-nunito text-[14px] leading-relaxed text-white/70">
              Every screen, the teleprompter, the poll and the guiding light, all from your phone. Jump the TV anywhere,
              anytime.
            </p>
            <Link
              href={SUPER_HREF}
              className="relative mt-4 flex h-13 w-full items-center justify-center gap-2 overflow-hidden bg-(--key) font-sora text-[15px] font-black text-[#09090f] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <span
                className="absolute inset-y-0 left-[-45%] w-[36%] -skew-x-12 bg-linear-to-r from-transparent via-white/25 to-transparent animate-[ciSweep_5.5s_ease-in-out_infinite]"
                aria-hidden="true"
              />
              <span className="relative">Open the command deck</span>
              <span className="relative animate-[ciNudge_1.9s_ease-in-out_infinite]" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        ) : host ? (
          <div className={`mt-6 border-t border-white/10 pt-4 opacity-0 ${LIFT}`} style={delay(S + 1.85)}>
            <p className="m-0 font-mono text-[10px] tracking-[0.18em] uppercase text-(--key)">Host · today</p>
            <p className="mt-2 font-sora text-[17px] font-bold leading-snug tracking-[-0.02em] text-balance xs:text-[18px]">
              You’re running the meeting.
            </p>
            <p className="mx-auto mt-2 max-w-[36ch] font-nunito text-[14px] leading-relaxed text-white/70">
              The remote walks you through every step, from the opening script to the closing quotes. Open it when
              you’re ready.
            </p>
            <Link
              href={REMOTE_HREF}
              className="relative mt-4 flex h-13 w-full items-center justify-center gap-2 overflow-hidden bg-(--key) font-sora text-[15px] font-black text-[#09090f] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <span
                className="absolute inset-y-0 left-[-45%] w-[36%] -skew-x-12 bg-linear-to-r from-transparent via-white/25 to-transparent animate-[ciSweep_5.5s_ease-in-out_infinite]"
                aria-hidden="true"
              />
              <span className="relative">Open the host remote</span>
              <span className="relative animate-[ciNudge_1.9s_ease-in-out_infinite]" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        ) : treasurer ? (
          <div className={`mt-6 border-t border-white/10 pt-4 opacity-0 ${LIFT}`} style={delay(S + 1.85)}>
            <p className="m-0 font-mono text-[10px] tracking-[0.18em] uppercase text-(--key)">Treasurer · today</p>
            <p className="mt-2 font-sora text-[17px] font-bold leading-snug tracking-[-0.02em] text-balance xs:text-[18px]">
              You’re giving the Treasurer’s report.
            </p>
            <p className="mx-auto mt-2 max-w-[36ch] font-nunito text-[14px] leading-relaxed text-white/70">
              Open your treasurer screen now and keep it up. Type in the bank balance and anything the chapter owes.
              When it’s your turn, your numbers go on the TV.
            </p>
            <Link
              href={TREASURER_HREF}
              className="relative mt-4 flex h-13 w-full items-center justify-center gap-2 overflow-hidden bg-(--key) font-sora text-[15px] font-black text-[#09090f] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <span
                className="absolute inset-y-0 left-[-45%] w-[36%] -skew-x-12 bg-linear-to-r from-transparent via-white/25 to-transparent animate-[ciSweep_5.5s_ease-in-out_infinite]"
                aria-hidden="true"
              />
              <span className="relative">Open the treasurer screen</span>
              <span className="relative animate-[ciNudge_1.9s_ease-in-out_infinite]" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        ) : gl ? (
          <div className={`mt-6 border-t border-white/10 pt-4 opacity-0 ${LIFT}`} style={delay(S + 1.85)}>
            <p className="m-0 font-mono text-[10px] tracking-[0.18em] uppercase text-(--key)">Guiding Light · today</p>
            <p className="mt-2 font-sora text-[17px] font-bold leading-snug tracking-[-0.02em] text-balance xs:text-[18px]">
              Keep this screen open. Don’t lock your phone.
            </p>
            <p className="mx-auto mt-2 max-w-[36ch] font-nunito text-[14px] leading-relaxed text-white/70">
              Do your 60 seconds, sit down, and look here. When the round opens, the shortlist appears on its own. Sqysh
              handles the rest.
            </p>
            <p
              className="mt-4 inline-flex items-center gap-2 border border-(--key)/30 bg-(--key)/8 px-3 py-2 font-mono text-[11px] tracking-[0.12em] uppercase text-(--key)"
              role="status"
            >
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--key) opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-(--key)" />
              </span>
              {sendOff ? 'Round open' : 'Waiting for the round to open'}
            </p>
          </div>
        ) : (
          <>
            {presenterName && (
              <dl
                className={`mt-6 flex w-full flex-col items-center gap-1.25 border-t border-white/10 pt-4 opacity-0 ${LIFT}`}
                style={delay(S + 1.85)}
              >
                <dt className="m-0 font-mono text-[10px] tracking-[0.18em] uppercase text-white/45">
                  Presenting today
                </dt>
                <dd className="m-0 font-sora text-[15px] font-semibold tracking-[-0.01em]">{presenterName}</dd>
              </dl>
            )}

            {week && (
              <div className={`mt-5 border-t border-white/10 pt-4 opacity-0 ${LIFT}`} style={delay(S + 1.9)}>
                <p className="m-0 font-mono text-[10px] tracking-[0.18em] uppercase text-white/45">
                  Your week · {week.f2f + week.referrals + week.tyfcb === 0 ? 'nothing logged yet' : 'logged so far'}
                </p>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {WEEK_ROWS.map((r) => {
                    const n = week[r.key]
                    return (
                      <Link
                        key={r.key}
                        href={r.href}
                        className={`flex h-16 flex-col items-center justify-center no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                          n > 0
                            ? 'border border-white/15 bg-white/4 text-white'
                            : 'border border-dashed border-(--key)/60 text-(--key) hover:bg-white/4'
                        }`}
                      >
                        <span className="font-sora text-[20px] font-black leading-none tabular-nums">
                          {n > 0 ? n : '+'}
                        </span>
                        <span className="mt-1 font-mono text-[9px] tracking-[0.14em] uppercase opacity-80">
                          {r.label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
                <p className="mt-2 m-0 font-nunito text-[12px] text-white/45">
                  Tap a dashed one to log it before the Activity Round, or skip it.
                </p>
              </div>
            )}

            {missed.length > 0 && (
              <div className={`mt-5 border-t border-white/10 pt-4 opacity-0 ${LIFT}`} style={delay(S + 1.95)}>
                <p className="m-0 font-mono text-[10px] tracking-[0.18em] uppercase text-white/45">
                  {missed.length === 1 ? 'Missed Thursday' : 'Missed Thursdays'} · tap to reinstate
                </p>
                <div className="mt-2.5 flex justify-center gap-2">
                  {missed.map((m) => (
                    <button
                      key={m.meetingId}
                      type="button"
                      onClick={() => setFixing(m)}
                      className="flex h-11 min-w-0 flex-1 basis-0 items-center justify-center border border-dashed border-white/30 bg-white/4 px-2 font-sora text-[13px] font-semibold tabular-nums text-white/85 transition-colors hover:border-(--key) hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 xs:text-[14px]"
                    >
                      {shortDate(m.date)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Link
              href="/dashboard"
              className={`relative mt-5 flex h-13 w-full items-center justify-center gap-2 overflow-hidden border border-white/20 bg-white/6 font-sora text-[14.5px] font-bold text-white no-underline opacity-0 ${LIFT} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60`}
              style={delay(S + 2.05)}
            >
              <span
                className="absolute inset-y-0 left-[-45%] w-[36%] -skew-x-12 bg-linear-to-r from-transparent via-white/15 to-transparent animate-[ciSweep_5.5s_ease-in-out_infinite]"
                style={delay(S + 3.1)}
                aria-hidden="true"
              />
              <span className="relative">Go to dashboard</span>
              <span
                className="relative text-(--key) animate-[ciNudge_1.9s_ease-in-out_infinite]"
                style={delay(S + 2.95)}
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          </>
        )}
      </div>

      {/* Top bar: Sqysh lands at the right edge, the bubble gets everything to his left */}
      <div
        ref={slotRef}
        className="pointer-events-none absolute left-4 z-6 right-[calc(1rem+64px+12px)] top-[calc(env(safe-area-inset-top)+16px)] xs:right-[calc(1rem+72px+12px)]"
      >
        {tour === 'ask' && (
          <TourBubble
            reduce={reduceMotion.current}
            onShow={() => setTour('open')}
            onDismiss={() => setTour('dismissed')}
          />
        )}
      </div>
      {tour === 'open' && <UpdatesPanel updates={updates} onClose={() => setTour('dismissed')} />}

      <AttendanceCorrectionModal
        open={fixing !== null}
        onClose={() => setFixing(null)}
        date={fixing?.date ?? ''}
        meetingId={fixing?.meetingId ?? ''}
      />
    </div>
  )
}
