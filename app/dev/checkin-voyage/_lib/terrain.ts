import { fbm3, noise3, smoothstep } from '../../lighthouse/_lib/noise'
import { at } from '../../lighthouse/_lib/world'
import { coastShore, seabed } from './coast'
import { SLABS } from './formations'

// The mainland's ground, grown from the authored formations: every stone raises a sloped mound round itself, the
// mounds merge into one cohesive mass, ridged noise cuts crevices and raises exposed ridges, and the whole eases down
// through grass bank and sand to the water. The stones then emerge from this ground as ledges and outcrops.
// Reusable: any set of formations makes its own landscape the same way.

type Mound = { x: number; z: number; top: number; hw: number; hd: number; cos: number; sin: number; run: number }

const MOUNDS: Mound[] = SLABS.map((s) => {
  const [x, z] = at(s.u, s.v)
  const a = Math.PI / 4 + (s.rot ?? 0)
  // a stone on the sand has ground reaching a third of the way up it; a stone stacked on another has ground only to
  // just under its own base (level with the terrace below), so the lower stone's top shows as that terrace's edge
  const stacked = s.y > 0.12
  const top = stacked ? s.y - 0.06 : s.y + s.h * 0.35
  return { x, z, top, hw: s.w * 0.42, hd: s.d * 0.42, cos: Math.cos(a), sin: Math.sin(a), run: 0.5 + top * 0.45 }
})

/** Height a mound holds at a point: its top inside the stone's footprint, sloping down over `run` outside it */
function moundAt(m: Mound, x: number, z: number) {
  const dx = x - m.x
  const dz = z - m.z
  const lx = dx * m.cos + dz * m.sin
  const lz = -dx * m.sin + dz * m.cos
  const out = Math.hypot(Math.max(0, Math.abs(lx) - m.hw), Math.max(0, Math.abs(lz) - m.hd))
  return m.top * (1 - smoothstep(0, m.run, out)) - 0.6 * smoothstep(0, m.run, out)
}

const smax = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.max(a, b) + h * h * k * 0.25
}

/** Ground height on land (and the sand it meets); below the sand level this is just the seabed */
export function groundHeight(x: number, z: number, d = coastShore(x, z)) {
  const sand = seabed(x, z, d)
  if (d > 0.3) return sand
  let h = -1
  for (const m of MOUNDS) {
    if (Math.abs(x - m.x) > m.hw + m.run + 2 || Math.abs(z - m.z) > m.hd + m.run + 2) continue
    h = smax(h, moundAt(m, x, z), 0.8)
  }
  if (h < 0) return sand
  // ridges and crevices: ridged noise, stronger on high ground
  const ridge = 1 - Math.abs(fbm3(x * 0.35, 2, z * 0.35, 81))
  h += (ridge * 0.42 - 0.18) * smoothstep(0.4, 2, h) + 0.08 * fbm3(x * 1.1, 3, z * 1.1, 82)
  // ease into the beach near the shore
  const shoreMix = smoothstep(-0.4, -1.6, d)
  return sand + (Math.max(h, sand) - sand) * shoreMix
}

/** Slope at a point (0 flat … 1 vertical) and the outward downhill direction */
export function groundSlope(x: number, z: number) {
  const e = 0.18
  const gx = (groundHeight(x + e, z) - groundHeight(x - e, z)) / (2 * e)
  const gz = (groundHeight(x, z + e) - groundHeight(x, z - e)) / (2 * e)
  return { slope: 1 - 1 / Math.sqrt(1 + gx * gx + gz * gz), gx, gz }
}

/** How much a point is tucked into a hollow between higher ground (0 open … 1 sheltered) */
export function shelter(x: number, z: number) {
  const h = groundHeight(x, z)
  let above = 0
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    if (groundHeight(x + Math.cos(a) * 0.9, z + Math.sin(a) * 0.9) > h + 0.25) above++
  }
  return above / 8
}

export const terrainNoise = (x: number, z: number, seed: number) => 0.5 + 0.5 * noise3(x * 0.7, 0, z * 0.7, seed)
