import { SEA_LOOK } from './seaLook'
import { lighthouseShore } from '../lighthouse/lighthouseTile'
import { fbm3, smoothstep } from '../lighthouse/noise'
import { beachHeight } from '../lighthouse/shore'
import { at } from '../lighthouse/world'

// The coast, laid out the way the voyage world was: the lighthouse island exactly as the diorama modelled it, now
// the tip of a peninsula — a sandy neck joins it to a rocky mainland behind and to the left — with a rock islet
// behind the harbor, a sandbar and a lone rock in the water. Shapes are authored in screen-aligned (u, v): u runs
// left → right across the screen, v toward the viewer (the `at` helper the diorama itself uses).

type Lobe = { u: number; v: number; ru: number; rv: number; rot: number; seed: number }
type Bar = { a: [number, number]; b: [number, number]; w: number }

/** The most a lobe's outline wobbles (its two waves and fbm3's three octaves), with a margin */
const WOBBLE_MAX = 0.25

type Shape = Lobe & { cx: number; cz: number; cos: number; sin: number; r: number }
/** A lobe with its centre and rotation worked out once */
const shape = (l: Lobe): Shape => {
  const [cx, cz] = at(l.u, l.v)
  return { ...l, cx, cz, cos: Math.cos(l.rot), sin: Math.sin(l.rot), r: Math.min(l.ru, l.rv) }
}

/** The mainland: a cluster of overlapping lobes, so its outline wanders */
const MAINLAND: Shape[] = [
  { u: -13.5, v: -8.5, ru: 7.0, rv: 5.6, rot: 0.3, seed: 3 },
  { u: -17.5, v: -13, ru: 6.5, rv: 5.0, rot: -0.2, seed: 4 },
  { u: -11, v: -16, ru: 5.5, rv: 4.2, rot: 0.5, seed: 5 },
  { u: -20.5, v: -4, ru: 4.6, rv: 3.4, rot: 0.1, seed: 6 },
  { u: -27, v: -19, ru: 9, rv: 8, rot: 0, seed: 7 }
].map(shape)
/** The neck from the island's back-left shore to the mainland */
const NECK: Bar = { a: [-4.6, -1.6], b: [-8.2, -5.2], w: 1.7 }
const ISLET = shape({ u: 13.5, v: -11.5, ru: 2.1, rv: 1.6, rot: 0.3, seed: 9 })
const SANDBAR = shape({ u: -9, v: 10.5, ru: 1.5, rv: 1.1, rot: 0.4, seed: 11 })
const ROCK = shape({ u: 7.5, v: 5.5, ru: 0.55, rv: 0.55, rot: 0, seed: 13 })

/**
 * Distance from a lobe's outline. Past `cutoff` the exact value can't matter to the caller, so when even the furthest
 * in the wobble could reach is past it, the noise is skipped and Infinity returned: the coast comes out bit-for-bit
 * the same, without the noise for every lobe at every point.
 */
function lobe(l: Shape, x: number, z: number, cutoff = Infinity) {
  const dx = x - l.cx
  const dz = z - l.cz
  // (u, v) axes are the diagonals of (x, z)
  const du = (dx - dz) * Math.SQRT1_2
  const dv = (dx + dz) * Math.SQRT1_2
  const a = (du * l.cos + dv * l.sin) / l.ru
  const b = (-du * l.sin + dv * l.cos) / l.rv
  const len = Math.hypot(a, b)
  if ((len - 1 - WOBBLE_MAX) * l.r >= cutoff) return Infinity
  const ang = Math.atan2(b, a)
  const wob = 0.1 * Math.sin(ang * 3 + l.seed) + 0.07 * Math.sin(ang * 5 + l.seed * 2) + 0.08 * fbm3(x * 0.9, 0, z * 0.9, l.seed)
  return (len - 1 - wob) * l.r
}
function bar(b: Bar, x: number, z: number) {
  const [ax, az] = at(...b.a)
  const [bx, bz] = at(...b.b)
  const dx = bx - ax
  const dz = bz - az
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t)) - b.w * (0.8 + 0.2 * Math.abs(t * 2 - 1))
}
const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

/** Every shore: negative on land, positive over water, roughly in world units */
export const coastShore = (x: number, z: number) => {
  let d = lighthouseShore(x, z)
  d = smin(d, bar(NECK, x, z), 1.4)
  // a lobe more than the blend width (2) beyond d leaves smin at exactly d; one beyond d leaves min at d
  for (const l of MAINLAND) d = smin(d, lobe(l, x, z, d + 2.001), 2.0)
  d = Math.min(d, lobe(ISLET, x, z, d), lobe(SANDBAR, x, z, d), lobe(ROCK, x, z, d))
  return d
}

/** Outside the lighthouse island's own tile, which models its own beach */
const outsideTile = (x: number, z: number) => Math.max(Math.abs(x), Math.abs(z)) - 5

/**
 * The sea floor and the beaches: the diorama's beach profile along every shore (sand rolling down to -0.5), then,
 * away from the island's tile, shelving on down to the deep so the water's clarity has real depth to follow.
 */
export function seabed(x: number, z: number, d = coastShore(x, z)) {
  // a clean beach: one gentle slope from the dry sand down under the water, with only the faintest roll
  const top = 0.32 + 0.012 * fbm3(x * 0.5, 0, z * 0.5, 70)
  // the beach is wide where the shore is sandy and narrow where it is rocky, so land isn't ringed by one even halo
  const rocky = smoothstep(0.1, 0.6, fbm3(x * 0.16, 4, z * 0.16, 74))
  // the underwater shelf wanders in and out (more irregular the further from the sand), so no even halo rings the land
  const dw = d + SEA_LOOK.shelfIrregularity * fbm3(x * 0.27, 3, z * 0.27, 75) * smoothstep(0.1, 1.2, d)
  const clean = top + (-0.5 - top) * smoothstep(-1.15 + 0.55 * rocky, 0.65 - 0.35 * rocky, dw)
  // right at the island's tile it eases into the tile's own beach, so the neck is one continuous strand
  const out = outsideTile(x, z)
  const beach = out < 1.5 ? beachHeight(coastShore, x, z, 0, 0, 0) * (1 - smoothstep(0, 1.5, out)) + clean * smoothstep(0, 1.5, out) : clean
  // the sea floor shelves unevenly: banks and hollows, so the clear water shows real variation in depth
  const deeper = -1.8 * smoothstep(0.6, 5, dw) * smoothstep(0, 3, out) - 1.4 * smoothstep(5, 14, d)
  const relief = (0.22 * fbm3(x * 0.18, 1, z * 0.18, 71) + 0.09 * fbm3(x * 0.55, 2, z * 0.55, 72)) * smoothstep(0.5, 2.5, d)
  return beach + deeper + relief
}

/** Nothing moored in the way here: the diorama's rowboat is up on the sand */
export const pierDistance = (_x: number, _z: number) => Infinity
