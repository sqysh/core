import { BufferAttribute, BufferGeometry, Color, DoubleSide, Ray, Vector3 } from 'three'
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { MeshBVH } from 'three-mesh-bvh'
import { ASSET_BUDGETS } from '../budgets'
import { fbm3, smoothstep } from '../core/noise'
import { ringFootprint } from '../core/placement'
import { range, rng } from '../core/random'
import { AssetBuild, Lod } from '../core/types'
import { graniteMaterial } from '../materials/graniteMaterial'

// A sculpted coastal ledge: granite bedrock after the headlands of Manchester-by-the-Sea, built the way an environment
// artist kit-bashes rock for an isometric diorama rather than grown from a field or scattered as boxes.
//
// The grammar, taken from the reference dioramas:
//
//  · deliberate tiers: a low shelf at the water, a terrace, the high massif set back and to one side (so one side of the
//    formation is a tall continuous cliff), sometimes a knob. Each tier's plan is an irregular outline with bays and
//    promontories, and each tier's top is one flat plateau: a ground surface, not a pile of stone tops
//  · every tier's rim is a dense band of narrow, tall columns walked along the outline: each column its own height,
//    protrusion, lean and broken top, packed side by side so the cliff reads as vertical striation under a jagged lip.
//    Clefts recess, buttresses stand proud, and tall cliffs break at a horizontal sheeting ledge partway down, the
//    lower band stepping out beneath the upper
//  · every column and stone is a convex solid with true flat planes; its top edges get narrow chamfers built exactly
//    from extra hull points, never from smoothing
//  · angular rubble lies half-buried at the cliff foot and scattered across the plateaus below higher cliffs
//  · ambient occlusion is ray-traced against the finished mesh and baked into the vertex colours, so every crevice
//    between columns, every cliff foot and every notch is dark the way the references are, independent of the
//    renderer's screen-space pass
//  · colour: medium warm grey granite (Cape Ann), darker than the sand so it reads; weathered paler tops; each column
//    and face its own slight tone; moss only in the shelter of the cliffs. The shared granite material adds its
//    restrained grain, lichen and the waterline zones
//
// One merged mesh, one draw call. Frame: x along the shore, +z toward the sea, y up. About 7 wide, 5 deep, 2 high.

const ID = 'granite-sculpted-ledge'
const EMBED = 0.22
/** Columns and rubble run down to here, well under the ground they're embedded in */
const BASE_Y = -0.6

type Notch = { a: number; w: number; d: number }
type Tier = { x: number; z: number; rx: number; rz: number; turn: number; top: number; seed: number; notches: Notch[]; dip: number }

/** The tier's outline radius at a tier-local angle: an ellipse, wandering, with its bays cut in */
function radiusAt(t: Tier, a: number) {
  let r = 1 / Math.hypot(Math.cos(a) / t.rx, Math.sin(a) / t.rz)
  r *= 1 + 0.16 * fbm3(Math.cos(a) * 1.6 + 7.1, Math.sin(a) * 1.6, t.seed * 0.013, t.seed, 3)
  for (const n of t.notches) {
    const d = Math.abs((((a - n.a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI)
    if (d < n.w) r *= 1 - n.d * Math.cos((d / n.w) * (Math.PI / 2)) ** 2
  }
  return r
}

function toLocal(t: Tier, x: number, z: number): [number, number] {
  const dx = x - t.x
  const dz = z - t.z
  const c = Math.cos(-t.turn)
  const s = Math.sin(-t.turn)
  return [dx * c - dz * s, dx * s + dz * c]
}

/** How far inside the tier's outline a point is (positive inside, negative outside), roughly in world units */
function insideBy(t: Tier, x: number, z: number) {
  const [lx, lz] = toLocal(t, x, z)
  return radiusAt(t, Math.atan2(lz, lx)) - Math.hypot(lx, lz)
}

function rimPoint(t: Tier, a: number): [number, number] {
  const r = radiusAt(t, a)
  const lx = Math.cos(a) * r
  const lz = Math.sin(a) * r
  const c = Math.cos(t.turn)
  const s = Math.sin(t.turn)
  return [t.x + lx * c - lz * s, t.z + lx * s + lz * c]
}

/** The rim as a closed polyline with arc lengths, and outward normals */
function rimPolyline(t: Tier, n = 720) {
  const pts: [number, number][] = []
  const s: number[] = [0]
  for (let i = 0; i < n; i++) pts.push(rimPoint(t, (i / n) * Math.PI * 2))
  for (let i = 1; i <= n; i++) {
    const a = pts[i - 1]
    const b = pts[i % n]
    s.push(s[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]))
  }
  const total = s[n]
  /** Point and outward normal at arc length `d` */
  const at = (d: number) => {
    d = ((d % total) + total) % total
    let lo = 0
    let hi = n
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (s[mid] <= d) lo = mid
      else hi = mid
    }
    const k = (d - s[lo]) / Math.max(1e-9, s[hi] - s[lo])
    const a = pts[lo]
    const b = pts[hi % n]
    const x = a[0] + (b[0] - a[0]) * k
    const z = a[1] + (b[1] - a[1]) * k
    const tx = b[0] - a[0]
    const tz = b[1] - a[1]
    const tl = Math.hypot(tx, tz) || 1
    // outward: perpendicular to the tangent, away from the centre
    let nx = tz / tl
    let nz = -tx / tl
    if ((x - t.x) * nx + (z - t.z) * nz < 0) {
      nx = -nx
      nz = -nz
    }
    return { x, z, nx, nz, tx: tx / tl, tz: tz / tl }
  }
  return { total, at }
}

type Piece = { geometry: BufferGeometry; tone: Color; topLift: number; cover: number; kind: 'column' | 'cap' | 'rubble' }

/** What each level of detail spends: column widths, how the top corners are chamfered, the smallest rubble, cap grid */
const DETAIL: Record<Lod, { width: [number, number]; chamfer: 0 | 1 | 3; bevel: number; minRubble: number; grid: number; bands: boolean }> = {
  high: { width: [0.14, 0.3], chamfer: 3, bevel: 0.024, minRubble: 0, grid: 0.18, bands: true },
  medium: { width: [0.22, 0.44], chamfer: 1, bevel: 0.024, minRubble: 0.08, grid: 0.28, bands: true },
  low: { width: [0.42, 0.75], chamfer: 0, bevel: 0, minRubble: 0.14, grid: 0.45, bands: false }
}

const TONES = ['#8f8b87', '#9a8d8a', '#918982', '#868687', '#9e948c', '#857e7a', '#a39b94', '#7f7b78'].map((h) => new Color(h))

/** The plan for a variation */
function plan(seed: number) {
  const r = rng(seed)
  const side = r() > 0.5 ? 1 : -1
  const notches = (count: number, depth: [number, number]): Notch[] =>
    Array.from({ length: count }, () => ({ a: r() * Math.PI * 2, w: range(r, 0.35, 0.7), d: range(r, depth[0], depth[1]) }))
  const tiers: Tier[] = [
    { x: range(r, -0.3, 0.3), z: range(r, 0.35, 0.65), rx: range(r, 2.8, 3.2), rz: range(r, 1.85, 2.15), turn: range(r, -0.2, 0.2), top: range(r, 0.58, 0.7), seed: seed * 7 + 1, notches: notches(3, [0.14, 0.32]), dip: 0.05 },
    { x: range(r, -0.6, 0.6), z: range(r, -0.4, 0.0), rx: range(r, 2.1, 2.5), rz: range(r, 1.25, 1.55), turn: range(r, -0.45, 0.45), top: range(r, 1.08, 1.24), seed: seed * 7 + 2, notches: notches(2, [0.16, 0.34]), dip: 0.025 },
    { x: side * range(r, 0.5, 1.2), z: range(r, -1.35, -0.85), rx: range(r, 1.55, 1.95), rz: range(r, 0.8, 1.0), turn: range(r, -0.35, 0.35), top: range(r, 1.78, 2.05), seed: seed * 7 + 3, notches: notches(2, [0.12, 0.3]), dip: 0.015 }
  ]
  if (r() > 0.4)
    tiers.push({ x: -side * range(r, 1.3, 1.9), z: range(r, -0.7, -0.2), rx: range(r, 0.7, 1.0), rz: range(r, 0.55, 0.8), turn: range(r, -0.5, 0.5), top: range(r, 1.4, 1.6), seed: seed * 7 + 4, notches: notches(1, [0.1, 0.2]), dip: 0.015 })
  return { tiers, r, ns: Math.floor(r() * 10000) }
}

/** The ground a column standing at (x, z) rises from: the top of the highest lower tier it's over, else the buried base */
function groundUnder(tiers: Tier[], tier: Tier, x: number, z: number) {
  let g = BASE_Y
  for (const u of tiers) if (u.top < tier.top && insideBy(u, x, z) > -0.02) g = Math.max(g, u.top - 0.14)
  return g
}

/** A convex stone from points, flat-shaded, with its own tone */
function hull(points: Vector3[], tone: Color, topLift: number, cover: number, kind: Piece['kind']): Piece {
  const g = new ConvexGeometry(points)
  g.deleteAttribute('uv')
  return { geometry: g, tone, topLift, cover, kind }
}

export async function buildSculptedLedge({ seed, lod }: { seed: number; lod: Lod }): Promise<AssetBuild> {
  const t0 = performance.now()
  const { tiers, r, ns } = plan(seed)
  const D = DETAIL[lod]
  const pieces: Piece[] = []
  let columns = 0

  // ── the cliffs: a band of columns round every tier's rim ──
  for (const tier of tiers) {
    const rim = rimPolyline(tier)
    const phase = r() * 100
    let s = 0
    while (s < rim.total - 0.02) {
      let w = range(r, D.width[0], D.width[1])
      if (rim.total - s < w * 1.5) w = rim.total - s
      const a = rim.at(s)
      const b = rim.at(s + w)
      const m = rim.at(s + w / 2)
      // skip the run of rim buried inside a higher tier
      if (tiers.some((u) => u.top > tier.top && insideBy(u, m.x + m.nx * 0.15, m.z + m.nz * 0.15) > 0.1)) {
        s += w
        continue
      }
      // protrusion: the cliff bulging and recessing along its length, each column a little in or out of its neighbours,
      // now and then a buttress or a cleft
      const roll = r()
      const out =
        0.09 * fbm3(s * 0.7 + phase, tier.top * 3, 0, ns, 2) +
        range(r, -0.04, 0.05) +
        (roll < 0.1 ? range(r, 0.1, 0.18) : roll < 0.18 ? -range(r, 0.06, 0.1) : 0)
      const cleft = roll >= 0.1 && roll < 0.18
      const depth = 0.55 + w * 0.5
      const outer0 = [a.x + a.nx * out, a.z + a.nz * out] as const
      const outer1 = [b.x + b.nx * out, b.z + b.nz * out] as const
      const inner0 = [a.x - a.nx * depth, a.z - a.nz * depth] as const
      const inner1 = [b.x - b.nx * depth, b.z - b.nz * depth] as const
      const base = Math.min(groundUnder(tiers, tier, outer0[0], outer0[1]), groundUnder(tiers, tier, outer1[0], outer1[1]))
      // the top: inner corners flush with (or a touch above) the plateau, outer corners dropped a little and unevenly
      // so the lip is broken; clefts and a few others step well down
      const topY = tier.top - tier.dip * Math.max(0, m.z - tier.z)
      // what shows of this column above the ground it stands on (the sand sits near y = 0.22 once embedded)
      const visible = topY - Math.max(base, 0.22)
      const big = visible > 0.6 && r() < 0.12
      const dropA = Math.min(visible * 0.4, range(r, 0.01, 0.07) + (cleft ? range(r, 0.06, 0.16) : big ? range(r, 0.12, 0.32) : 0))
      const dropB = Math.max(0.005, Math.min(visible * 0.4, dropA + range(r, -0.04, 0.04)))
      const lean = range(r, -0.035, 0.03)
      const slide = range(r, -0.015, 0.015)
      const height = topY - base
      // tall cliffs break at sheeting ledges, each lower band stepping out beneath the one above
      const bands = D.bands ? (height > 1.5 ? 3 : height > 0.85 ? 2 : 1) : 1
      const breaks: number[] = [base]
      for (let k = 1; k < bands; k++) {
        const f = k / bands + 0.06 * fbm3(s * 0.5 + 3, k * 2.3 + tier.top, phase, ns + 9, 2) + range(r, -0.02, 0.02)
        breaks.push(base + height * f)
      }
      breaks.push(topY)
      for (let k = 0; k < bands; k++) {
        const step = (bands - 1 - k) * range(r, 0.1, 0.16)
        const y0 = breaks[k] - 0.03
        const y1 = breaks[k + 1]
        const last = k === bands - 1
        const o0 = [outer0[0] + a.nx * step, outer0[1] + a.nz * step]
        const o1 = [outer1[0] + b.nx * step, outer1[1] + b.nz * step]
        const pts: Vector3[] = [
          new Vector3(inner0[0], y0, inner0[1]),
          new Vector3(inner1[0], y0, inner1[1]),
          new Vector3(o0[0], y0, o0[1]),
          new Vector3(o1[0], y0, o1[1])
        ]
        const tA = last ? y1 - dropA : y1 - range(r, 0, 0.04)
        const tB = last ? y1 - dropB : y1 - range(r, 0, 0.04)
        const tIn = last ? y1 - 0.012 : y1 - range(r, 0, 0.02)
        pts.push(new Vector3(inner0[0], tIn, inner0[1]), new Vector3(inner1[0], tIn, inner1[1]))
        const topOuter: [number, number, number, number, number][] = [
          [o0[0] + a.nx * lean + a.tx * slide, tA, o0[1] + a.nz * lean + a.tz * slide, a.nx, a.nz],
          [o1[0] + b.nx * lean + b.tx * slide, tB, o1[1] + b.nz * lean + b.tz * slide, b.nx, b.nz]
        ]
        topOuter.forEach(([x, y, z, nx, nz], i) => {
          if (D.chamfer === 0) return pts.push(new Vector3(x, y, z))
          const bv = D.bevel
          // the chamfer: the corner cut back along the edges that meet there (down, inward, and along the lip)
          pts.push(new Vector3(x, y - bv, z), new Vector3(x - nx * bv, y, z - nz * bv))
          if (D.chamfer === 3) {
            const dir = i === 0 ? 1 : -1
            pts.push(new Vector3(x + a.tx * bv * dir, y, z + a.tz * bv * dir))
          } else pts.push(new Vector3(x, y, z))
        })
        const tone = TONES[Math.floor(r() * TONES.length)].clone().multiplyScalar(range(r, 0.86, 1.14))
        pieces.push(hull(pts, tone, last ? 1 : 0.6, 0, 'column'))
        columns++
      }
      s += w
    }
  }

  // ── the plateaus: a flat cap over each tier, its edge an exact strip along the rim (so the lip is clean) and its
  //    interior a grid (so baked occlusion can shade it finely at the foot of the cliffs above) ──
  for (const tier of tiers) {
    const g = D.grid
    const pos: number[] = []
    const nrm: number[] = []
    const buried = (x: number, z: number) => tiers.some((u) => u.top > tier.top && insideBy(u, x, z) > 0.5)
    const yAt = (x: number, z: number) => tier.top - tier.dip * Math.max(0, z - tier.z)
    const put = (p: [number, number], q: [number, number], o: [number, number]) => {
      pos.push(p[0], yAt(...p), p[1], o[0], yAt(...o), o[1], q[0], yAt(...q), q[1])
      nrm.push(0, 1, 0, 0, 1, 0, 0, 1, 0)
    }
    // the ring: from just inside the rim to where the grid takes over
    const rim = rimPolyline(tier)
    const segs = Math.max(48, Math.round(rim.total / (g * 0.6)))
    const OUT = 0.13
    const IN = 0.5
    const ringAt = (i: number, off: number): [number, number] => {
      const p = rim.at((i / segs) * rim.total)
      return [p.x - p.nx * off, p.z - p.nz * off]
    }
    for (let i = 0; i < segs; i++) {
      const o0 = ringAt(i, OUT)
      const o1 = ringAt(i + 1, OUT)
      const i0 = ringAt(i, IN)
      const i1 = ringAt(i + 1, IN)
      if (buried(o0[0], o0[1]) && buried(o1[0], o1[1])) continue
      put(o0, o1, i1)
      put(o0, i1, i0)
    }
    // the interior
    const inside = (x: number, z: number) => insideBy(tier, x, z) > IN - g * 0.35 && !buried(x, z)
    const span = Math.max(tier.rx, tier.rz) * 1.3
    for (let z = tier.z - span; z < tier.z + span; z += g)
      for (let x = tier.x - span; x < tier.x + span; x += g) {
        const quad: [number, number][] = [
          [x, z],
          [x + g, z],
          [x + g, z + g],
          [x, z + g]
        ]
        const tri = (i: number, j: number, k: number) => {
          const [p, q, o] = [quad[i], quad[j], quad[k]]
          if (!inside(...p) || !inside(...q) || !inside(...o)) return
          put(p, q, o)
        }
        tri(0, 1, 2)
        tri(0, 2, 3)
      }
    if (!pos.length) continue
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(nrm), 3))
    pieces.push({ geometry, tone: new Color('#b3aa9e'), topLift: 1, cover: 1, kind: 'cap' })
  }

  // ── rubble: angular stones half-buried at the cliff foot, and lying on the plateaus below higher cliffs ──
  const stone = (x: number, z: number, y: number, size: number, cover: number, flat = 1) => {
    const yaw = r() * Math.PI
    const c = Math.cos(yaw)
    const sn = Math.sin(yaw)
    const hx = size * range(r, 1.0, 1.5)
    const hz = size * range(r, 0.7, 1.0)
    const hy = size * range(r, 0.7, 1.0) * flat
    const pts: Vector3[] = []
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const lx = sx * range(r, 0.55, 0.95) * hx
      const lz = sz * range(r, 0.55, 0.95) * hz
      pts.push(new Vector3(x + lx * c - lz * sn, y + sy * range(r, 0.6, 1) * hy, z + lx * sn + lz * c))
    }
    for (let i = 0; i < 5; i++) {
      const p = [range(r, -1, 1), range(r, -1, 1), range(r, -1, 1)]
      const ax = [Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2])]
      const k = ax[0] > ax[1] ? (ax[0] > ax[2] ? 0 : 2) : ax[1] > ax[2] ? 1 : 2
      p[k] = Math.sign(p[k]) || 1
      const lx = p[0] * hx
      const lz = p[2] * hz
      pts.push(new Vector3(x + lx * c - lz * sn, y + p[1] * hy, z + lx * sn + lz * c))
    }
    pieces.push(hull(pts, TONES[Math.floor(r() * TONES.length)].clone().multiplyScalar(range(r, 0.9, 1.05)), 0.9, cover, 'rubble'))
  }
  const shelf = tiers[0]
  for (let i = 0; i < 40; i++) {
    const a = r() < 0.6 ? range(r, 0.15, Math.PI - 0.15) : r() * Math.PI * 2
    const size = range(r, 0.07, 0.26)
    if (size < D.minRubble) continue
    const [px, pz] = rimPoint(shelf, a)
    const nx = px - shelf.x
    const nz = pz - shelf.z
    const nl = Math.hypot(nx, nz) || 1
    const d = range(r, 0.06, 0.5)
    const sx = px + (nx / nl) * d
    const sz = pz + (nz / nl) * d
    // half-buried in the sand landward (the sand sits near +0.22 here), half-sunk in the shallows seaward
    const ground = sz > 1.5 ? -0.08 : 0.22
    stone(sx, sz, ground - size * 0.3, size, 0)
  }
  for (const tier of tiers) {
    const higher = tiers.filter((u) => u.top > tier.top)
    for (let i = 0; i < 22; i++) {
      // talus: flat-lying pieces, denser under the cliffs above; now and then a broken slab
      const slab = r() < 0.2
      const size = slab ? range(r, 0.2, 0.36) : range(r, 0.06, 0.17)
      if (size < D.minRubble) continue
      const a = r() * Math.PI * 2
      const rad = Math.sqrt(r())
      const [ex, ez] = rimPoint(tier, a)
      const x = tier.x + (ex - tier.x) * rad * 0.84
      const z = tier.z + (ez - tier.z) * rad * 0.84
      if (higher.some((u) => insideBy(u, x, z) > -0.3)) continue
      const nearCliff = higher.some((u) => insideBy(u, x, z) > -1.0)
      if (!nearCliff && r() < 0.45) continue
      const flat = slab ? range(r, 0.16, 0.26) : range(r, 0.4, 0.65)
      stone(x, z, tier.top + size * flat * 0.5, size, 0, flat)
    }
  }

  // ── one mesh, flat shaded, with its tones ──
  const geometry = mergeGeometries(pieces.map((p) => p.geometry))
  const pos = geometry.getAttribute('position')
  const nrm = geometry.getAttribute('normal')
  const count = pos.count
  const colors = new Float32Array(count * 3)
  const cover = new Float32Array(count)
  const weathered = new Color('#b7b0a6')
  const under = new Color('#5e5956')
  const c = new Color()
  let v = 0
  for (const p of pieces) {
    const n = p.geometry.getAttribute('position').count
    const faceJitter = new Map<number, number>()
    for (let i = 0; i < n; i++, v++) {
      const ny = nrm.getY(v)
      const y = pos.getY(v)
      const x = pos.getX(v)
      const z = pos.getZ(v)
      // every face its own slight tone (vertices come in threes per face)
      const face = Math.floor(i / 3)
      let j = faceJitter.get(face)
      if (j === undefined) faceJitter.set(face, (j = range(r, 0.94, 1.06)))
      c.copy(p.tone)
      if (p.kind === 'cap') {
        c.multiplyScalar(0.95 + 0.1 * fbm3(x * 0.9, 2, z * 0.9, ns + 4, 2))
        cover[v] = smoothstep(0.2, 0.45, fbm3(x * 1.4, 5, z * 1.4, ns + 6, 2)) * 0.9
      } else {
        c.lerp(weathered, smoothstep(0.5, 0.95, ny) * 0.55 * p.topLift).lerp(under, smoothstep(-0.1, -0.7, ny) * 0.6)
        // the foot of a cliff is a touch darker where it meets the ground
        c.multiplyScalar(j * (0.82 + 0.18 * smoothstep(0.1, 0.7, y)))
      }
      colors.set([c.r, c.g, c.b], v * 3)
    }
  }

  // ── ambient occlusion, ray-traced against the whole formation and baked into the colours ──
  const bvh = new MeshBVH(geometry)
  const RAYS = lod === 'low' ? 8 : 14
  const MAXD = 1.6
  const dirs: Vector3[] = []
  for (let i = 0; i < RAYS; i++) {
    // cosine-weighted hemisphere, in a spiral so a few rays still cover it evenly
    const u = (i + 0.5) / RAYS
    const phi = i * 2.399963
    const rr = Math.sqrt(u)
    dirs.push(new Vector3(Math.cos(phi) * rr, Math.sqrt(1 - u), Math.sin(phi) * rr))
  }
  const ao = new Float32Array(count)
  const seen = new Map<string, number>()
  const ray = new Ray()
  const n = new Vector3()
  const t = new Vector3()
  const b = new Vector3()
  const d = new Vector3()
  for (let i = 0; i < count; i++) {
    const key = `${Math.round(pos.getX(i) * 150)},${Math.round(pos.getY(i) * 150)},${Math.round(pos.getZ(i) * 150)},${Math.round(nrm.getX(i) * 3)},${Math.round(nrm.getY(i) * 3)},${Math.round(nrm.getZ(i) * 3)}`
    const hit = seen.get(key)
    if (hit !== undefined) {
      ao[i] = hit
      continue
    }
    n.set(nrm.getX(i), nrm.getY(i), nrm.getZ(i)).normalize()
    t.set(Math.abs(n.y) < 0.9 ? 0 : 1, Math.abs(n.y) < 0.9 ? 1 : 0, 0).cross(n).normalize()
    b.crossVectors(n, t)
    ray.origin.set(pos.getX(i), pos.getY(i), pos.getZ(i)).addScaledVector(n, 0.012)
    let occ = 0
    for (const dir of dirs) {
      d.set(0, 0, 0).addScaledVector(t, dir.x).addScaledVector(n, dir.y).addScaledVector(b, dir.z)
      ray.direction.copy(d)
      const h = bvh.raycastFirst(ray, DoubleSide, 0, MAXD)
      if (h) occ += 1 - h.distance / MAXD
    }
    const value = 1 - occ / RAYS
    seen.set(key, value)
    ao[i] = value
  }
  // deep in the crevices the stone goes dark; open faces keep their colour
  for (let i = 0; i < count; i++) {
    const k = 0.28 + 0.72 * Math.pow(ao[i], 1.3)
    colors[i * 3] *= k
    colors[i * 3 + 1] *= k
    colors[i * 3 + 2] *= k
    // moss keeps to the sheltered ground: where the plateau is occluded by a cliff above it
    cover[i] *= smoothstep(0.97, 0.7, ao[i])
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.setAttribute('aCover', new BufferAttribute(cover, 1))
  geometry.computeBoundingSphere()

  return {
    parts: [{ geometry, material: graniteMaterial(), castShadow: true, receiveShadow: true }],
    anchor: { footprint: ringFootprint(2.7, 1.9, 12), embed: EMBED, maxTilt: 0.06 },
    size: [7.2, 2.3, 5.2],
    stats: {
      triangles: count / 3,
      vertices: count,
      buildMs: Math.round(performance.now() - t0),
      notes: `${columns} columns · ${pieces.length} pieces · AO ${RAYS} rays · budget ${ASSET_BUDGETS[ID][lod].toLocaleString()}`
    }
  }
}
