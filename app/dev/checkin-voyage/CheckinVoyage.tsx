'use client'

import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PCFShadowMap } from 'three'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { VesselConfig } from '@/lib/vessel/catalog'
import { Member } from '@/types/attendance.types'
import { HarborStage } from './_components/HarborStage'
import { MeetingCamera } from './_components/MeetingCamera'
import { PlateTracker } from './_components/PlateTracker'
import { DevHelm } from './_components/DevHelm'
import { audioSettings, preloadBoatSamples, setAudio } from './_lib/boatAudio'
import { berthBoat, createLaunches } from './_lib/fleetOps'
import { identities } from './_lib/identity'
import { createStore } from './_lib/store'
import { VIEW } from './_lib/view'
import { SeaTuningPanel } from './_components/SeaTuningPanel'

// The check-in board as a 3D harbor: everyone already checked in today is moored on load (no repeat arrivals),
// a real check-in (the same Pusher event the TV board listens for) sails that member's boat in, and the temporary
// controls simulate arrivals locally — simulated check-ins are kept in this browser only and never written.

/** How long a new arrival's profile badge stays up */
const BADGE_MS = 6000

/** Stand-in crew for testing a bigger harbor than the chapter has members (?fleet=30) */
const TEST_NAMES = [
  'Avery Lane',
  'Blake Turner',
  'Casey Moore',
  'Drew Ellis',
  'Emery Cole',
  'Finley Hart',
  'Gray Morgan',
  'Harper Quinn',
  'Indy Shaw',
  'Jordan Pike',
  'Kendall Ross',
  'Logan Reed',
  'Morgan Blythe',
  'Noel Grant',
  'Oakley Dunn',
  'Parker Wade',
  'Quinn Avery',
  'Riley Stone',
  'Sawyer Brooks',
  'Taylor West',
  'Umber Fields',
  'Val Marsh',
  'Wren Hale',
  'Xan Price',
  'Yael Burke',
  'Zion Cross',
  'Arden Vale',
  'Bellamy Fox',
  'Corin Shaw',
  'Dale Rivers'
]

/**
 * The glass's lens: a displacement map that leaves the middle of the panel undistorted and bends what's behind it
 * along the edges (red moves it sideways, green up and down; 128 is neutral), so the sea seems to curve over the rim.
 * Two gradients multiplied together, one per axis, stretched to the panel.
 */
const GLASS_MAP = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs>` +
    `<linearGradient id='x' x1='0' x2='1' y1='0' y2='0'><stop offset='0' stop-color='rgb(215,255,255)'/><stop offset='.07' stop-color='rgb(128,255,255)'/><stop offset='.93' stop-color='rgb(128,255,255)'/><stop offset='1' stop-color='rgb(41,255,255)'/></linearGradient>` +
    `<linearGradient id='y' x1='0' x2='0' y1='0' y2='1'><stop offset='0' stop-color='rgb(255,215,255)'/><stop offset='.22' stop-color='rgb(255,128,255)'/><stop offset='.78' stop-color='rgb(255,128,255)'/><stop offset='1' stop-color='rgb(255,41,255)'/></linearGradient></defs>` +
    `<rect width='100' height='100' fill='url(#x)'/><rect width='100' height='100' fill='url(#y)' style='mix-blend-mode:multiply'/></svg>`
)}`

type Props = {
  members: Member[]
  initialAttendees: string[]
  todayISO: string
  /** Members' saved boats by id; anyone missing sails their default */
  vessels?: Record<string, VesselConfig>
  onReady?: () => void
  started?: boolean
}

export default function CheckinVoyage({ members: realMembers, initialAttendees, todayISO, vessels, onReady, started }: Props) {
  // ?fleet=30 pads the roster with stand-ins so the harbor can be tried at full size (development only)
  const [members] = useState<Member[]>(() => {
    const want =
      typeof window === 'undefined' ? 0 : Number(new URLSearchParams(window.location.search).get('fleet')) || 0
    const extra = Array.from({ length: Math.max(0, want - realMembers.length) }, (_, k) => ({
      id: `test-${k}`,
      name: TEST_NAMES[k % TEST_NAMES.length],
      company: ''
    }))
    return [...realMembers, ...extra]
  })
  const who = useMemo(() => identities(members, vessels), [members, vessels])
  const store = useMemo(() => createStore(), [])
  // ?drive: steer a boat from the keyboard (development; see DevHelm)
  const [drive] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('drive'))
  const [ids, setIds] = useState<string[]>([])
  const [welcome, setWelcome] = useState<{ id: string; key: number } | null>(null)
  /** Boats whose profile badge is showing: it appears as they sail in and is gone after a few seconds */
  const [badges, setBadges] = useState<Set<string>>(new Set())
  const [audio, setAudioState] = useState(audioSettings)
  /** True once the harbor has built and painted: the live connection waits for this, as the build blocks the page and a socket opened during it times out and retries */
  const [built, setBuilt] = useState(false)
  const launches = useRef(createLaunches())
  const realIds = useRef<string[]>(initialAttendees)
  const simKey = `checkin-voyage:sim:${todayISO}`

  const readSim = useCallback((): string[] => {
    try {
      return JSON.parse(sessionStorage.getItem(simKey) ?? '[]')
    } catch {
      return []
    }
  }, [simKey])
  const writeSim = useCallback(
    (list: string[]) => {
      try {
        sessionStorage.setItem(simKey, JSON.stringify(list))
      } catch {}
    },
    [simKey]
  )

  /** Put a member's boat in the harbor: moored already, or sailing in. A member already here is ignored. */
  const addBoat = useCallback(
    (id: string, sail: boolean) => {
      const identity = who.get(id)
      if (!identity) return false
      const b = berthBoat(store, identity, sail, launches.current)
      if (!b) return false
      const now = performance.now()
      const launchAt = b.launchAt
      setIds((prev) => [...prev, id])
      if (sail) {
        window.setTimeout(() => setWelcome({ id, key: launchAt }), Math.max(0, launchAt - now))
        window.setTimeout(() => setBadges((o) => new Set(o).add(id)), Math.max(0, launchAt - now))
        window.setTimeout(
          () =>
            setBadges((o) => {
              const n = new Set(o)
              n.delete(id)
              return n
            }),
          Math.max(0, launchAt - now) + BADGE_MS
        )
      }
      return true
    },
    [store, who]
  )

  // everyone already in today (real check-ins, plus this browser's simulated ones) is moored, in arrival order
  useEffect(() => {
    for (const id of [...initialAttendees, ...readSim()]) addBoat(id, false)
    // ?moored=12 ties up twelve more straight away, to judge a busy harbor (development)
    const moored = Number(new URLSearchParams(window.location.search).get('moored')) || 0
    for (const m of members.filter((x) => !store.boats.has(x.id)).slice(0, moored)) addBoat(m.id, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // the recordings are fetched once the player has pressed start: that tap is what lets the browser create the audio context
  useEffect(() => {
    if (started) preloadBoatSamples()
  }, [started])

  // live check-ins from members' phones
  useEffect(() => {
    if (!built) return
    const channel = getPusherClient().subscribe('meeting-attendance')
    const onCheckIn = (data: { userId: string }) => {
      if (store.boats.has(data.userId)) return
      realIds.current = [...realIds.current, data.userId]
      addBoat(data.userId, true)
    }
    channel.bind('check-in', onCheckIn)
    return () => {
      channel.unbind('check-in', onCheckIn)
      releaseChannel('meeting-attendance')
    }
  }, [addBoat, store, built])

  function simulate(count: number) {
    const free = members.filter((m) => !store.boats.has(m.id))
    const sim = readSim()
    for (let i = 0; i < count && free.length; i++) {
      const pick = free.splice(Math.floor(Math.random() * free.length), 1)[0]
      if (addBoat(pick.id, true)) sim.push(pick.id)
    }
    writeSim(sim)
  }

  function reset() {
    store.boats.clear()
    launches.current = createLaunches()
    writeSim([])
    setIds([])
    setWelcome(null)
    // real check-ins stay; they're moored straight back in their order
    queueMicrotask(() => realIds.current.forEach((id) => addBoat(id, false)))
  }

  function changeAudio(next: Partial<ReturnType<typeof audioSettings>>) {
    setAudio(next)
    setAudioState(audioSettings())
  }

  useEffect(() => {
    if (!welcome) return
    const t = window.setTimeout(() => setWelcome(null), 6000)
    return () => window.clearTimeout(t)
  }, [welcome])

  const welcomeWho = welcome ? who.get(welcome.id) : null
  // kept after it goes, so the panel still has its name while it slides away
  const lastWho = useRef(welcomeWho)
  if (welcomeWho) lastWho.current = welcomeWho
  const shownWho = welcomeWho ?? lastWho.current

  return (
    <div className="fixed inset-0 z-9999 overflow-hidden bg-[#1a8ea3]">
      <Canvas
        orthographic
        shadows={{ type: PCFShadowMap }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ zoom: VIEW.zoom, near: 0.5, far: 500, position: [VIEW.target.x + 80, 80, VIEW.target.z + 80] }}
      >
        <HarborStage
          store={store}
          ids={ids}
          onReady={() => {
            setBuilt(true)
            onReady?.()
          }}
        />
        {drive && <DevHelm store={store} />}
        <MeetingCamera store={store} />
        <PlateTracker store={store} />
        <EffectComposer multisampling={0} enableNormalPass={false}>
          {/* a tighter radius for crisp contact shadows where plants, rocks and buildings meet the ground */}
          <N8AO aoRadius={0.7} distanceFalloff={0.5} intensity={2.3} quality="medium" color="#1d1712" halfRes={false} />
          <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.2} intensity={0.45} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <Vignette offset={0.4} darkness={0.18} />
          <SMAA />
        </EffectComposer>
      </Canvas>
      <SeaTuningPanel />

      {/* profile badges: a new arrival's photo rides over its boat for a few seconds, then fades away */}
      <div className="pointer-events-none absolute inset-0">
        {ids.map((id) => {
          const w = who.get(id)
          if (!w) return null
          const shown = badges.has(id)
          const accent = w.look.hull === '#fbf6ec' ? w.look.trim : w.look.hull
          return (
            <div
              key={id}
              ref={(el) => {
                if (el) store.plates.set(id, el)
                else store.plates.delete(id)
              }}
              className="absolute left-0 top-0 opacity-0 will-change-transform"
            >
              <div
                className={`transition-[opacity,transform] duration-700 ${shown ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
              >
                <div
                  className="relative h-[4vw] w-[4vw] overflow-hidden rounded-full"
                  style={{
                    border: '0.22vw solid #f6ecd2',
                    boxShadow: `0 0 0 0.2vw ${accent}, 0 0.4vw 1.2vw rgba(10,30,60,0.45)`,
                    background: accent
                  }}
                >
                  {w.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.image} alt={w.name} decoding="async" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-sora text-[1.5vw] font-black text-white">
                      {w.name
                        .split(/\s+/)
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                  )}
                </div>
                <div
                  data-line
                  className="absolute left-1/2 top-full w-[0.12vw] -translate-x-1/2 bg-[#1d3767]/70"
                  style={{ opacity: shown ? 1 : 0, transition: 'opacity 0.7s' }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* the glass lens the welcome panel's backdrop passes through */}
      <svg width="0" height="0" className="absolute" aria-hidden>
        <filter id="cv-glass" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage href={GLASS_MAP} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="46" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {/* the welcome: a lower-third for the newest arrival */}
      <div
        // it slides in and out rather than fading: a faded parent cuts the glass off from the sea behind it (the backdrop
        // filter only sees what's inside it), so the glass would show clear until the fade ended
        className={`pointer-events-none absolute bottom-[4vh] left-[2.2vw] transition-transform duration-700 ease-out ${welcomeWho ? 'translate-y-0' : 'translate-y-[200%]'}`}
      >
        {shownWho && (
          <div
            key={welcome?.key}
            // clear glass: no fill to speak of, bright rims where the edges catch the light, and the sea bent through the rim.
            // The class is the fallback (a plain light blur); browsers that can bend the backdrop take the inline filter.
            className="relative overflow-hidden rounded-[2vw] bg-white/[0.04] px-[1.9vw] py-[1.2vw] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28),inset_0.18vw_0.18vw_0.25vw_-0.1vw_rgba(255,255,255,0.8),inset_-0.18vw_-0.18vw_0.25vw_-0.1vw_rgba(255,255,255,0.5),inset_0_0_1.4vw_rgba(255,255,255,0.1),0_0.8vw_2.4vw_rgba(6,24,44,0.25)] backdrop-blur-[1px]"
            style={{ backdropFilter: 'url(#cv-glass) blur(0.5px) saturate(1.1) brightness(1.04)' }}
          >
            {/* a faint specular glint along the top edge and a hairline across the bottom; nothing milky over the middle */}
            <span className="pointer-events-none absolute inset-x-[6%] top-[3%] h-[22%] rounded-full bg-linear-to-b from-white/30 to-transparent" />
            <span className="pointer-events-none absolute inset-x-[10%] bottom-0 h-px bg-linear-to-r from-transparent via-white/55 to-transparent" />
            <p className="relative m-0 font-sora text-[0.95vw] font-black uppercase tracking-[0.25em] text-white/90 drop-shadow-[0_1px_3px_rgba(6,24,44,0.6)]">
              Welcome
            </p>
            <p className="relative m-0 mt-[0.2vw] font-sora text-[2.6vw] font-black leading-none tracking-[-0.02em] text-white drop-shadow-[0_2px_8px_rgba(6,24,44,0.55)]">
              {shownWho.name}
            </p>
          </div>
        )}
      </div>

      {/* temporary development controls, plus the sound level */}
      <div className="absolute bottom-[4vh] left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/20 bg-[#16191b]/55 px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-white/85 backdrop-blur-md">
        <DevBtn onClick={() => simulate(1)}>Simulate 1 check-in</DevBtn>
        <DevBtn onClick={() => simulate(5)}>Simulate 5</DevBtn>
        <DevBtn onClick={reset}>Reset</DevBtn>
        <span className="mx-1 h-5 w-px bg-white/20" />
        <DevBtn onClick={() => changeAudio({ muted: !audio.muted })}>{audio.muted ? 'Sound off' : 'Sound on'}</DevBtn>
        <input
          aria-label="Volume"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={audio.volume}
          onChange={(e) => changeAudio({ volume: Number(e.target.value), muted: false })}
          className="w-24 accent-teal-300"
        />
      </div>
    </div>
  )
}

function DevBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="h-8 rounded-full px-3.5 transition-colors hover:bg-white/15">
      {children}
    </button>
  )
}
