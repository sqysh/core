import { CatmullRomCurve3, Vector3 } from 'three'
import { worldShore } from './worldMap'

// The demonstration route: a closed loop that leaves the lighthouse heading east, runs north up the channel beside
// the island, east along the top of the world, south down the far side, west along the bottom, and swings back
// north-then-east into the start. Every heading — north, south, east, west — and plenty of bends.

const WAYPOINTS: [number, number][] = [
  [1.2, 6.4], // start, heading east below the lighthouse
  [4.6, 6.2],
  [6.4, 3.6], // north up the channel
  [6.6, -0.8],
  [7.6, -3.5], // east along the north edge
  [10.6, -3.7],
  [12.9, -2.6], // south down the east side
  [12.4, 2.8],
  [12.0, 7.4],
  [12.2, 10.9],
  [10.6, 12.9], // west along the south edge, round the sandbar
  [7.2, 12.6],
  [5.0, 10.0],
  [2.6, 9.8],
  [0.6, 9.4],
  [-0.1, 8.0] // the turn north, then east back into the start
]

const SAMPLES = 2400

export type RouteSample = { x: number; z: number; tx: number; tz: number; curvature: number }

function build() {
  const curve = new CatmullRomCurve3(
    WAYPOINTS.map(([x, z]) => new Vector3(x, 0, z)),
    true,
    'centripetal'
  )
  const length = curve.getLength()
  const samples: RouteSample[] = []
  const p = new Vector3()
  const t = new Vector3()
  for (let i = 0; i < SAMPLES; i++) {
    const u = i / SAMPLES
    curve.getPointAt(u, p)
    curve.getTangentAt(u, t)
    samples.push({ x: p.x, z: p.z, tx: t.x, tz: t.z, curvature: 0 })
  }
  // curvature: turn of the tangent per unit length, smoothed so speed changes ease in and out of bends
  const ds = length / SAMPLES
  const raw = samples.map((s, i) => {
    const n = samples[(i + 1) % SAMPLES]
    const a0 = Math.atan2(s.tx, s.tz)
    const a1 = Math.atan2(n.tx, n.tz)
    let d = a1 - a0
    d = Math.atan2(Math.sin(d), Math.cos(d))
    return Math.abs(d) / ds
  })
  const win = Math.round(1.6 / ds)
  for (let i = 0; i < SAMPLES; i++) {
    let sum = 0
    for (let k = -win; k <= win; k++) sum += raw[(i + k + SAMPLES) % SAMPLES]
    samples[i].curvature = sum / (win * 2 + 1)
  }
  return { length, samples }
}

export const ROUTE = build()

const wrap = (s: number) => ((s % ROUTE.length) + ROUTE.length) % ROUTE.length

/** The route at distance `s` along it (any value; it loops) */
export function routeAt(s: number): RouteSample {
  const f = (wrap(s) / ROUTE.length) * SAMPLES
  const i = Math.floor(f)
  const a = ROUTE.samples[i % SAMPLES]
  const b = ROUTE.samples[(i + 1) % SAMPLES]
  const k = f - i
  return {
    x: a.x + (b.x - a.x) * k,
    z: a.z + (b.z - a.z) * k,
    tx: a.tx + (b.tx - a.tx) * k,
    tz: a.tz + (b.tz - a.tz) * k,
    curvature: a.curvature + (b.curvature - a.curvature) * k
  }
}

/** Average heading over a stretch of route, for a camera that anticipates bends instead of snapping to them */
export function headingAround(s: number, behind: number, ahead: number) {
  let x = 0
  let z = 0
  const steps = 12
  for (let i = 0; i <= steps; i++) {
    const r = routeAt(s - behind + ((behind + ahead) * i) / steps)
    x += r.tx
    z += r.tz
  }
  return Math.atan2(x, z)
}

/** Smallest clearance between the route (widened by the fleet's lane offsets) and any shore */
export function routeClearance(laneHalfWidth: number) {
  let min = Infinity
  let at = 0
  for (let i = 0; i < SAMPLES; i += 4) {
    const s = ROUTE.samples[i]
    for (const side of [-1, 0, 1]) {
      const x = s.x + -s.tz * laneHalfWidth * side
      const z = s.z + s.tx * laneHalfWidth * side
      const d = worldShore(x, z)
      if (d < min) {
        min = d
        at = i
      }
    }
  }
  const s = ROUTE.samples[at]
  return { min, x: s.x, z: s.z }
}
