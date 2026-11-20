'use client'

import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PCFShadowMap } from 'three'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { Member } from '@/types/attendance.types'
import { HarborFleet } from './_components/HarborFleet'
import { StudioLighting } from '../lighthouse/_components/StudioLighting'
import { HarborWorld } from './_components/HarborWorld'
import { MeetingCamera } from './_components/MeetingCamera'
import { PlateTracker } from './_components/PlateTracker'
import { WakeField } from './_components/WakeField'
import { audioSettings, preloadBoatSamples, setAudio } from './_lib/boatAudio'
import { chooseBerth, planRoute } from './_lib/berths'
import { MOOR_HEADING } from './_lib/harbor'
import { identities } from './_lib/identity'
import { BoatRuntime, createStore } from './_lib/store'
import { VIEW } from './_lib/view'
import { SeaTuningPanel } from './_components/SeaTuningPanel'

// The check-in board as a 3D harbor: everyone already checked in today is moored on load (no repeat arrivals),
// a real check-in (the same Pusher event the TV board listens for) sails that member's boat in, and the temporary
// controls simulate arrivals locally — simulated check-ins are kept in this browser only and never written.

const CHECK_IN_URL = 'https://coastalreferralxchange.com/check-in'
/** Simultaneous check-ins launch this far apart, so each boat still appears within about a second of its turn */
const LAUNCH_GAP_MS = 850
/** How long a new arrival's profile badge stays up */
const BADGE_MS = 6000

/** Stand-in crew for testing a bigger harbor than the chapter has members (?fleet=30) */
const TEST_NAMES = [
  'Avery Lane', 'Blake Turner', 'Casey Moore', 'Drew Ellis', 'Emery Cole', 'Finley Hart', 'Gray Morgan', 'Harper Quinn',
  'Indy Shaw', 'Jordan Pike', 'Kendall Ross', 'Logan Reed', 'Morgan Blythe', 'Noel Grant', 'Oakley Dunn', 'Parker Wade',
  'Quinn Avery', 'Riley Stone', 'Sawyer Brooks', 'Taylor West', 'Umber Fields', 'Val Marsh', 'Wren Hale', 'Xan Price',
  'Yael Burke', 'Zion Cross', 'Arden Vale', 'Bellamy Fox', 'Corin Shaw', 'Dale Rivers'
]

type Props = { members: Member[]; initialAttendees: string[]; todayISO: string }

export default function CheckinVoyage({ members: realMembers, initialAttendees, todayISO }: Props) {
  // ?fleet=30 pads the roster with stand-ins so the harbor can be tried at full size (development only)
  const [members] = useState<Member[]>(() => {
    const want = typeof window === 'undefined' ? 0 : Number(new URLSearchParams(window.location.search).get('fleet')) || 0
    const extra = Array.from({ length: Math.max(0, want - realMembers.length) }, (_, k) => ({
      id: `test-${k}`,
      name: TEST_NAMES[k % TEST_NAMES.length],
      company: ''
    }))
    return [...realMembers, ...extra]
  })
  const who = useMemo(() => identities(members), [members])
  const store = useMemo(() => createStore(), [])
  const [ids, setIds] = useState<string[]>([])
  const [welcome, setWelcome] = useState<{ id: string; key: number } | null>(null)
  /** Boats whose profile badge is showing: it appears as they sail in and is gone after a few seconds */
  const [badges, setBadges] = useState<Set<string>>(new Set())
  const [audio, setAudioState] = useState(audioSettings)
  const lastLaunch = useRef(0)
  const lastGate = useRef<string | null>(null)
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
      if (!identity || store.boats.has(id)) return false
      const occupied = [...store.boats.values()].map((o) => ({ x: o.berth.x, z: o.berth.z, boat: o.who.boat, plate: o.plate }))
      const berth = chooseBerth(occupied, identity.boat, identity.label)
      if (!berth) return false
      const route = sail ? planRoute(berth, identity.boat, occupied, lastGate.current) : null
      if (route) lastGate.current = route.gate
      const start = route?.path.samples[0]
      const now = performance.now()
      const launchAt = sail ? Math.max(now, lastLaunch.current + LAUNCH_GAP_MS) : 0
      if (sail) lastLaunch.current = launchAt
      const b: BoatRuntime = {
        id,
        who: identity,
        berth: { x: berth.x, z: berth.z },
        plate: berth.plate,
        path: route?.path ?? null,
        gate: route?.gate ?? null,
        launchAt,
        phase: sail ? 'waiting' : 'moored',
        s: 0,
        speed: 0,
        settled: 0,
        x: start?.x ?? berth.x,
        y: 0,
        z: start?.z ?? berth.z,
        heading: start?.heading ?? MOOR_HEADING,
        turnRate: 0,
        roll: 0,
        pitch: 0,
        rig: { hoist: sail ? 1 : 0, moored: !sail },
        age: sail ? 0 : 99
      }
      store.boats.set(id, b)
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
    preloadBoatSamples()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // live check-ins from members' phones
  useEffect(() => {
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
  }, [addBoat, store])

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
    lastLaunch.current = 0
    lastGate.current = null
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

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-[#1a8ea3]">
      <Canvas
        orthographic
        shadows={{ type: PCFShadowMap }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ zoom: VIEW.zoom, near: 0.5, far: 500, position: [VIEW.target.x + 80, 80, VIEW.target.z + 80] }}
      >
        {/* the diorama's own lighting rig, following the camera's focus; no studio backdrop here */}
        <StudioLighting focus={[VIEW.target.x, 0, VIEW.target.z]} backdrop={false} shadowRange={40} shadowSoftness={10} />
        <HarborWorld checkInUrl={CHECK_IN_URL} />
        <HarborFleet store={store} ids={ids} />
        <WakeField store={store} />
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
          const accent = w.palette.hull === '#fbf6ec' ? w.palette.trim : w.palette.hull
          return (
            <div
              key={id}
              ref={(el) => {
                if (el) store.plates.set(id, el)
                else store.plates.delete(id)
              }}
              className="absolute left-0 top-0 opacity-0 will-change-transform"
            >
              <div className={`transition-[opacity,transform] duration-700 ${shown ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
                <div
                  className="relative h-[4vw] w-[4vw] overflow-hidden rounded-full"
                  style={{ border: '0.22vw solid #f6ecd2', boxShadow: `0 0 0 0.2vw ${accent}, 0 0.4vw 1.2vw rgba(10,30,60,0.45)`, background: accent }}
                >
                  {w.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.image} alt={w.name} className="h-full w-full object-cover" />
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
                <div data-line className="absolute left-1/2 top-full w-[0.12vw] -translate-x-1/2 bg-[#1d3767]/70" style={{ opacity: shown ? 1 : 0, transition: 'opacity 0.7s' }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* the welcome: a lower-third for the newest arrival */}
      <div
        className={`pointer-events-none absolute bottom-[4vh] left-[2.2vw] transition-all duration-700 ${welcomeWho ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
      >
        {welcomeWho && (
          <div
            key={welcome?.key}
            className="rounded-[1vw] px-[1.6vw] py-[1vw]"
            style={{ background: 'rgba(246,236,210,0.96)', border: '0.2vw solid #1d3767', boxShadow: '0 0.6vw 1.8vw rgba(10,30,60,0.4)' }}
          >
            <p className="m-0 font-sora text-[0.95vw] font-black uppercase tracking-[0.25em] text-[#2f9e5e]">Welcome aboard</p>
            <p className="m-0 mt-[0.2vw] font-sora text-[2.6vw] font-black leading-none tracking-[-0.02em] text-[#1d3767]">{welcomeWho.name}</p>
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
