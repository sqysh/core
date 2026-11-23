import { Euler, Quaternion, Vector3 } from 'three'
import { TerrainSampler } from './terrain'

// Grounding an asset on the terrain. Each asset says how it meets the ground (its anchor): a few footprint points
// around its base, how deep it sinks in below them, and how far it may lean to follow the slope. Rocks are embedded
// rather than set on top, so they look like they grew out of the ground rather than landed on it.

export type GroundAnchor = {
  /** Points around the base, in the asset's own frame (x, z), where it meets the ground */
  footprint: [number, number][]
  /** How far below the footprint's average ground height the asset's origin goes */
  embed: number
  /** Most it may lean to follow the ground (radians); 0 keeps it upright */
  maxTilt: number
}

export type Placement = { position: Vector3; quaternion: Quaternion }

const up = new Vector3(0, 1, 0)

/** Where an asset sits on the terrain at (x, z), turned by `yaw` */
export function placeOnGround(terrain: TerrainSampler, anchor: GroundAnchor, x: number, z: number, yaw = 0): Placement {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  let sum = 0
  const avgNormal = new Vector3()
  const n = new Vector3()
  for (const [fx, fz] of anchor.footprint) {
    const wx = x + c * fx + s * fz
    const wz = z - s * fx + c * fz
    sum += terrain.height(wx, wz)
    avgNormal.add(terrain.normal(wx, wz, n))
  }
  const ground = anchor.footprint.length ? sum / anchor.footprint.length : terrain.height(x, z)
  avgNormal.normalize()

  // lean toward the ground's average slope, but no further than the anchor allows
  const lean = new Quaternion()
  const angle = Math.min(avgNormal.angleTo(up), anchor.maxTilt)
  if (angle > 1e-4) lean.setFromAxisAngle(new Vector3().crossVectors(up, avgNormal).normalize(), angle)
  const quaternion = lean.multiply(new Quaternion().setFromEuler(new Euler(0, yaw, 0)))
  return { position: new Vector3(x, ground - anchor.embed, z), quaternion }
}

/** A ring of footprint points: n points round an ellipse of radii (rx, rz) */
export function ringFootprint(rx: number, rz: number, n = 8): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return [Math.cos(a) * rx, Math.sin(a) * rz] as [number, number]
  })
}
