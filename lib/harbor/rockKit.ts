import { BufferGeometry, Color } from 'three'
import { rockSlab } from '../lighthouse/geometry'
import { fbm3, noise3, rng, smoothstep } from '../lighthouse/noise'

// Sculpted sandstone, grown from the diorama's own slab: the same chiselled faces, strata and warm colours, then
// each piece is given its own character with seeded deformation — a lean, a shear so its layers run off-level,
// a taper that varies round the stone, an angled top, a lumpy outline — and grass that takes hold only where the
// top is flat enough and the seed says so. No two come out alike, but they all belong to the same quarry.

type SculptOpts = {
  w: number
  d: number
  h: number
  seed: number
  /** How much character: 0 keeps the diorama slab, 1 is a wild outcrop */
  wild?: number
  /** Share of the top that greens over (0 bare rock … 1 full lawn); grass creeps in from the lee side */
  grass?: number
}

const GRASS_LO = new Color('#6b9444')
const GRASS_HI = new Color('#93b655')
const GRASS_DRY = new Color('#a8a85a')

export function sculptSlab({ w, d, h, seed, wild = 0.6, grass = 0 }: SculptOpts): BufferGeometry {
  const r = rng(seed * 7 + 3)
  const geo = rockSlab({ w, d, h, seed, bevel: Math.min(0.16, 0.05 + h * 0.05) })
  const pos = geo.getAttribute('position')
  // this stone's own habits
  const shearX = (r() - 0.5) * 0.22 * wild
  const shearZ = (r() - 0.5) * 0.22 * wild
  const taper = 0.04 + r() * 0.2 * wild
  const taperDir = r() * Math.PI * 2
  const tiltX = (r() - 0.5) * 0.14 * wild
  const tiltZ = (r() - 0.5) * 0.14 * wild
  const lump = 0.05 + 0.1 * wild
  const ledge = r() * h * 0.6 + h * 0.2 // a height at which one side steps in
  const ledgeSide = r() * Math.PI * 2
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i)
    let y = pos.getY(i)
    let z = pos.getZ(i)
    const t = Math.min(1, Math.max(0, y / h))
    // taper more on one side than the other, so the silhouette is asymmetric
    const a = Math.atan2(z, x)
    const k = 1 - taper * t * (0.6 + 0.4 * Math.cos(a - taperDir))
    x *= k
    z *= k
    // a step in the face partway up, on one side
    const facing = Math.max(0, Math.cos(a - ledgeSide))
    const step = smoothstep(ledge - 0.08, ledge + 0.08, y) * facing * 0.1 * wild * Math.min(w, d)
    x -= Math.cos(a) * step
    z -= Math.sin(a) * step
    // layers run off-level
    x += y * shearX
    z += y * shearZ
    // the top leans
    if (y > h * 0.85) y += x * tiltX + z * tiltZ
    // lumps and nicks along the edges
    const n = fbm3(x * 2.2 + seed, y * 2.2, z * 2.2, seed + 11)
    x += n * lump * Math.sign(x)
    z += n * lump * Math.sign(z)
    y += noise3(x * 3, y * 3, z * 3, seed + 5) * 0.02
    pos.setXYZ(i, x, y, z)
  }
  geo.computeVertexNormals()

  if (grass > 0) {
    const nrm = geo.getAttribute('normal')
    const col = geo.getAttribute('color')
    const c = new Color()
    const leeDir = r() * Math.PI * 2
    const lx = Math.cos(leeDir)
    const lz = Math.sin(leeDir)
    const span = Math.max(w, d) * 0.5
    for (let i = 0; i < pos.count; i++) {
      const up = smoothstep(0.6, 0.9, nrm.getY(i))
      if (up <= 0) continue
      const x = pos.getX(i)
      const z = pos.getZ(i)
      // grass spreads from the lee side across the top as `grass` grows, with a ragged, noisy edge
      const across = 0.5 + (x * lx + z * lz) / (2 * span)
      const edge = 0.5 + 0.5 * fbm3(x * 1.4, 0, z * 1.4, seed + 21)
      const cover = smoothstep(grass - 0.25, grass + 0.1, 1 - across * 0.7 - edge * 0.5) * up
      if (cover <= 0) continue
      const tone = 0.5 + 0.5 * noise3(x * 1.6, 0, z * 1.6, seed)
      c.copy(GRASS_LO).lerp(GRASS_HI, tone).lerp(GRASS_DRY, smoothstep(0.6, 1, across) * 0.35)
      c.lerp(new Color(col.getX(i), col.getY(i), col.getZ(i)), 1 - cover)
      col.setXYZ(i, c.r, c.g, c.b)
    }
    col.needsUpdate = true
  }
  return geo
}

/** A seeded nudge for a stacked stone, so it sits off-centre and a little askew on the one below */
export function settle(seed: number, size: number) {
  const r = rng(seed * 13 + 1)
  const a = r() * Math.PI * 2
  const off = size * (0.08 + r() * 0.12)
  return {
    dx: Math.cos(a) * off,
    dz: Math.sin(a) * off,
    rx: (r() - 0.5) * 0.07,
    rz: (r() - 0.5) * 0.07,
    ry: (r() - 0.5) * 0.5
  }
}

