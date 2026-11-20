import type { BoatRuntime } from '../store'
import type { AnchorStage } from './anchor'

// The wire format for sharing a vessel between screens, ready for multiplayer: a member's phone sends HelmInput (see
// store.ts) to the server, the server (the authority, so it can check bounds, collisions and anything a treasure is
// worth) steps the vessel and broadcasts snapshots, and the TV draws each remote vessel by interpolating between them.
// Only the kinematics travel; buoyancy, rig and wakes are recomputed on every screen from the shared sea, so they cost
// nothing on the wire and stay smooth between updates.

export type VesselSnapshot = {
  id: string
  /** Increases with every snapshot of this vessel, so late or duplicate packets are dropped */
  seq: number
  /** Server time (ms) it describes */
  t: number
  x: number
  z: number
  heading: number
  speed: number
  turnRate: number
  anchor: AnchorStage
}

export const snapshotOf = (b: BoatRuntime, seq: number, t: number): VesselSnapshot => ({
  id: b.id,
  seq,
  t,
  x: b.x,
  z: b.z,
  heading: b.heading,
  speed: b.speed,
  turnRate: b.turnRate,
  anchor: b.anchor.stage
})
