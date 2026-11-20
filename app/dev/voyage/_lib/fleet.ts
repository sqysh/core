// The test fleet and its shared, mutable state. The fleet simulation writes it every frame; the camera rig and wakes
// read it. Kept outside React so 60 fps updates never re-render anything.

export type BoatKind = 'speed' | 'sail' | 'fishing'

export type BoatSpec = {
  kind: BoatKind
  /** Distance behind the lead boat, along the route */
  gap: number
  /** Sideways offset from the route's centreline (+ = starboard) */
  lane: number
  /** Hull length, for placing the wake at the stern */
  length: number
  /** How hard it leans into turns, lifts its bow, and how big a wake it throws */
  lean: number
  planing: number
  wake: number
  phase: number
}

export const FLEET: BoatSpec[] = [
  { kind: 'speed', gap: 0, lane: 0, length: 1.75, lean: 1.4, planing: 0.08, wake: 1.25, phase: 0 },
  { kind: 'sail', gap: 3.3, lane: 0.28, length: 2.0, lean: 0.6, planing: 0, wake: 0.8, phase: 1.7 },
  { kind: 'fishing', gap: 6.6, lane: -0.22, length: 2.3, lean: 0.45, planing: 0.02, wake: 1, phase: 3.1 }
]

/** Route distance of the lead boat at the start (so every boat begins on the route, in order) */
export const START_S = 7.4
/** Cruising speed in world units per second */
export const CRUISE = 1.05

export type BoatState = {
  x: number
  y: number
  z: number
  heading: number
  turnRate: number
  roll: number
  pitch: number
}

export type FleetState = {
  /** Lead boat's distance along the route */
  s: number
  speed: number
  boats: BoatState[]
}

export const createFleetState = (): FleetState => ({
  s: START_S,
  speed: 0,
  boats: FLEET.map(() => ({ x: 0, y: 0, z: 0, heading: 0, turnRate: 0, roll: 0, pitch: 0 }))
})

/** Height of the water surface — the same swell the water shader draws (CoastalTile's vertex shader) */
export const waterHeight = (x: number, z: number, t: number) =>
  Math.sin(x * 1.3 + t * 0.9) * Math.cos(z * 1.1 - t * 0.7) * 0.018

/** Shortest signed difference between two angles */
export const angleDelta = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from))

/** Frame-rate independent exponential approach */
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt)
