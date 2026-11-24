import { CatmullRomCurve3, Vector3 } from 'three'
import { coastShore } from './coast'

// Harbor basics shared by berths, routes and the simulation. Every moored boat swings to the same breeze, so moored
// boats all lie the same way, bows toward the lighthouse side of the screen.

/** Moored boats lie head to wind */
export const MOOR_HEADING = Math.atan2(-0.906, 0.423)
export const FWD = { x: Math.sin(MOOR_HEADING), z: Math.cos(MOOR_HEADING) }

/** Middle of the harbor, for lighting and the water surface */
export const FIELD_CENTER = { x: 12, z: 9 }

/** A boat's mooring: where it lies and its approach, a few lengths astern along the wind */
export type Berth = { x: number; z: number }

type PathSample = { x: number; z: number; heading: number }
export type Path = { length: number; samples: PathSample[] }

/** A smooth route through waypoints, sampled evenly by distance */
export function smoothPath(points: { x: number; z: number }[]): Path {
  const curve = new CatmullRomCurve3(
    points.map((p) => new Vector3(p.x, 0, p.z)),
    false,
    'centripetal'
  )
  const length = curve.getLength()
  const N = Math.max(60, Math.round(length * 12))
  const samples = Array.from({ length: N + 1 }, (_, i) => {
    const p = curve.getPointAt(i / N)
    const t = curve.getTangentAt(i / N)
    return { x: p.x, z: p.z, heading: Math.atan2(t.x, t.z) }
  })
  return { length, samples }
}

export function pathAt(path: Path, s: number) {
  const f = (Math.min(Math.max(s, 0), path.length) / path.length) * (path.samples.length - 1)
  const i = Math.min(Math.floor(f), path.samples.length - 2)
  const k = f - i
  const a = path.samples[i]
  const b = path.samples[i + 1]
  const dh = Math.atan2(Math.sin(b.heading - a.heading), Math.cos(b.heading - a.heading))
  return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, heading: a.heading + dh * k }
}

/** The harbor's land: the island and the mainland coast */
export const harborShore = coastShore
