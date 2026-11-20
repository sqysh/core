import { Euler, Quaternion, Vector3 } from 'three'
import { seabed } from '../coast'
import { FWD } from '../harbor'
import type { BoatClass } from '../identity'
import type { BoatRuntime, HarborStore } from '../store'
import { seaAt } from '../waves'
import { Vec3, VESSEL_CLASS_SPECS } from './classes'

// The anchor, as part of the vessel. It stows on the bow roller; let go, it drops through the air, splashes in and
// sinks to the seabed under the bow; once it bites, the rode pays out and the boat falls back onto it, snubbing up
// with a tug. Weighing reverses it: the rode comes in, drawing the boat up over its anchor, the anchor breaks out,
// rises, breaks the surface and seats on the roller. The same sequence serves a check-in arriving and a player
// anchoring wherever they've sailed.

export type AnchorStage = 'stowed' | 'dropping' | 'holding' | 'weighing'

export type AnchorState = {
  stage: AnchorStage
  /** The anchor's crown, in the world */
  x: number
  y: number
  z: number
  vy: number
  /** Below the surface (for the splash as it goes in or comes out) */
  wet: boolean
  /** Seabed height under it */
  floor: number
  /** Rode paid out beyond straight up-and-down: how far ahead of the bow it lies */
  scope: number
  /** Weighing: off the bottom and coming up */
  lifting: boolean
  /** The rode has come taut once since it set (the tug happens once) */
  snubbed: boolean
}

/** Rode let out once it bites: the boat lies this far back from straight over its anchor */
export const SCOPE = 0.35
/** How fast the rode pays out and comes in (units/s), and the anchor rises (units/s) */
const PAY_OUT = 0.5
const HAUL = 0.3
const RISE = 0.75
/** Falling through the air (scaled gravity, for the miniature), then sinking at about this speed */
const FALL = 6
const SINK = 0.8

export const stowedAnchor = (): AnchorState => ({ stage: 'stowed', x: 0, y: 0, z: 0, vy: 0, wet: false, floor: 0, scope: 0, lifting: false, snubbed: false })

/** Already lying to its anchor at `berth`, head to wind (a boat that was in before the page loaded) */
export function mooredAnchor(cls: BoatClass, berth: { x: number; z: number }): AnchorState {
  const reach = VESSEL_CLASS_SPECS[cls].mounts.roller[0] + SCOPE
  const x = berth.x + FWD.x * reach
  const z = berth.z + FWD.z * reach
  const floor = seabed(x, z)
  return { stage: 'holding', x, y: floor, z, vy: 0, wet: true, floor, scope: SCOPE, lifting: false, snubbed: true }
}

// ─── the hull's frame ──────────────────────────────────────────────────────────

const qOuter = new Quaternion()
const qInner = new Quaternion()
const euler = new Euler()

/**
 * A point in a boat's hull frame (bow +x, as the models are built) to the world, through exactly the transforms the
 * scene applies: heading, then roll and pitch, then the class's lift. `q` receives the hull's orientation.
 */
export function hullToWorld(b: BoatRuntime, p: Vec3, out: Vector3, q = new Quaternion()) {
  euler.set(0, b.heading - Math.PI / 2, 0)
  qOuter.setFromEuler(euler)
  euler.set(b.roll, 0, b.pitch)
  qInner.setFromEuler(euler)
  q.copy(qOuter).multiply(qInner)
  return out.set(p[0], p[1] + VESSEL_CLASS_SPECS[b.who.boat].lift, p[2]).applyQuaternion(q).add(tmp.set(b.x, b.y, b.z))
}
const tmp = new Vector3()
const roller = new Vector3()

/** Where the boat's centre lies when riding to its anchor at its current heading */
export function anchorRest(b: BoatRuntime) {
  const reach = VESSEL_CLASS_SPECS[b.who.boat].mounts.roller[0] + b.anchor.scope
  return { x: b.anchor.x - Math.sin(b.heading) * reach, z: b.anchor.z - Math.cos(b.heading) * reach }
}

// ─── commands ──────────────────────────────────────────────────────────────────

/** Let go: it falls from the bow roller */
export function letGo(b: BoatRuntime) {
  const a = b.anchor
  hullToWorld(b, VESSEL_CLASS_SPECS[b.who.boat].mounts.roller, roller)
  Object.assign(a, { stage: 'dropping', x: roller.x, y: roller.y - 0.03, z: roller.z, vy: 0, wet: false, scope: 0, lifting: false, snubbed: false })
}

/** Weigh: haul the rode in and bring it up */
export function weigh(b: BoatRuntime) {
  if (b.anchor.stage === 'holding') Object.assign(b.anchor, { stage: 'weighing', lifting: false })
}

// ─── each frame ────────────────────────────────────────────────────────────────

export function stepAnchor(b: BoatRuntime, store: HarborStore, t: number, dt: number) {
  const a = b.anchor
  const spec = VESSEL_CLASS_SPECS[b.who.boat]
  if (a.stage === 'stowed') return
  hullToWorld(b, spec.mounts.roller, roller)

  if (a.stage === 'dropping') {
    if (!a.wet) {
      // still in the air: it falls with the boat's way under it
      a.vy -= FALL * dt
      a.y += a.vy * dt
      a.x = roller.x
      a.z = roller.z
      if (a.y < seaAt(a.x, a.z, t).h) {
        a.wet = true
        a.floor = seabed(a.x, a.z)
        store.events.push({ kind: 'splash', x: a.x, z: a.z, size: spec.anchor * 3.2 })
      }
    } else {
      // through the water: drag brings it to a steady sink
      a.vy += (-SINK - a.vy) * (1 - Math.exp(-4 * dt))
      a.y += a.vy * dt
    }
    if (a.wet && a.y <= a.floor) {
      a.y = a.floor
      a.vy = 0
      a.stage = 'holding'
    }
    return
  }

  if (a.stage === 'holding') {
    // the rode pays out and the boat falls back; when it comes taut the bow snubs down once
    if (a.scope < SCOPE) {
      a.scope = Math.min(SCOPE, a.scope + PAY_OUT * dt)
      if (a.scope === SCOPE && !a.snubbed) {
        a.snubbed = true
        b.vPitch -= 0.05 + spec.anchor * 0.2
      }
    }
    return
  }

  // weighing
  if (!a.lifting) {
    // rode coming in draws the boat up over its anchor; once the bow is above it, it breaks out
    a.scope = Math.max(0, a.scope - HAUL * dt)
    if (a.scope === 0 && Math.hypot(roller.x - a.x, roller.z - a.z) < 0.18) {
      a.lifting = true
      b.vPitch -= 0.04
    }
    return
  }
  // coming up under the bow, drifting in to hang below the roller
  const k = 1 - Math.exp(-3 * dt)
  a.x += (roller.x - a.x) * k
  a.z += (roller.z - a.z) * k
  a.y = Math.min(roller.y - 0.03, a.y + RISE * dt)
  if (a.wet && a.y > seaAt(a.x, a.z, t).h) {
    a.wet = false
    store.events.push({ kind: 'splash', x: a.x, z: a.z, size: spec.anchor * 1.8 })
  }
  if (roller.y - 0.03 - a.y < 0.005 && Math.hypot(roller.x - a.x, roller.z - a.z) < 0.03) {
    Object.assign(a, { stage: 'stowed', lifting: false, scope: 0 })
  }
}
