'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { getAudioContext } from '@/lib/audio/audioContext'
import { VesselConfig } from '@/lib/vessel/catalog'
import { Member } from '@/types/attendance.types'

// react-three-fiber (still the latest release) builds a THREE.Clock, which three now warns about on every canvas; the
// warning is only about fiber's own internals, so that one message is dropped until fiber moves to THREE.Timer
if (typeof window !== 'undefined') {
  const warn = console.warn
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('THREE.Clock')) return
    warn(...args)
  }
}

// WebGL and the painted canvas textures only exist in the browser
const CheckinVoyage = dynamic(() => import('./CheckinVoyage'), { ssr: false })

/** The title card's content, drawn full-screen; the card shows it twice, once through each door */
function CardFace({ ready, onStart, mirror }: { ready: boolean; onStart: () => void; mirror?: boolean }) {
  return (
    <div
      aria-hidden={mirror}
      className="relative flex h-dvh w-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_50%_38%,#0f2d42_0%,#0a1929_50%,#060e16_100%)]"
    >
      <p className="absolute left-4 top-4 m-0 font-sora text-lg font-black tracking-tight text-white sm:left-6 sm:top-5 sm:text-xl">
        CORE<span className="text-sky-400">.</span>
      </p>

      <div className="flex w-full translate-y-0 flex-col items-center px-6 text-center opacity-100 transition-[opacity,translate] duration-700 ease-out starting:translate-y-3.5 starting:opacity-0">
        <p className="m-0 font-mono text-[10px] uppercase tracking-[0.3em] text-sky-400">Live check-in</p>
        <h1 className="m-0 mt-3 max-w-full text-balance font-sora text-[clamp(1.75rem,4.4vw,4rem)] font-black leading-[1.05] tracking-tight text-white">
          Coastal Referral Exchange
        </h1>

        {/* the loading symbol; the button below only wakes once the harbor is ready */}
        <div className="mt-14 flex h-20 flex-col items-center justify-center gap-4" aria-live={mirror ? 'off' : 'polite'}>
          {ready ? (
            <p className="m-0 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Ready when you are</p>
          ) : (
            <>
              <span
                role={mirror ? undefined : 'status'}
                aria-label={mirror ? undefined : 'Loading'}
                className="block h-9 w-9 animate-spin rounded-full border-[3px] border-white/15 border-t-sky-400"
              />
              <p className="m-0 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Setting up the harbor…</p>
            </>
          )}
        </div>

        <button
          onClick={onStart}
          disabled={!ready}
          tabIndex={mirror ? -1 : undefined}
          className="mt-6 h-12 w-[min(80vw,19rem)] rounded-full border border-white/15 bg-white/5 font-mono text-[11px] uppercase tracking-[0.25em] text-white/30 transition-colors duration-200 enabled:cursor-pointer enabled:border-transparent enabled:bg-white enabled:text-[#0c1e2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#060e16]"
        >
          Start check-in →
        </button>
      </div>
    </div>
  )
}

/**
 * The title card: stays up while the harbor builds behind it, and only goes when the button is pressed. It is two
 * doors, each showing its half of the card, that slide apart down the middle; pressing the button is also the tap the
 * browser needs before it will play any sound.
 */
function TitleCard({ ready, onStart }: { ready: boolean; onStart: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(() => setGone(true), 850)
    return () => window.clearTimeout(t)
  }, [leaving])

  function start() {
    if (!ready || leaving) return
    getAudioContext()
    setLeaving(true)
    onStart()
  }

  if (gone) return null
  const door = 'absolute inset-y-0 w-1/2 transform-gpu overflow-hidden transition-transform duration-700 ease-[cubic-bezier(0.7,0,0.2,1)] will-change-transform'
  // a thin glow on each door's cut edge, faded in as it opens (opacity only, so it costs nothing to animate)
  const edge = `pointer-events-none absolute inset-y-0 w-24 transition-opacity duration-300 ${leaving ? 'opacity-100' : 'opacity-0'}`
  return (
    <div className={`fixed inset-0 z-10000 ${leaving ? 'pointer-events-none' : ''}`}>
      <div className={`${door} left-0 ${leaving ? '-translate-x-full' : 'translate-x-0'}`}>
        <div className="absolute inset-y-0 left-0">
          <CardFace ready={ready} onStart={start} />
        </div>
        <div className={`${edge} right-0 bg-linear-to-r from-transparent to-sky-400/35`} />
      </div>
      <div className={`${door} right-0 ${leaving ? 'translate-x-full' : 'translate-x-0'}`}>
        <div className="absolute inset-y-0 right-0">
          <CardFace ready={ready} onStart={start} mirror />
        </div>
        <div className={`${edge} left-0 bg-linear-to-l from-transparent to-sky-400/35`} />
      </div>
    </div>
  )
}

export default function CheckinVoyageLoader(props: {
  members: Member[]
  initialAttendees: string[]
  todayISO: string
  vessels: Record<string, VesselConfig>
}) {
  const [ready, setReady] = useState(false)
  const [started, setStarted] = useState(false)
  return (
    <>
      <CheckinVoyage {...props} onReady={() => setReady(true)} started={started} />
      {/* the sound preload (fetch and decode) waits until the doors have opened, so it can't hitch them */}
      <TitleCard ready={ready} onStart={() => window.setTimeout(() => setStarted(true), 900)} />
    </>
  )
}
