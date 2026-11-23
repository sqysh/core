import { BufferAttribute, BufferGeometry, Color } from 'three'
import { ASSET_BUDGETS } from '../budgets'
import { trimBelow } from '../core/meshUtils'
import { clamp01, fbm3, smoothstep } from '../core/noise'
import { ringFootprint } from '../core/placement'
import { hash3, range, rng } from '../core/random'
import { frame, Frame, roundBox, smax, smin, toLocal } from '../core/sdf'
import { simplifyToBudget } from '../core/simplify'
import { surfaceNets } from '../core/surfaceNets'
import { AssetBuild, Lod } from '../core/types'
import { graniteMaterial } from '../materials/graniteMaterial'

// A coastal granite formation, after the exposed ledges around Coolidge Point in Manchester-by-the-Sea, sculpted for
// CORE's miniature world. One continuous body of bedrock made of several masses:
//
//  · a main mass and one or two lower ones, each with its own outline of fracture planes (set at their own reach and
//    lean, so faces stand steep and angled) and its own low swell sloping toward the sea; they fuse where they meet,
//    leaving bays between them in plan and saddles between them in height
//  · sheeting splits the tops into small stepped ledges whose edges wander, treads never quite flat; the ledges are out
//    of step from one joint block to the next, and where the ice polished the rock they give way to smooth ramps
//  · two sets of joints run across the whole formation and down its faces as narrow cracks that open and close along
//    their length; each block between them sits at its own height, meeting its neighbours cleanly at the joints
//  · edges are chipped, smaller rocks lie embedded round the base, broken blocks stand in the shallows, and now and
//    then a glacial erratic sits on top
//
// Colour varies block by block through warm grays, pinks and browns; moss gathers in the cracks and sheltered corners
// (the shared granite material paints it, with the lichen and the waterline zones).
//
// Frame: x along the shore, +z toward the sea, y up; the base runs below y = 0 so the formation can be embedded. About
// 6.5 wide, 4.5 deep and 1.6 high. Modelled once per variation as a signed distance field (meshed densely with Surface
// Nets), then simplified to each level of detail's budget.

const ID = 'granite-coastal-formation'
/** Grid spacing of the dense source mesh: fine enough to hold the bevels, before simplification */
const SOURCE_CELL = 0.05
const BOUNDS = { min: [-4, -1.0, -3.2] as [number, number, number], max: [4, 2.8, 3.6] as [number, number, number] }
/** How far the formation sinks below the ground around it */
const EMBED = 0.3
/** Most the simplified surface may stray from the source, as a fraction of the formation's size */
const MAX_ERROR: Record<Lod, number> = { high: 0.004, medium: 0.008, low: 0.026 }

type Plane = { nx: number; ny: number; nz: number; o: number }
type Chip = { cx: number; cy: number; cz: number; nx: number; ny: number; nz: number; r: number }
type Rock = { f: Frame; hx: number; hy: number; hz: number; r: number; facets: Plane[]; bound: number }
type JointSet = { cos: number; sin: number; spacing: number; openness: number }

/** One mass of the formation: where it is, its reach, its height, and the fracture planes round it */
type Mass = {
  x: number
  z: number
  rx: number
  rz: number
  h: number
  sides: (Plane & { a: number; reach: number })[]
  /** Its enclosing radius in plan, to skip it cheaply far away */
  bound: number
}

type Formation = {
  ns: number
  masses: Mass[]
  step: number
  joints: { sets: JointSet[]; depth: number; width: number }
}

/** A rock: a softly rounded box with a few fracture planes taken off it */
function rock(r: () => number, x: number, y: number, z: number, hx: number, hy: number, hz: number, nFacets: number, round = 0.06): Rock {
  const facets: Plane[] = Array.from({ length: nFacets }, () => {
    const a = r() * Math.PI * 2
    const ny = r() > 0.5 ? range(r, 0.3, 0.8) : range(r, -0.2, 0.2)
    const h = Math.sqrt(1 - ny * ny)
    const nx = Math.cos(a) * h
    const nz = Math.sin(a) * h
    const reach = Math.abs(nx) * hx + Math.abs(ny) * hy + Math.abs(nz) * hz
    return { nx, ny, nz, o: reach * range(r, 0.5, 0.76) }
  })
  return {
    f: frame(x, y, z, r() * Math.PI * 2, range(r, -0.3, 0.3)),
    hx,
    hy,
    hz,
    r: Math.min(round, hx, hy, hz) * 0.9,
    facets,
    bound: Math.hypot(hx, hy, hz)
  }
}

/** A mass: an outline of fracture planes round an ellipse, each at its own reach and lean */
function mass(r: () => number, x: number, z: number, rx: number, rz: number, h: number): Mass {
  const n = 7 + Math.floor(r() * 4)
  const sides = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + range(r, -0.25, 0.25)
    const reach = (1 / Math.hypot(Math.cos(a) / rx, Math.sin(a) / rz)) * range(r, 0.82, 1.06)
    const lean = r() > 0.3 ? range(r, 0.02, 0.22) : range(r, 0.3, 0.48)
    const l = Math.hypot(1, lean)
    const nx = Math.cos(a) / l
    const ny = lean / l
    const nz = Math.sin(a) / l
    return { a, reach, nx, ny, nz, o: x * nx + z * nz + reach / l }
  })
  return { x, z, rx, rz, h, sides, bound: Math.max(rx, rz) * 1.15 }
}

/**
 * The joints in plan. Granite splits along two sets of roughly parallel joints, nearly at right angles: each set's
 * lines are irregularly spaced and wander slightly, and each crack opens and closes along its length. Returns the
 * distance to the nearest open crack; the block a point is in (its index in each set); and, per set, the block across
 * the nearest joint and how far away that joint is, so a block's properties can be blended across it.
 */
function jointsAt(f: Formation, x: number, z: number) {
  let crack = 1e9
  const index = [0, 0]
  const across = [0, 0]
  const toJoint = [1e9, 1e9]
  f.joints.sets.forEach((set, k) => {
    const wander = 0.12 * fbm3(x * 0.6, k * 5, z * 0.6, f.ns + 20 + k, 2)
    const u = x * set.cos + z * set.sin + wander
    const along = -x * set.sin + z * set.cos
    const base = Math.floor(u / set.spacing)
    let below = base
    let lo = -1e9
    let hi = 1e9
    for (let i = base - 1; i <= base + 2; i++) {
      const line = (i + (hash3(i, k, 7, f.ns) - 0.5) * 0.7) * set.spacing
      // each crack opens and closes along its length
      const open = smoothstep(-0.15, 0.2, fbm3(along * 0.55, i * 3.1, k * 7.7, f.ns + 30, 2) + set.openness)
      if (open > 0.02) crack = Math.min(crack, Math.abs(u - line) / open)
      if (line <= u && line > lo) {
        lo = line
        below = i
      }
      if (line > u && line < hi) hi = line
    }
    index[k] = below
    // the nearer of the block's two joints in this set, and the block beyond it
    if (u - lo < hi - u) {
      toJoint[k] = u - lo
      across[k] = below - 1
    } else {
      toJoint[k] = hi - u
      across[k] = below + 1
    }
  })
  return { crack, a: index[0], b: index[1], na: across[0], nb: across[1], da: toJoint[0], db: toJoint[1] }
}

const blockId = (a: number, b: number) => a * 7919 + b
/** How far either side of a joint its two blocks' properties blend, so their different heights meet cleanly */
const BLEND = 0.07

/** A per-block random value (0–1) for property `key`, blended into the neighbouring blocks' right at the joints */
function blockValue(f: Formation, j: { a: number; b: number; na: number; nb: number; da: number; db: number }, key: number) {
  const q = (a: number, b: number) => hash3(blockId(a, b), key, key, f.ns)
  let v = q(j.a, j.b)
  v += (q(j.na, j.b) - v) * 0.5 * (1 - smoothstep(0, BLEND, j.da))
  v += (q(j.a, j.nb) - v) * 0.5 * (1 - smoothstep(0, BLEND, j.db))
  return v
}

type Joints = ReturnType<typeof jointsAt>

/** A mass's top: its own low swell sloping seaward, sheeted into wandering ledges, each joint block at its own height */
function massTop(f: Formation, m: Mass, j: Joints, x: number, z: number) {
  const ux = (x - m.x) / m.rx
  const uz = (z - m.z) / m.rz
  const dome = m.h * (1 - 0.45 * ux * ux - 0.55 * uz * uz) - 0.22 * (z - m.z)
  // where the sheeting falls, wandering gently (stronger, and the ledges close into loops, which read as pits);
  // each joint block's sheets are offset from its neighbours', so the ledges don't line up across a joint
  const warp = 0.3 * fbm3(x * 0.24, 0, z * 0.24, f.ns, 2) + 0.04 * fbm3(x * 1.3, 0, z * 1.3, f.ns + 1, 2)
  const phase = blockValue(f, j, 6) * 0.95
  const t = dome / f.step + warp + phase
  const fl = Math.floor(t)
  const fr = t - fl
  // treads rise gently, then a steep riser up to the next ledge (wide enough to mesh cleanly, still reading as a step)
  const terrace = (fl + 0.22 * fr + 0.78 * smoothstep(0.7, 1, fr) - warp - phase) * f.step
  // where the ice polished the rock, no ledges: just the smooth swell
  const polish = smoothstep(0.2, 0.45, fbm3(x * 0.32, 4, z * 0.32, f.ns + 3, 2)) * 0.85
  let h = terrace + (dome - terrace) * polish
  h += (blockValue(f, j, 3) - 0.5) * 0.12
  // the seaward edge stays a proper ledge at the waterline rather than thinning to a blade
  return Math.max(h, 0.16)
}

/** A mass's solid: under its top, inside its fracture planes (meeting in soft bevels) */
function massSolid(m: Mass, top: number, x: number, y: number, z: number) {
  let side = -1e9
  for (const s of m.sides) side = smax(side, x * s.nx + y * s.ny + z * s.nz - s.o, 0.05)
  return smax((y - top) * 0.5, side, 0.05)
}

/** Everything that differs between variations, drawn from the seed */
function design(seed: number) {
  const r = rng(seed)
  const ns = Math.floor(r() * 10000)
  const a = r() * Math.PI
  const b = a + Math.PI / 2 + range(r, -0.25, 0.25)

  // the main mass, set back from the sea, and one or two lower ones beside it, reaching toward the water
  const masses: Mass[] = []
  const main = { x: range(r, -0.5, 0.5), z: range(r, -0.6, -0.1), rx: range(r, 1.9, 2.4), rz: range(r, 1.45, 1.8), h: range(r, 1.3, 1.7) }
  masses.push(mass(r, main.x, main.z, main.rx, main.rz, main.h))
  const side = r() > 0.5 ? 1 : -1
  masses.push(
    mass(r, main.x + side * range(r, 1.6, 2.2), main.z + range(r, 0.5, 1.1), range(r, 1.0, 1.4), range(r, 0.9, 1.2), main.h * range(r, 0.5, 0.72))
  )
  if (r() > 0.35)
    masses.push(
      mass(r, main.x - side * range(r, 1.5, 2.1), main.z + range(r, 0.2, 0.9), range(r, 0.9, 1.25), range(r, 0.8, 1.1), main.h * range(r, 0.45, 0.68))
    )

  const formation: Formation = {
    ns,
    masses,
    step: range(r, 0.24, 0.32),
    joints: {
      // one dominant set, long and open; the cross set wide, irregular and mostly closed
      sets: [
        { cos: Math.cos(a), sin: Math.sin(a), spacing: range(r, 1.1, 1.6), openness: range(r, 0.1, 0.3) },
        { cos: Math.cos(b), sin: Math.sin(b), spacing: range(r, 1.8, 2.6), openness: range(r, -0.22, -0.08) }
      ],
      depth: range(r, 0.04, 0.06),
      // no narrower than the source grid, or the crack's edges alias into a sawtooth
      width: 0.055
    }
  }

  // chips knocked off the upper edges of each mass (the broad treads are broken up by their own gentle slope and the
  // blocks' differing heights and tilts)
  const chips: Chip[] = []
  for (const m of masses) {
    // chips scaled to the mass they're knocked from: a small, low mass takes small chips
    const scale = Math.min(1, m.h / 1.4)
    for (let i = 0; i < Math.round((5 + r() * 4) * scale); i++) {
      const s = m.sides[Math.floor(r() * m.sides.length)]
      const dx = Math.cos(s.a)
      const dz = Math.sin(s.a)
      const u = range(r, -0.5, 0.5) * s.reach
      const px = m.x + dx * s.reach * 0.98 - dz * u
      const pz = m.z + dz * s.reach * 0.98 + dx * u
      const py = massTop(formation, m, jointsAt(formation, px - dx * 0.2, pz - dz * 0.2), px - dx * 0.2, pz - dz * 0.2)
      let nx = dx * 0.8 + range(r, -0.25, 0.25)
      let ny = range(r, 0.55, 0.9)
      let nz = dz * 0.8 + range(r, -0.25, 0.25)
      if (py < 0.45) continue
      // only edges on the formation's outside: where masses overlap, one's edge lies buried inside another, and a chip
      // there would hollow a pocket out of the rock
      const jp = jointsAt(formation, px, pz)
      if (masses.some((o) => o !== m && massSolid(o, massTop(formation, o, jp, px, pz), px, py - 0.05, pz) < 0.08)) continue
      const l = Math.hypot(nx, ny, nz)
      nx /= l
      ny /= l
      nz /= l
      const depth = range(r, 0.03, 0.07) * scale
      chips.push({ cx: px - nx * depth, cy: py - ny * depth, cz: pz - nz * depth, nx, ny, nz, r: range(r, 0.14, 0.26) * scale })
    }
  }

  // smaller rocks embedded round each mass's base, broken blocks out in the shallows, sometimes an erratic on top
  const rocks: Rock[] = []
  for (const m of masses) {
    for (let i = 0; i < 3 + Math.floor(r() * 4); i++) {
      const s = m.sides[Math.floor(r() * m.sides.length)]
      const d = s.reach + range(r, -0.12, 0.18)
      const size = range(r, 0.16, 0.34)
      rocks.push(rock(r, m.x + Math.cos(s.a) * d, range(r, 0.12, 0.3), m.z + Math.sin(s.a) * d, size * range(r, 1, 1.5), size * range(r, 0.6, 0.9), size, 3 + Math.floor(r() * 2), 0.05))
    }
  }
  for (let i = 0; i < 2 + Math.floor(r() * 3); i++) {
    const m = masses[Math.floor(r() * masses.length)]
    const ang = range(r, 0.35, Math.PI - 0.35)
    const d = 1 / Math.hypot(Math.cos(ang) / m.rx, Math.sin(ang) / m.rz) + range(r, 0.25, 0.7)
    const size = range(r, 0.22, 0.42)
    rocks.push(rock(r, m.x + Math.cos(ang) * d, range(r, 0.05, 0.2), m.z + Math.sin(ang) * d, size * range(r, 1.05, 1.4), size * range(r, 0.8, 1.0), size, 3 + Math.floor(r() * 3), 0.07))
  }
  if (r() > 0.35) {
    const ex = main.x + range(r, -0.5, 0.5)
    const ez = main.z + range(r, -0.3, 0.3)
    const size = range(r, 0.3, 0.42)
    const top = massTop(formation, masses[0], jointsAt(formation, ex, ez), ex, ez)
    rocks.push(rock(r, ex, top + size * 0.55, ez, size, size * range(r, 0.72, 0.85), size * range(r, 0.8, 1), 1, size))
  }

  return { formation, chips, rocks }
}

/** The dense source mesh for a variation, with its colour and moss mask: built once, shared by every level of detail */
const sources = new Map<number, Promise<{ geometry: BufferGeometry; ms: number }>>()

function source(seed: number) {
  let s = sources.get(seed)
  if (!s) {
    s = new Promise((resolve) => {
      const t0 = performance.now()
      resolve({ geometry: buildSource(seed), ms: performance.now() - t0 })
    })
    sources.set(seed, s)
  }
  return s
}

function buildSource(seed: number) {
  const { formation: f, chips, rocks } = design(seed)
  const local = new Float64Array(3)

  const rockDist = (k: Rock, x: number, y: number, z: number) => {
    toLocal(k.f, x, y, z, local)
    let v = roundBox(local[0], local[1], local[2], k.hx, k.hy, k.hz, k.r)
    for (const p of k.facets) v = smax(v, local[0] * p.nx + local[1] * p.ny + local[2] * p.nz - p.o, 0.04)
    return v
  }

  const full = (x: number, y: number, z: number) => {
    const j = jointsAt(f, x, z)
    // the masses, fused where they meet: bays between them in plan, saddles between them in height
    let v = 1e9
    for (const m of f.masses) {
      if (Math.hypot(x - m.x, z - m.z) - m.bound > v + 0.3) continue
      v = smin(v, massSolid(m, massTop(f, m, j, x, z), x, y, z), 0.3)
    }
    // the joints: narrow cracks through the tops and down the faces
    if (v < 0.4) v += f.joints.depth * (1 - smoothstep(0, f.joints.width, j.crack))
    // chipped edges
    for (const c of chips) {
      const dx = x - c.cx
      const dy = y - c.cy
      const dz = z - c.cz
      const ball = Math.hypot(dx, dy, dz) - c.r
      if (ball > 0.05) continue
      v = smax(v, -Math.max(-(dx * c.nx + dy * c.ny + dz * c.nz), ball), 0.025)
    }
    v = Math.max(v, -0.95 - y)
    for (const k of rocks) {
      if (Math.hypot(x - k.f.cx, y - k.f.cy, z - k.f.cz) - k.bound > v + 0.03) continue
      v = smin(v, rockDist(k, x, y, z), 0.03)
    }
    // the faintest weathering
    return v + 0.008 * fbm3(x * 1.6, y * 1.6, z * 1.6, f.ns + 2, 2)
  }

  const meshed = surfaceNets({ full, band: 0.42, coarseScale: 3 }, BOUNDS, SOURCE_CELL, true)
  const geometry = trimBelow(meshed.geometry, -EMBED - 0.25)

  // colour block by block: warm grays, pinks and browns; lighter weathered tops, cooler shade; darker in the cracks;
  // soft occlusion in every crease
  const pos = geometry.getAttribute('position')
  const nrm = geometry.getAttribute('normal')
  const colors = new Float32Array(pos.count * 3)
  const mossMask = new Float32Array(pos.count)
  const tones = [new Color('#a59b94'), new Color('#b8968a'), new Color('#9e8775'), new Color('#9c9995'), new Color('#bea392'), new Color('#ab8d84')]
  const top = new Color('#c4bab0')
  const shade = new Color('#6d6562')
  const crackDark = new Color('#4f4744')
  const c = new Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const nx = nrm.getX(i)
    const ny = nrm.getY(i)
    const nz = nrm.getZ(i)
    let occ = 0
    for (const [h, w] of [
      [0.06, 0.45],
      [0.16, 0.35],
      [0.38, 0.2]
    ]) {
      const s = full(x + nx * h, y + ny * h, z + nz * h) / 0.75
      occ += (w * (h - Math.min(h, s))) / h
    }
    const ao = clamp01(1 - occ * 1.15)
    const j = jointsAt(f, x, z)
    const nearCrack = 1 - smoothstep(0.0, 0.07, j.crack)
    // each block its own tone, drifting gently across it
    const id = blockId(j.a, j.b)
    c.copy(tones[Math.floor(hash3(id, 9, 9, f.ns) * tones.length)])
    c.lerp(tones[Math.floor(hash3(id, 8, 8, f.ns) * tones.length)], 0.25 + 0.3 * fbm3(x * 0.5, y * 0.5, z * 0.5, f.ns + 5, 2))
    c.lerp(top, smoothstep(0.4, 0.9, ny) * 0.38)
    c.lerp(shade, smoothstep(-0.05, -0.6, ny) * 0.7)
    c.lerp(crackDark, nearCrack * 0.55)
    c.multiplyScalar(0.55 + 0.45 * ao)
    colors.set([c.r, c.g, c.b], i * 3)
    // moss gathers in the cracks and the sheltered corners of the ledges, on upward faces above the spray
    const sheltered = Math.max(nearCrack, smoothstep(0.72, 0.5, ao))
    mossMask[i] = smoothstep(0.5, 0.85, ny) * sheltered * smoothstep(0.4, 0.75, y)
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.setAttribute('aCover', new BufferAttribute(mossMask, 1))
  return geometry
}

export async function buildCoastalLedge({ seed, lod }: { seed: number; lod: Lod }): Promise<AssetBuild> {
  const t0 = performance.now()
  const src = await source(seed)
  const { geometry, error } = await simplifyToBudget(src.geometry, {
    triangles: ASSET_BUDGETS[ID][lod],
    maxError: MAX_ERROR[lod],
    attributes: [
      { name: 'normal', weight: 0.5 },
      { name: 'color', weight: 0.6 },
      { name: 'aCover', weight: 0.3 }
    ]
  })
  return {
    parts: [{ geometry, material: graniteMaterial(), castShadow: true, receiveShadow: true }],
    anchor: { footprint: ringFootprint(2.5, 1.8, 12), embed: EMBED, maxTilt: 0.1 },
    size: [6.8, 2.5, 5.0],
    stats: {
      triangles: geometry.getIndex()!.count / 3,
      vertices: geometry.getAttribute('position').count,
      buildMs: Math.round(performance.now() - t0),
      sourceTriangles: src.geometry.getIndex()!.count / 3,
      error,
      notes: `source mesh ${Math.round(src.ms)} ms`
    }
  }
}
