'use client'

// The 60-seconds TV screen: a 3D carousel of members that drifts while everyone
// gives their 60, then spins and lands on the winner (the week's Guiding Light)
// when the judge picks on their phone (your existing `winner-selected` Pusher
// event). Display-only; the super operator drives it from the remote.

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { getPusherClient } from '@/lib/pusher/pusherClient'
import { getInitials } from '@/lib/utils/shared.utils'
import { Member, Winner } from '@/types/guiding-light.types'

interface Props {
  members: Member[]
  openRoundId: string | null
  judgeName: string | null
  /** already-chosen winner, so re-opening the screen after the pick shows the result */
  initialWinner?: Member | null
  /** false when embedded as a stage mode (host drives it); true at the standalone route */
  showChrome?: boolean
}

type Phase = 'idle' | 'spinning' | 'revealed'
const SPIN_MS = 5600

export default function SixtyStageClient({ members, judgeName, initialWinner = null, showChrome = true }: Props) {
  const [phase, setPhase] = useState<Phase>(initialWinner ? 'revealed' : 'idle')
  const [winner, setWinner] = useState<Member | null>(initialWinner)
  const [judgedByName, setJudgedByName] = useState<string | null>(judgeName)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const ringRef = useRef<HTMLDivElement | null>(null)
  const cardsRef = useRef<{ el: HTMLDivElement; base: number }[]>([])
  const angleRef = useRef(0)
  const spinRef = useRef<{ from: number; to: number; start: number; winner: Member } | null>(null)
  const phaseRef = useRef<Phase>(initialWinner ? 'revealed' : 'idle')
  const rafRef = useRef<number | null>(null)
  const reduce = useRef(false)
  const rollRef = useRef<HTMLAudioElement | null>(null)
  const winRef = useRef<HTMLAudioElement | null>(null)

  const N = members.length
  const step = N ? 360 / N : 0

  function dims() {
    const vmin = Math.min(window.innerWidth, window.innerHeight)
    const cw = Math.max(120, Math.min(220, vmin * 0.26))
    const R = Math.max(cw * 1.35, N ? (cw / 2 / Math.tan(Math.PI / N)) * 1.08 : cw)
    return { cw, ch: cw * 1.18, R }
  }

  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    rollRef.current = new Audio('/sound-effects/gl-drumroll.mp3')
    winRef.current = new Audio('/sound-effects/gl-reveal.mp3')
    return () => {
      rollRef.current?.pause()
      winRef.current?.pause()
    }
  }, [])

  useEffect(() => {
    const apply = () => {
      const { cw, ch } = dims()
      rootRef.current?.style.setProperty('--cw', cw + 'px')
      rootRef.current?.style.setProperty('--ch', ch + 'px')
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length])

  useEffect(() => {
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)
    function loop(now: number) {
      const cards = cardsRef.current
      if (phaseRef.current === 'idle') {
        angleRef.current += reduce.current ? 0 : 0.12
      } else if (phaseRef.current === 'spinning' && spinRef.current) {
        const s = spinRef.current
        const t = Math.min(1, (now - s.start) / (reduce.current ? 400 : SPIN_MS))
        angleRef.current = s.from + (s.to - s.from) * easeOutQuart(t)
        if (t >= 1) {
          phaseRef.current = 'revealed'
          setPhase('revealed')
          setWinner(s.winner)
          try {
            if (winRef.current) {
              winRef.current.currentTime = 0
              winRef.current.play().catch(() => {})
            }
          } catch {}
          fireConfetti()
          setTimeout(fireConfetti, 500)
          setTimeout(fireConfetti, 1100)
          spinRef.current = null
        }
      }
      if (cards.length) {
        const { R } = dims()
        const angle = angleRef.current
        for (const c of cards) {
          const world = (((c.base + angle) % 360) + 360) % 360
          const facing = Math.cos((world * Math.PI) / 180)
          const op = 0.18 + 0.82 * Math.max(0, (facing + 1) / 2)
          const lift = phaseRef.current === 'idle' && !reduce.current ? Math.sin(now / 900 + c.base) * 5 : 0
          c.el.style.transform = `rotateY(${c.base}deg) translateZ(${R}px) translateY(${lift}px) rotateY(${-c.base - angle}deg)`
          c.el.style.opacity = op.toFixed(3)
          c.el.style.filter = `brightness(${(0.55 + 0.45 * Math.max(0, facing)).toFixed(2)})`
          c.el.style.zIndex = String(Math.round(facing * 100))
        }
        if (ringRef.current) ringRef.current.style.transform = `rotateY(${angle}deg)`
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length])

  const startSpin = useCallback(
    (winnerData: Winner) => {
      const idx = members.findIndex((m) => m.id === winnerData.id)
      if (idx < 0) return
      const landing = (360 - ((idx * step) % 360)) % 360
      const base = Math.ceil(angleRef.current / 360) * 360
      spinRef.current = {
        from: angleRef.current,
        to: base + 360 * 6 + landing,
        start: performance.now(),
        winner: winnerData as Member
      }
      phaseRef.current = 'spinning'
      setPhase('spinning')
      setWinner(null)
      try {
        if (rollRef.current) {
          rollRef.current.currentTime = 0
          rollRef.current.play().catch(() => {})
        }
      } catch {}
    },
    [members, step]
  )

  useEffect(() => {
    const channel = getPusherClient().subscribe('guiding-light')
    const onWinner = (data: { winner: Winner; judgedBy: { name: string } | null }) => {
      setJudgedByName(data.judgedBy?.name ?? null)
      startSpin(data.winner)
    }
    // the operator reset the round from the remote: drop back to the drifting carousel
    const onReset = () => {
      phaseRef.current = 'idle'
      setPhase('idle')
      setWinner(null)
      setJudgedByName(null)
      try {
        rollRef.current?.pause()
        winRef.current?.pause()
      } catch {}
    }
    channel.bind('winner-selected', onWinner)
    channel.bind('round-reset', onReset)
    return () => {
      channel.unbind('winner-selected', onWinner)
      channel.unbind('round-reset', onReset)
    }
  }, [startSpin])

  useEffect(() => setJudgedByName(judgeName), [judgeName])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const partsRef = useRef<
    {
      x: number
      y: number
      vx: number
      vy: number
      g: number
      s: number
      rot: number
      vr: number
      col: string
      life: number
    }[]
  >([])
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const cx = cv.getContext('2d')!
    const size = () => {
      cv.width = window.innerWidth
      cv.height = window.innerHeight
    }
    size()
    window.addEventListener('resize', size)
    let raf = 0
    const draw = () => {
      cx.clearRect(0, 0, cv.width, cv.height)
      partsRef.current = partsRef.current.filter((p) => p.life > 0)
      for (const p of partsRef.current) {
        p.vy += p.g
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.99
        p.rot += p.vr
        p.life -= 0.006
        cx.save()
        cx.translate(p.x, p.y)
        cx.rotate(p.rot)
        cx.globalAlpha = Math.max(0, p.life)
        cx.fillStyle = p.col
        cx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6)
        cx.restore()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', size)
    }
  }, [])
  function fireConfetti() {
    if (reduce.current) return
    const CC = ['#f5c542', '#ffffff', '#3be0ff', '#ff9e2c', '#9dff5e']
    for (let i = 0; i < 150; i++) {
      partsRef.current.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 260,
        y: window.innerHeight * 0.42,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 16 - 4,
        g: 0.35 + Math.random() * 0.25,
        s: 5 + Math.random() * 7,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.4,
        col: CC[(Math.random() * CC.length) | 0],
        life: 1
      })
    }
  }

  const hairline = "before:content-[''] before:h-px after:content-[''] after:h-px"

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 overflow-hidden text-[#f4f8ff] bg-[radial-gradient(120%_90%_at_50%_-15%,#0c1b2e_0%,#081421_45%,#06101b_100%)]"
    >
      {showChrome && (
        <div className="absolute top-6 left-6 z-100">
          <Link
            href="/"
            className="font-mono text-[9px] tracking-[0.15em] uppercase text-muted-dark hover:text-red-400"
          >
            Home
          </Link>
        </div>
      )}

      <div className="absolute inset-0 grid grid-rows-[auto_1fr_auto]">
        <header className="relative z-4 pt-[clamp(16px,4vh,48px)] text-center">
          <div
            className={`inline-flex items-center gap-[0.8em] font-mono text-[clamp(11px,1.4vw,15px)] font-semibold uppercase tracking-[0.32em] text-[#f5c542] ${hairline} before:w-[clamp(20px,4vw,54px)] before:bg-[linear-gradient(90deg,transparent,#f5c542)] after:w-[clamp(20px,4vw,54px)] after:bg-[linear-gradient(90deg,#f5c542,transparent)]`}
          >
            {phase === 'spinning' ? 'Drumroll…' : 'The 60 Seconds'}
          </div>
          <h1 className="mt-[0.16em] font-sora text-[clamp(34px,7.4vw,104px)] font-extrabold leading-[0.98] tracking-[-0.035em] text-balance">
            {phase === 'spinning' ? 'And the Guiding Light is…' : 'Who’s this week’s Guiding Light?'}
          </h1>
          {phase === 'idle' && (
            <p className="mt-[0.55em] text-[clamp(13px,1.8vw,21px)] font-semibold text-[#f4f8ff]/55">
              {judgedByName ? (
                <>
                  Everyone&rsquo;s giving their 60.{' '}
                  <b className="font-bold text-[#3be0ff]">{judgedByName.split(' ')[0]}</b> is picking.
                </>
              ) : (
                'Everyone’s giving their 60. The judge is picking.'
              )}
            </p>
          )}
        </header>

        <div className="relative z-2 grid place-items-center perspective-[1600px]">
          <div ref={ringRef} className="relative h-px w-px will-change-transform transform-3d">
            {members.map((m, i) => (
              <div
                key={m.id}
                ref={(el) => {
                  if (el) cardsRef.current[i] = { el, base: i * step }
                }}
                className="absolute left-[calc(var(--cw)/-2)] top-[calc(var(--ch)/-2)] flex h-(--ch) w-(--cw) flex-col items-center justify-center gap-2 border border-white/15 bg-[linear-gradient(160deg,rgba(255,255,255,0.09),rgba(255,255,255,0.02))] p-[7%] shadow-[0_18px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] backface-hidden transform-3d"
              >
                <div className="grid aspect-square w-[46%] place-items-center overflow-hidden rounded-full bg-[linear-gradient(140deg,#f5c542,#e0a21a)] font-sora text-[clamp(16px,2.6vw,34px)] font-extrabold text-[#0a1118] shadow-[inset_0_2px_8px_rgba(255,255,255,0.4)]">
                  {m.profileImage ? (
                    <img src={m.profileImage} alt={m.name} className="h-full w-full object-cover" />
                  ) : (
                    getInitials(m.name)
                  )}
                </div>
                <div className="text-center font-sora text-[clamp(12px,1.5vw,21px)] font-bold leading-[1.05] tracking-[-0.01em]">
                  {m.name}
                </div>
                <div className="text-center font-mono text-[clamp(9px,1vw,12px)] uppercase tracking-[0.08em] text-[#f4f8ff]/55">
                  {m.company}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div />
      </div>

      {/* winner spotlight over a dark scrim */}
      <div
        className={`absolute inset-0 z-6 grid place-items-center transition-opacity duration-500 before:absolute before:inset-0 before:backdrop-blur-[6px] before:content-[''] before:bg-[radial-gradient(60%_60%_at_50%_46%,rgba(6,16,27,0.78)_0%,rgba(6,16,27,0.93)_70%)] ${phase === 'revealed' && winner ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <div className="absolute aspect-square w-[min(90vw,90vh)] rounded-full bg-[radial-gradient(circle,rgba(245,197,66,0.3),rgba(224,162,26,0.1)_45%,transparent_70%)] animate-[glPulse_2.4s_ease-in-out_infinite] motion-reduce:animate-none" />
        <div
          className={`relative flex scale-[0.6] flex-col items-center gap-[clamp(10px,1.6vh,22px)] opacity-0 ${phase === 'revealed' && winner ? 'animate-[glPop_0.9s_cubic-bezier(0.2,1.3,0.35,1)_forwards]' : ''}`}
        >
          <div className="grid aspect-square w-[clamp(160px,26vh,320px)] place-items-center overflow-hidden rounded-full border-4 border-[#f5c542] bg-[linear-gradient(140deg,#f5c542,#e0a21a)] font-sora text-[clamp(56px,11vh,120px)] font-extrabold text-[#140d00] shadow-[0_0_0_10px_rgba(245,197,66,0.12),0_0_90px_rgba(245,197,66,0.55)]">
            {winner?.profileImage ? (
              <img src={winner.profileImage} alt={winner.name} className="h-full w-full object-cover" />
            ) : winner ? (
              getInitials(winner.name)
            ) : (
              ''
            )}
          </div>
          <div
            className={`inline-flex items-center gap-[0.8em] font-mono text-[clamp(11px,1.5vw,17px)] font-semibold uppercase tracking-[0.3em] text-[#f5c542] ${hairline} before:w-[clamp(24px,5vw,60px)] before:bg-[#f5c542] before:opacity-55 after:w-[clamp(24px,5vw,60px)] after:bg-[#f5c542] after:opacity-55`}
          >
            This Week&rsquo;s Guiding Light
          </div>
          <div className="text-balance text-center font-sora text-[clamp(40px,8.5vw,116px)] font-extrabold leading-[0.96] tracking-[-0.035em] text-white">
            {winner?.name}
          </div>
          <div className="font-mono text-[clamp(13px,2vw,26px)] font-medium uppercase tracking-[0.06em] text-[#f5c542]">
            {winner?.company}
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-7" />
    </div>
  )
}
