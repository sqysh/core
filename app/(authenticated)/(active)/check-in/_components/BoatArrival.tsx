'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Ship, SlidersHorizontal } from 'lucide-react'
import { LinkBody } from '@/components/_shared/LinkBody'
import { GlassButton, glassButton, glassPanel } from '@/components/_shared/LiquidGlass'
import { holdForMeeting } from '@/lib/actions/attendance/holdForMeeting'
import { honkHorn } from '@/lib/actions/attendance/honkHorn'
import { HONK_COOLDOWN_MS } from '@/lib/constants/honk.constants'
import type { HarborData } from '@/lib/harbor/loadHarbor'
import { useCheckInChime } from '../_hooks/useCheckInChime'
import { LIFT, delay } from '../_lib/motion'

// A member's check-in on their phone: a thank-you, then a prompt to turn the phone sideways, then their own boat on a
// small copy of the TV harbor, sailing in (or already at anchor if they'd checked in before). The harbor builds
// behind the first two cards so it's ready by the time they turn. Phones that won't rotate (locked orientation, a
// desktop) can show it upright instead.

const PhoneHarbor = dynamic(() => import('@/components/harbor/PhoneHarbor'), { ssr: false })

type Stage = 'thanks' | 'rotate' | 'boat'

/** How long the thank-you holds before the rotate prompt */
const THANKS_MS = 3200

function useLandscape() {
  const [landscape, setLandscape] = useState(false)
  useEffect(() => {
    const q = window.matchMedia('(orientation: landscape)')
    const update = () => setLandscape(q.matches)
    update()
    q.addEventListener('change', update)
    return () => q.removeEventListener('change', update)
  }, [])
  return landscape
}

/** A screen someone with a job today opens from their boat: the host remote, the command deck */
export type BoatControl = { href: string; label: string }

export function BoatArrival({
  firstName,
  fresh,
  harbor,
  me,
  controls = [],
  hold = false
}: {
  firstName: string
  fresh: boolean
  harbor: HarborData
  me: string
  controls?: BoatControl[]
  /** Keep them here until the meeting ends: every other page sends them back (not for a preview, or a super user) */
  hold?: boolean
}) {
  useCheckInChime(fresh)
  useEffect(() => {
    if (hold) void holdForMeeting()
  }, [hold])
  const landscape = useLandscape()
  const [stage, setStage] = useState<Stage>('thanks')
  const [upright, setUpright] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setStage('rotate'), THANKS_MS)
    return () => window.clearTimeout(t)
  }, [])
  // turned sideways (or asked to see it as it is): on to the boat, and it stays there whichever way they hold it
  if (stage === 'rotate' && (landscape || upright)) setStage('boat')

  const showing = stage === 'boat' && ready
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#09090f] text-white">
      {/* the harbor, building from the start behind the cards */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${showing ? 'opacity-100' : 'opacity-0'}`}>
        <PhoneHarbor {...harbor} me={me} sailMe={fresh} go={showing} onReady={() => setReady(true)} />
      </div>

      {stage === 'thanks' && <Thanks firstName={firstName} fresh={fresh} />}
      {stage === 'rotate' && <TurnPrompt onUpright={() => setUpright(true)} />}
      {stage === 'boat' && !ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <span
            role="status"
            aria-label="Loading"
            className="block h-9 w-9 animate-spin rounded-full border-[3px] border-white/15 border-t-sky-400"
          />
          <p className="m-0 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Bringing your boat in…</p>
        </div>
      )}
      {showing && <Hud firstName={firstName} fresh={fresh} controls={controls} />}
    </div>
  )
}

function Thanks({ firstName, fresh }: { firstName: string; fresh: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
      <svg
        viewBox="0 0 64 64"
        className="h-16 w-16 opacity-0 animate-[ciFade_0.5s_ease_0.1s_forwards]"
        aria-hidden="true"
      >
        <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(56,189,248,0.25)" strokeWidth="3" />
        <path
          d="M20 33 l8 8 l16 -18"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1}
          className="animate-[ciDraw_0.6s_cubic-bezier(0.65,0,0.35,1)_0.45s_forwards]"
        />
      </svg>
      <p
        className={`m-0 mt-7 font-mono text-[10px] uppercase tracking-[0.3em] text-sky-400 opacity-0 ${LIFT}`}
        style={delay(0.7)}
      >
        {fresh ? 'Checked in' : 'Already checked in'}
      </p>
      <h1
        className={`m-0 mt-3 text-balance font-sora text-[30px] font-black leading-[1.05] tracking-[-0.03em] opacity-0 ${LIFT}`}
        style={delay(0.85)}
      >
        Thank you for checking in, {firstName}.
      </h1>
      <p
        className={`m-0 mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-white/35 opacity-0 ${LIFT}`}
        style={delay(1.2)}
      >
        Coastal Referral Exchange
      </p>
    </div>
  )
}

function TurnPrompt({ onUpright }: { onUpright: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center opacity-0 animate-[ciFade_0.5s_ease_0.15s_forwards]">
      {/* a phone turning sideways, with the boat on its screen */}
      <div className="flex h-36 w-36 items-center justify-center">
        <div className="flex h-24 w-14 items-center justify-center rounded-[14px] border-[3px] border-white/85 animate-[ciTurn_2.6s_cubic-bezier(0.65,0,0.35,1)_infinite]">
          <Ship size={22} className="text-sky-400" aria-hidden="true" />
        </div>
      </div>
      <h2 className="m-0 mt-4 font-sora text-[24px] font-black leading-[1.1] tracking-[-0.03em]">
        Turn your phone sideways
      </h2>
      <p className="m-0 mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
        to see your boat in the harbor
      </p>
      <button
        type="button"
        onClick={onUpright}
        className="mt-10 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white/70"
      >
        Show it here instead
      </button>
    </div>
  )
}

/** Over the harbor: whose boat this is, the horn, and the controls for anyone running the meeting */
function Hud({ firstName, fresh, controls }: { firstName: string; fresh: boolean; controls: BoatControl[] }) {
  const [honking, setHonking] = useState(false)
  const lastTap = useRef(0)

  function honk() {
    const now = Date.now()
    if (now - lastTap.current < HONK_COOLDOWN_MS) return
    lastTap.current = now
    navigator.vibrate?.(40)
    setHonking(true)
    window.setTimeout(() => setHonking(false), HONK_COOLDOWN_MS)
    void honkHorn()
  }

  return (
    <div className="pointer-events-none absolute inset-0 pb-[max(14px,env(safe-area-inset-bottom))] pl-[max(14px,env(safe-area-inset-left))] pr-[max(14px,env(safe-area-inset-right))] pt-[max(14px,env(safe-area-inset-top))] opacity-0 animate-[ciFade_0.8s_ease_0.6s_forwards]">
      <div className={`${glassPanel} inline-flex flex-col rounded-2xl px-4 py-2.5`}>
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/80 [text-shadow:0_1px_3px_rgba(6,24,44,0.6)]">
          {fresh ? 'Sailing in' : 'At anchor'}
        </span>
        <span className="font-sora text-[17px] font-black leading-tight text-white [text-shadow:0_1px_4px_rgba(6,24,44,0.6)]">
          {firstName}’s boat
        </span>
      </div>
      {controls.length > 0 && (
        <div className="pointer-events-auto absolute right-[max(14px,env(safe-area-inset-right))] top-[max(14px,env(safe-area-inset-top))] flex flex-col items-end gap-2">
          {controls.map((c) => (
            <Link key={c.href} href={c.href} className={`${glassButton()} h-11 rounded-full px-4 text-[13px]`}>
              <LinkBody
                icon={<SlidersHorizontal size={16} aria-hidden="true" />}
                label={c.label}
                spinnerClass="h-4 w-4"
              />
            </Link>
          ))}
        </div>
      )}
      <GlassButton
        onClick={honk}
        tone={honking ? 'active' : 'default'}
        aria-label="Honk your boat's horn on the TV"
        className="pointer-events-auto absolute bottom-[max(14px,env(safe-area-inset-bottom))] right-[max(14px,env(safe-area-inset-right))] h-12 rounded-full px-5 text-[14px]"
      >
        <Ship size={18} aria-hidden="true" />
        {honking ? 'Toot toot!' : 'Honk'}
      </GlassButton>
    </div>
  )
}
