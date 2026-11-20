import { angleDelta, damp } from '../../../voyage/_lib/fleet'
import { playArrival } from '../boatAudio'
import { harborShore, MOOR_HEADING, pathAt } from '../harbor'
import type { BoatRuntime, HarborStore } from '../store'
import { VIEW } from '../view'
import { seaAt, swellMask } from '../waves'
import { anchorRest, letGo, SCOPE, stepAnchor } from './anchor'
import { VESSEL_CLASS_SPECS, VesselClassSpec } from './classes'

// One movement system for every vessel, whoever has the helm. Each frame a boat is driven by one of:
//   autopilot  a check-in arrival following its planned route in (the speed and heading response it always had)
//   helm       a player's throttle and steering: it gathers way, carries it, turns only with way on, and sheds it
//   anchor     riding to its anchor, swinging head to wind; drawn forward as the rode comes in
//   coast      no drive while the anchor is going down or coming up: it carries its way off
// and then, for all of them alike, the anchor, buoyancy and rig. Players also collide with the shore and other boats.

/** Deceleration on the approach: v = √(2·a·d) keeps it even all the way to a stop */
const BRAKE = 1.15
/** An arrival runs on this far past its berth, lets go, and falls back onto the berth as the rode pays out */
const OVERRUN = SCOPE
/** Spring and damping of a boat riding to its anchor (a gentle surge, a small overshoot when it snubs up) */
const RODE_K = 4
const RODE_C = 2.2
/** Open water a player's hull keeps between itself and the beach */
const SHORE_CLEARANCE = 0.25
/** The navigable box: well past the frame on every side */
const BOUNDS = { x0: -34, x1: 62, z0: -34, z1: 54 }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** Each boat's own phase for its idle motion, so neighbours don't move in step */
const phaseOf = (b: BoatRuntime) => b.id.length * 0.37 + b.berth.x * 0.21

export function stepVessel(b: BoatRuntime, store: HarborStore, now: number, dt: number, t: number) {
  const spec = VESSEL_CLASS_SPECS[b.who.boat]
  if (b.phase === 'waiting') {
    if (now < b.launchAt) return
    b.phase = 'arriving'
    b.speed = spec.handling.cruise
    // left–right placement for the cue: where it enters relative to the middle of the shot
    playArrival(b.who.boat, b.who.index, clamp((b.x - VIEW.target.x) / 22, -1, 1))
  }
  b.age += dt
  const before = b.speed
  const a = b.anchor

  if (b.phase === 'arriving') autopilot(b, spec, dt)
  else if (a.stage === 'holding' || (a.stage === 'weighing' && !a.lifting)) rideToAnchor(b, dt, t)
  else if (b.phase === 'underway' && b.control === 'player' && a.stage === 'stowed') helm(b, spec, dt)
  else coast(b, spec, dt)

  stepAnchor(b, store, t, dt)
  // a boat under way that has just got its anchor down settles onto it, as an arrival does
  if (b.phase === 'underway' && a.stage === 'holding') {
    b.phase = 'settling'
    b.settled = 0
    b.rig.moored = true
  }
  if (b.phase === 'settling') {
    b.settled += dt
    if (b.settled > 1.5 && a.stage === 'holding' && a.scope === SCOPE) b.phase = 'moored'
  }

  ride(b, spec, t, dt, (b.speed - before) / Math.max(dt, 1e-4))
  rig(b, spec, dt)
}

/** Keeps players clear of every other hull: three circles per boat along its length */
export function separate(store: HarborStore) {
  for (const p of store.boats.values()) {
    if (p.control !== 'player' || p.phase === 'waiting') continue
    const ps = VESSEL_CLASS_SPECS[p.who.boat].dims
    for (const o of store.boats.values()) {
      if (o === p || o.phase === 'waiting') continue
      const os = VESSEL_CLASS_SPECS[o.who.boat].dims
      if (Math.hypot(p.x - o.x, p.z - o.z) > (ps.length + os.length) / 2 + 0.5) continue
      const r = (ps.beam + os.beam) / 2 + 0.06
      for (const i of [-1, 0, 1])
        for (const j of [-1, 0, 1]) {
          const px = p.x + Math.sin(p.heading) * ps.length * 0.34 * i
          const pz = p.z + Math.cos(p.heading) * ps.length * 0.34 * i
          const ox = o.x + Math.sin(o.heading) * os.length * 0.34 * j
          const oz = o.z + Math.cos(o.heading) * os.length * 0.34 * j
          const d = Math.hypot(px - ox, pz - oz)
          if (d >= r || d < 1e-5) continue
          // a fellow player takes half the push; anyone else holds their ground
          const share = o.control === 'player' ? 0.5 : 1
          p.x += ((px - ox) / d) * (r - d) * share
          p.z += ((pz - oz) / d) * (r - d) * share
          p.speed *= 0.92
        }
    }
  }
}

// ─── drives ────────────────────────────────────────────────────────────────────

/** A check-in arrival: on along its route at a purposeful clip, easing off over the last stretch, straight up head to wind */
function autopilot(b: BoatRuntime, spec: VesselClassSpec, dt: number) {
  if (!b.path) return
  const cruise = spec.handling.cruise
  const total = b.path.length + OVERRUN
  const remaining = total - b.s
  const target = Math.min(cruise, Math.sqrt(2 * BRAKE * Math.max(remaining, 0)) + 0.05)
  b.speed += (target - b.speed) * damp(target < b.speed ? 3 : 1.5, dt)
  b.s = Math.min(total, b.s + b.speed * dt)
  let p = pathAt(b.path, b.s)
  if (b.s > b.path.length) {
    // the run on past the berth, straight along the route's last heading
    const end = pathAt(b.path, b.path.length)
    const on = b.s - b.path.length
    p = { x: end.x + Math.sin(end.heading) * on, z: end.z + Math.cos(end.heading) * on, heading: end.heading }
  }
  const prev = b.heading
  b.heading += angleDelta(b.heading, p.heading) * damp(6, dt)
  b.turnRate += ((b.heading - prev) / Math.max(dt, 1e-4) - b.turnRate) * damp(3, dt)
  b.x = p.x
  b.z = p.z
  b.rig.hoist = clamp((remaining - 1) / 4, 0, 1)
  if (remaining < 0.015) {
    b.phase = 'settling'
    b.settled = 0
    b.speed = 0
    b.rig.moored = true
    letGo(b)
  }
}

/** A player's helm: throttle sets the speed it works up to, the rudder only bites with way on */
function helm(b: BoatRuntime, spec: VesselClassSpec, dt: number) {
  const h = spec.handling
  const throttle = clamp(b.helm.throttle, -1, 1)
  const target = throttle >= 0 ? throttle * h.cruise : throttle * h.cruise * h.reverse
  const gathering = Math.abs(target) > Math.abs(b.speed) && (Math.abs(b.speed) < 0.02 || Math.sign(target) === Math.sign(b.speed))
  const rate = gathering ? h.accel : h.brake
  b.speed += clamp(target - b.speed, -rate * dt, rate * dt)
  // steerage way: a little turn at rest (so a stopped boat can be pointed), the full rate from a quarter of top speed
  const flow = Math.min(1, Math.abs(b.speed) / (h.cruise * 0.25))
  // steering right turns to starboard, which is a falling heading; going astern the rudder works the other way
  const yaw = -clamp(b.helm.steer, -1, 1) * h.turn * (0.12 + 0.88 * flow) * (b.speed < -0.05 ? -1 : 1)
  b.turnRate += (yaw - b.turnRate) * damp(2.5, dt)
  b.heading += b.turnRate * dt
  b.x += Math.sin(b.heading) * b.speed * dt
  b.z += Math.cos(b.heading) * b.speed * dt
  keepOffShore(b, spec)
  b.x = clamp(b.x, BOUNDS.x0, BOUNDS.x1)
  b.z = clamp(b.z, BOUNDS.z0, BOUNDS.z1)
}

/** No drive: the anchor is on its way down or up, or nobody has the helm. It carries its way off. */
function coast(b: BoatRuntime, spec: VesselClassSpec, dt: number) {
  const brake = spec.handling.brake * 0.8 * dt
  b.speed -= clamp(b.speed, -brake, brake)
  b.turnRate += (0 - b.turnRate) * damp(2, dt)
  b.heading += b.turnRate * dt
  b.x += Math.sin(b.heading) * b.speed * dt
  b.z += Math.cos(b.heading) * b.speed * dt
  if (b.control === 'player') keepOffShore(b, spec)
}

/** Lying to its anchor: it swings lazily head to wind about the anchor, held by the rode as a soft spring */
function rideToAnchor(b: BoatRuntime, dt: number, t: number) {
  const swing = Math.sin(t * 0.21 + phaseOf(b)) * 0.05
  const prev = b.heading
  b.heading += angleDelta(b.heading, MOOR_HEADING + swing) * damp(b.phase === 'moored' ? 0.8 : 2, dt)
  b.turnRate += ((b.heading - prev) / Math.max(dt, 1e-4) - b.turnRate) * damp(3, dt)
  const rest = anchorRest(b)
  b.vx += ((rest.x - b.x) * RODE_K - b.vx * RODE_C) * dt
  b.vz += ((rest.z - b.z) * RODE_K - b.vz * RODE_C) * dt
  b.x += b.vx * dt
  b.z += b.vz * dt
  b.speed = b.vx * Math.sin(b.heading) + b.vz * Math.cos(b.heading)
}

/** Pushes a hull back off the beach along the shore's normal, shedding the way that drove it in */
function keepOffShore(b: BoatRuntime, spec: VesselClassSpec) {
  const need = spec.dims.beam / 2 + SHORE_CLEARANCE
  const fx = Math.sin(b.heading)
  const fz = Math.cos(b.heading)
  for (const k of [0.42, 0, -0.42]) {
    const px = b.x + fx * spec.dims.length * k
    const pz = b.z + fz * spec.dims.length * k
    const d = harborShore(px, pz)
    if (d >= need) continue
    const e = 0.1
    let gx = harborShore(px + e, pz) - harborShore(px - e, pz)
    let gz = harborShore(px, pz + e) - harborShore(px, pz - e)
    const g = Math.hypot(gx, gz) || 1
    gx /= g
    gz /= g
    b.x += gx * (need - d)
    b.z += gz * (need - d)
    const into = -(fx * gx + fz * gz) * Math.sign(b.speed)
    if (into > 0) b.speed *= 1 - 0.85 * into
  }
}

// ─── buoyancy ──────────────────────────────────────────────────────────────────

/**
 * Riding the swell. The sea is sampled at bow, stern and both sides, so a hull bridges short waves and follows long
 * ones; heave, pitch and roll then chase that surface as damped springs tuned per class (light boats are quick and
 * lively, the keel boat slow and stiff), with the heel of a turn, the bow lifting under power and dipping as it brakes,
 * and a rock as it settles.
 */
function ride(b: BoatRuntime, spec: VesselClassSpec, t: number, dt: number, accel: number) {
  const mask = swellMask(b.x, b.z)
  const fx = Math.sin(b.heading)
  const fz = Math.cos(b.heading)
  const L = spec.dims.length * 0.4
  const B = spec.dims.beam * 0.45
  const bow = seaAt(b.x + fx * L, b.z + fz * L, t, mask).h
  const stern = seaAt(b.x - fx * L, b.z - fz * L, t, mask).h
  // the hull's +z side (starboard) lies along (-fz, fx)
  const stbd = seaAt(b.x - fz * B, b.z + fx * B, t, mask).h
  const port = seaAt(b.x + fz * B, b.z - fx * B, t, mask).h

  const ph = phaseOf(b)
  const h = spec.handling
  const speedNorm = clamp(b.speed / h.cruise, -1, 1)
  const idle = 1 - Math.min(1, Math.abs(speedNorm) * 1.4)
  const settle = b.phase === 'settling' ? Math.exp(-b.settled * 1.6) : 0

  const heave = (bow + stern + stbd + port) / 4 + Math.sin(t * 1.3 + ph) * 0.01
  // heel into a turn, up to the class's limit (a sharp kink in a route shouldn't lay a lobster boat on its side)
  const rollTarget =
    clamp(-b.turnRate * speedNorm * h.lean, -h.heel, h.heel) -
    Math.atan2(stbd - port, 2 * B) * 0.9 +
    Math.sin(t * 1.15 + ph) * (0.012 + 0.012 * idle) +
    settle * Math.sin(b.settled * 4.2) * 0.06
  const pitchTarget =
    h.planing * Math.max(0, speedNorm) +
    Math.atan2(bow - stern, 2 * L) * 0.9 +
    clamp(accel, -3, 3) * 0.012 +
    Math.sin(t * 1.5 + ph * 2) * (0.008 + 0.008 * idle) -
    settle * Math.sin(b.settled * 3.4 + 0.5) * 0.05

  const r = spec.ride
  b.vy += (r.heave * r.heave * (heave - b.y) - 2 * r.damping * r.heave * b.vy) * dt
  b.y += b.vy * dt
  b.vPitch += (r.pitch * r.pitch * (pitchTarget - b.pitch) - 2 * r.damping * r.pitch * b.vPitch) * dt
  b.pitch += b.vPitch * dt
  b.vRoll += (r.roll * r.roll * (rollTarget - b.roll) - 2 * r.damping * r.roll * b.vRoll) * dt
  b.roll += b.vRoll * dt
}

/** Sails up under way and down at anchor; the propeller turns with the way it's making */
function rig(b: BoatRuntime, spec: VesselClassSpec, dt: number) {
  if (b.phase === 'underway') b.rig.hoist = clamp(b.rig.hoist + (b.anchor.stage === 'stowed' ? 0.5 : -0.5) * dt, 0, 1)
  const driving = b.phase === 'arriving' || (b.phase === 'underway' && b.anchor.stage === 'stowed') || b.anchor.stage === 'weighing'
  const target = driving ? b.speed / spec.handling.cruise : 0
  b.rig.prop += (target - b.rig.prop) * damp(2, dt)
}
