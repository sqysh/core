import { Vector3 } from 'three'
import { plateRect } from '../berths'
import { FWD } from '../harbor'
import type { BoatRuntime } from '../store'
import { hullToWorld, letGo, SCOPE, weigh } from './anchor'
import { VESSEL_CLASS_SPECS } from './classes'

// Handing a vessel between the autopilot and a player, and the player's anchor command. A boat lying to its anchor
// weighs it before it can make way; letting go brings it to a stop, and once the anchor bites it's moored again
// wherever it is, and later arrivals keep clear of its new berth.

/** Slowest a boat must be going before it will let go */
const LET_GO_SPEED = 1.0
const at = new Vector3()

/** A player takes the helm of a boat that has arrived. It weighs anchor first. */
export function takeHelm(b: BoatRuntime) {
  if (b.phase === 'waiting' || b.phase === 'arriving') return false
  b.control = 'player'
  b.helm.throttle = 0
  b.helm.steer = 0
  weigh(b)
  b.phase = 'underway'
  b.rig.moored = false
  return true
}

/** Let go here: the boat stops and lies to its anchor where it is */
export function anchorHere(b: BoatRuntime) {
  if (b.anchor.stage !== 'stowed' || Math.abs(b.speed) > LET_GO_SPEED) return false
  letGo(b)
  // where it will lie once it falls back, head to wind: its berth from now on, kept clear by later arrivals
  const spec = b.who.spec
  hullToWorld(b, spec.mounts.roller, at)
  const reach = spec.mounts.roller[0] + SCOPE
  b.berth = { x: at.x - FWD.x * reach, z: at.z - FWD.z * reach }
  b.plate = plateRect(b.berth.x, b.berth.z, b.who.spec.dims, b.who.label)
  return true
}

/** The player lets go of the helm: the anchor goes down and the boat holds there on its own */
export function releaseHelm(b: BoatRuntime) {
  b.helm.throttle = 0
  b.helm.steer = 0
  if (b.anchor.stage === 'stowed') anchorHere(b)
  b.control = 'auto'
}
