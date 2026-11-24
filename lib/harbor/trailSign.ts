import { BufferGeometry, CatmullRomCurve3, Vector3 } from 'three'
import { at } from '../lighthouse/world'
import { rng } from '../lighthouse/noise'
import { SLABS } from './formations'
import { groundHeight, groundSlope } from './terrain'
import { vine } from './vegetationKit'
import { viewAxes } from './view'

// A weathered trail sign on the open sand at the far left of the mainland, a waypoint on a coastal walking path:
// a plain wooden board with a slim frame on short posts sunk into the sand, the QR on its face, the base grown over with
// dune grass, shrubs, wildflowers and creeping vines. A winding trail of irregular sandstone stepping stones comes
// in from the east, passes in front of the sign and carries on past it, out toward the rest of the landscape.
//
// Everything is laid out here, in the plaque's own frame (a = screen-right, b = screen-up, s = toward the camera), so the
// code's rectangle is known to be clear and can be checked with rays.

/** Side of the QR face in world units, quiet zone included: the working size (~2.4 px per module at 1080p) */
export const QR_FACE = 2.6
export const SIGN_AT = { u: -18.5, v: -2.9 }
/** The trail, (u, v) waypoints: in from the east along the sand, past the sign's east side and in front of it, on west */
export const TRAIL: [number, number][] = [
  [-10.8, -5.3],
  [-12.7, -4.6],
  [-14.5, -4.0],
  [-16.0, -3.65],
  [-16.85, -3.0],
  [-17.0, -2.1],
  [-18.0, -1.55],
  [-19.6, -1.6],
  [-20.8, -2.1],
  [-22.0, -3.0]
]

type SignPlan = {
  centre: Vector3
  n: Vector3
  right: Vector3
  up: Vector3
  /** post bases and tops: front legs hold the board's bottom edge, back posts rise behind it */
  posts: { base: Vector3; top: Vector3; r: number }[]
}

/** The sign's frame: the plaque's centre (its foot a metre above the sand) and its four posts */
export function planSign(): SignPlan {
  const { n, right, up } = viewAxes()
  const [x, z] = at(SIGN_AT.u, SIGN_AT.v)
  const F = QR_FACE / 2
  const foot = groundHeight(x - up.x * F, z - up.z * F)
  const centre = new Vector3(x, foot + 1.0 + up.y * F, z)
  const posts: SignPlan['posts'] = []
  const nh = new Vector3(n.x, 0, n.z).normalize()
  for (const side of [-1, 1]) {
    const bottom = centre.clone().addScaledVector(up, -F).addScaledVector(right, side * 0.9)
    posts.push({ base: new Vector3(bottom.x, groundHeight(bottom.x, bottom.z) - 0.55, bottom.z), top: bottom.clone().addScaledVector(up, -0.1), r: 0.1 })
    const top = centre.clone().addScaledVector(up, F).addScaledVector(right, side * 0.9).addScaledVector(nh, -0.45)
    posts.push({ base: new Vector3(top.x, groundHeight(top.x, top.z) - 0.55, top.z), top: top.clone().add(new Vector3(0, 0.3, 0)), r: 0.11 })
  }
  return { centre, n, right, up, posts }
}

type Growth = {
  vines: BufferGeometry[]
  shrubs: { pos: Vector3; s: number; k: number }[]
  grass: { x: number; y: number; z: number; s: number; rot: number }[]
  flowers: { pos: Vector3; s: number; hue: number }[]
}

const onGround = (p: Vector3, lift = 0.04) => new Vector3(p.x, groundHeight(p.x, p.z) + lift, p.z)

/** Dune grass, shrubs, wildflowers and vines round the sign's base and legs, none of it in front of the code */
export function growSign(plan: SignPlan): Growth {
  const { centre, n, right, up } = plan
  const F = QR_FACE / 2
  const r = rng(1201)
  const world = (a: number, b: number, s = 0) => centre.clone().addScaledVector(right, a).addScaledVector(up, b).addScaledVector(n, s)
  const base = (a: number, d: number) => {
    // a ground point beside / in front of the sign's foot: `a` across, `d` toward the camera, flat on the ground
    const f = centre.clone().addScaledVector(right, a).addScaledVector(up, -F)
    const nh = new Vector3(n.x, 0, n.z).normalize()
    const p = f.addScaledVector(nh, d)
    return onGround(p, 0)
  }

  // vines: wrapped round the front legs, creeping up the frame's outer edges, and trailing across the sand
  const legs = plan.posts.filter((_, i) => i % 2 === 0)
  const vines: BufferGeometry[] = []
  const legFace = new Vector3(n.x, 0, n.z).normalize()
  legs.forEach((p, i) =>
    vines.push(
      vine({ seed: 1301 + i, start: p.base.clone().add(new Vector3(0, 0.55, 0)).add(new Vector3(0.1, 0, 0)), dir: new Vector3(0, 1, 0), length: 0.72, mode: 'wrap', axis: new Vector3(0, 1, 0), radius: 0.15, turns: 2.0, face: legFace, density: 1.4, leaf: 1.0, thickness: 0.017 })
    )
  )
  // climbing the frame's outer side planks, kept clear of the code, lying on the board's plane
  const outer = F + 0.32
  const onBoard = (p: Vector3) => p.clone().addScaledVector(n, -p.clone().sub(centre).dot(n) + 0.03)
  const keepOut = (p: Vector3) => {
    const rel = p.clone().sub(centre)
    const a = rel.dot(right)
    return Math.abs(a) < outer ? p.clone().addScaledVector(right, Math.sign(a || 1) * (outer - Math.abs(a))) : p
  }
  for (const side of [-1, 1])
    vines.push(
      vine({ seed: 1311 + (side > 0 ? 1 : 0), start: world(side * (outer + 0.1), -F - 0.35), dir: up.clone().add(right.clone().multiplyScalar(side * 0.05)), length: 1.9, mode: 'climb', face: n, density: 1.2, hang: 0.25, leaf: 1.0, thickness: 0.016, cling: onBoard, constrain: keepOut })
    )
  // creeping over the sand round the base, hugging the ground
  const flat = new Vector3(0, 1, 0)
  const creep = (seed: number, a: number, d: number, dir: Vector3, length: number) =>
    vines.push(vine({ seed, start: base(a, d), dir, length, mode: 'climb', face: flat, density: 1.3, hang: 0, leaf: 0.95, thickness: 0.015, cling: (p) => onGround(p, 0.035) }))
  creep(1321, -2.2, 0.3, right.clone().multiplyScalar(-1).addScaledVector(n, 0.4), 2.2)
  creep(1322, 2.1, 0.4, right.clone().addScaledVector(n, 0.5), 2.0)
  creep(1323, -0.2, 0.9, right.clone().multiplyScalar(-0.4).addScaledVector(n, 0.9), 1.6)

  // dune grass in loose clumps round the legs and along the foot, shrubs at the corners, wildflowers in a drift
  const grass: Growth['grass'] = []
  for (let k = 0; k < 18; k++) {
    const a = (r() < 0.5 ? -1 : 1) * (0.7 + r() * 2.8)
    const p = base(a, 0.2 + r() * 1.1)
    grass.push({ x: p.x, y: p.y - 0.02, z: p.z, s: 0.8 + r() * 0.6, rot: r() * 6.28 })
  }
  const shrubs = [
    { a: -2.4, d: 0.5, s: 0.9 },
    { a: 2.5, d: 0.2, s: 0.8 },
    { a: -1.3, d: 1.3, s: 0.6 },
    { a: 1.4, d: 1.2, s: 0.55 },
    { a: 3.5, d: -0.4, s: 0.7 }
  ].map((q, k) => ({ pos: base(q.a, q.d).add(new Vector3(0, -0.03, 0)), s: q.s, k: k % 2 }))
  const flowers: Growth['flowers'] = []
  for (let k = 0; k < 34; k++) {
    const a = (r() - 0.5) * 6.2
    const p = base(a, 0.3 + r() * 1.6)
    // a few clear patches rather than an even carpet
    if (Math.sin(a * 1.9 + 1) + r() * 0.8 < 0.1) continue
    flowers.push({ pos: p.add(new Vector3(0, 0.05, 0)), s: 0.7 + r() * 0.6, hue: Math.floor((a + 4) / 2.2) % 4 })
  }
  return { vines, shrubs, grass, flowers }
}

type TrailStone = { x: number; y: number; z: number; s: number; stretch: number; rot: number; tiltX: number; tiltZ: number; k: number }

/** Irregular stepping stones along the trail: uneven spacing, size, turn and lean, each bedded into the sand */
export function trailStones(): { stones: TrailStone[]; tufts: { x: number; y: number; z: number; s: number; rot: number }[] } {
  const curve = new CatmullRomCurve3(
    TRAIL.map(([u, v]) => {
      const [x, z] = at(u, v)
      return new Vector3(x, 0, z)
    }),
    false,
    'centripetal'
  )
  const len = curve.getLength()
  const r = rng(1401)
  const stones: TrailStone[] = []
  const tufts: { x: number; y: number; z: number; s: number; rot: number }[] = []
  let d = 0.3
  while (d < len - 0.2) {
    const t = d / len
    const p = curve.getPointAt(t)
    const tan = curve.getTangentAt(t)
    const nx = -tan.z
    const nz = tan.x
    // the line wanders a little either side, the stride and the stone's size vary, a stone is missed now and then
    const wander = Math.sin(t * 17 + 1) * 0.22 + (r() - 0.5) * 0.22
    const x = p.x + nx * wander
    const z = p.z + nz * wander
    const inRock = SLABS.some((q) => Math.hypot(at(q.u, q.v)[0] - x, at(q.u, q.v)[1] - z) < Math.max(q.w, q.d) * 0.42 + 0.12)
    if (r() > 0.1 && !inRock) {
      const { gx, gz } = groundSlope(x, z)
      stones.push({ x, y: groundHeight(x, z) - 0.035 - r() * 0.03, z, s: 0.16 + r() * 0.13, stretch: 0.65 + r() * 0.6, rot: r() * Math.PI, tiltX: Math.atan(gz) * 0.8 + (r() - 0.5) * 0.1, tiltZ: -Math.atan(gx) * 0.8 + (r() - 0.5) * 0.1, k: Math.floor(r() * 3) })
      if (r() < 0.35) {
        const side = r() < 0.5 ? -1 : 1
        const tx = x + nx * side * (0.28 + r() * 0.18)
        const tz = z + nz * side * (0.28 + r() * 0.18)
        tufts.push({ x: tx, y: groundHeight(tx, tz) - 0.02, z: tz, s: 0.5 + r() * 0.4, rot: r() * 6.28 })
      }
    }
    d += 0.42 + r() * 0.5
  }
  return { stones, tufts }
}
