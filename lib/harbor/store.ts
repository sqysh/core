import { Identity } from './identity'
import { Berth, MOOR_HEADING, Path } from './harbor'
import { Rect } from './view'
import { AnchorState, mooredAnchor, stowedAnchor } from './vessel/anchor'

// Live harbor state shared by the simulation, wakes, anchors, nameplates and camera. Mutated every frame, outside React.
//
// Every boat is one vessel entity, whoever is steering it. `control` says who: 'auto' sails a check-in arrival in along
// its planned route and holds it at anchor; 'player' takes `helm` input (a member's phone, later; ?drive for now). Both
// run through the same movement, buoyancy, anchor and animation code (vessel/motion.ts, vessel/anchor.ts), so a boat
// can hand from one to the other at any time. A remote vessel (another member's boat, seen on the TV) will be a
// third control that sets the same fields from network snapshots (vessel/net.ts).

/**
 * waiting: queued to arrive. arriving: following its route in. settling: stopped, anchor going down, falling back
 * onto it. moored: lying to its anchor. underway: free, under a player's helm.
 */
export type Phase = 'waiting' | 'arriving' | 'settling' | 'moored' | 'underway'

/** Live state the models animate from: sails hoisted (0–1), fenders out, and how hard the propeller is turning */
export type Rig = { hoist: number; moored: boolean; prop: number }

/** What a player is asking for: throttle and steering, each -1..1 */
export type HelmInput = { throttle: number; steer: number }

export type BoatRuntime = {
  id: string
  who: Identity
  control: 'auto' | 'player'
  helm: HelmInput
  /** Where it lies at anchor (and where later berths keep clear of) */
  berth: Berth
  /** where its nameplate was planned to sit (reference screen), so later berths keep clear of it */
  plate: Rect
  path: Path | null
  /** which way it came in */
  gate: string | null
  /** performance.now() at which it sets off (arrivals are staggered) */
  launchAt: number
  phase: Phase
  s: number
  /** Speed through the water along its heading (negative is astern) */
  speed: number
  /** seconds since it stopped, for the settle */
  settled: number
  x: number
  y: number
  z: number
  heading: number
  turnRate: number
  roll: number
  pitch: number
  /** Rates for the buoyancy springs, and the drift velocity while it rides to its anchor */
  vy: number
  vRoll: number
  vPitch: number
  vx: number
  vz: number
  anchor: AnchorState
  rig: Rig
  /** seconds since it set off, for the nameplate's welcome */
  age: number
}

/** One-off things that happened on the water this frame, for the effects to pick up (a splash where an anchor went in) */
type HarborEvent = { kind: 'splash'; x: number; z: number; size: number }

export type HarborStore = {
  boats: Map<string, BoatRuntime>
  plates: Map<string, HTMLDivElement>
  events: HarborEvent[]
}

export const createStore = (): HarborStore => ({ boats: new Map(), plates: new Map(), events: [] })

/** A check-in's boat: lying to its anchor at its berth already, or queued to sail in along `route` */
export function createVessel(o: {
  id: string
  who: Identity
  berth: Berth
  plate: Rect
  route: { path: Path; gate: string } | null
  launchAt: number
}): BoatRuntime {
  const start = o.route?.path.samples[0]
  const sail = !!o.route
  return {
    id: o.id,
    who: o.who,
    control: 'auto',
    helm: { throttle: 0, steer: 0 },
    berth: { x: o.berth.x, z: o.berth.z },
    plate: o.plate,
    path: o.route?.path ?? null,
    gate: o.route?.gate ?? null,
    launchAt: o.launchAt,
    phase: sail ? 'waiting' : 'moored',
    s: 0,
    speed: 0,
    settled: 0,
    x: start?.x ?? o.berth.x,
    y: 0,
    z: start?.z ?? o.berth.z,
    heading: start?.heading ?? MOOR_HEADING,
    turnRate: 0,
    roll: 0,
    pitch: 0,
    vy: 0,
    vRoll: 0,
    vPitch: 0,
    vx: 0,
    vz: 0,
    anchor: sail ? stowedAnchor() : mooredAnchor(o.who.spec, o.berth),
    rig: { hoist: sail ? 1 : 0, moored: !sail, prop: 0 },
    age: sail ? 0 : 99
  }
}
