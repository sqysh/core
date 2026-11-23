import { BufferAttribute, Color, Euler, Matrix4, Vector3 } from 'three'
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ASSET_BUDGETS } from '../budgets'
import { fbm3, smoothstep } from '../core/noise'
import { ringFootprint } from '../core/placement'
import { range, rng } from '../core/random'
import { AssetBuild, Lod } from '../core/types'
import { graniteMaterial } from '../materials/graniteMaterial'

// A faceted granite outcrop, modelled the way a game artist builds rock for an isometric diorama, not sculpted as a
// smooth volume: assembled from explicit polygonal rock chunks, after the granite coastline of Manchester-by-the-Sea.
//
//  · every chunk is a cut stone: the convex hull of points scattered over an oriented box, so it has half a dozen or
//    more genuinely different flat fracture faces. Its edges get narrow chamfers, made exactly by swapping each corner
//    for a tiny octahedron of points before taking the hull (a Minkowski sum): no smoothing anywhere
//  · the outcrop is composed in deliberate tiers (a high massif, a middle terrace, a low shelf at the water). Big
//    plateau chunks fill each tier, their tops snapped to one plane so the tier reads as a broad connected table with
//    only slight steps between stones; along each tier's rim, taller cliff chunks of differing size and lean are packed
//    together, so the cliff faces are a patchwork of vertical, diagonal and leaning planes
//  · angular fragments lie half-buried round the base, more on the seaward side
//  · shading is flat, face by face; colour varies stone to stone through warm grays, pinks and browns, lighter on top
//    faces; the shared granite material adds its restrained grain, moss on chosen tops, lichen and the waterline zones
//
// Frame: x along the shore, +z toward the sea, y up; chunks go down below y = 0 so the outcrop can be embedded. About
// 6.5 wide, 4.5 deep and 1.9 high. All one mesh, one draw call. Level of detail sets how finely edges are bevelled and
// whether the smallest fragments are kept.

const ID = 'granite-faceted-outcrop'
/** How far the outcrop sinks below the ground around it */
const EMBED = 0.25
const BASE_Y = -0.45

const OCTAHEDRON = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1]
]
/** The bevel at each level of detail: its width, the directions a corner is pushed out in to chamfer it, and the
 *  smallest fragment kept */
const BEVEL: Record<Lod, { width: number; dirs: number[][]; minFragment: number }> = {
  // every edge chamfered
  high: { width: 0.03, dirs: OCTAHEDRON, minFragment: 0 },
  // the horizontal edges chamfered (the rims that catch the light), the rest left crisp
  medium: { width: 0.026, dirs: [[0, 1, 0], [0, -1, 0]], minFragment: 0.12 },
  low: { width: 0, dirs: [], minFragment: 0.18 }
}

/** A stone: an oriented box its points are scattered over, from its base up to its top */
type Stone = {
  x: number
  z: number
  base: number
  top: number
  /** Half its footprint, along and across its turn */
  hx: number
  hz: number
  yaw: number
  /** Lean: tipped about its own x and z axes */
  pitch: number
  roll: number
  /** Points snapped to the top plane (a plateau stone), or left free (a cliff stone or fragment) */
  flatTop: boolean
  /** How many points to scatter: more is more facets */
  points: number
  seed: number
  tone: number
  moss: boolean
  size: number
}

type Mass = { x: number; z: number; rx: number; rz: number; top: number }

/** The plan of the outcrop for a variation, and every stone in it */
function layout(seed: number) {
  const r = rng(seed)
  const ns = Math.floor(r() * 10000)
  const grain = r() * Math.PI

  // the tiers: a broad low shelf at the water, a middle terrace, the high massif set back, sometimes a second knob
  const side = r() > 0.5 ? 1 : -1
  const masses: Mass[] = [
    { x: range(r, -0.3, 0.3), z: range(r, 0.35, 0.7), rx: range(r, 2.6, 3.0), rz: range(r, 1.7, 2.0), top: range(r, 0.36, 0.48) },
    { x: range(r, -0.6, 0.6), z: range(r, -0.3, 0.05), rx: range(r, 1.9, 2.4), rz: range(r, 1.25, 1.55), top: range(r, 0.92, 1.1) },
    { x: side * range(r, 0.2, 0.9), z: range(r, -1.0, -0.6), rx: range(r, 1.15, 1.5), rz: range(r, 0.8, 1.05), top: range(r, 1.6, 1.85) }
  ]
  if (r() > 0.4)
    masses.push({ x: -side * range(r, 1.2, 1.8), z: range(r, -0.6, -0.1), rx: range(r, 0.65, 0.95), rz: range(r, 0.55, 0.8), top: range(r, 1.25, 1.45) })

  /** How far inside a mass a point is (1 at its centre, 0 at its rim, below 0 outside), its rim wandering a little */
  const inside = (m: Mass, x: number, z: number) =>
    1 - (Math.hypot((x - m.x) / m.rx, (z - m.z) / m.rz) + 0.1 * fbm3(x * 0.8, m.top * 3, z * 0.8, ns, 2))
  /** The tier height at a point: the highest mass it's inside, or -1 */
  const tierAt = (x: number, z: number) => {
    let h = -1
    for (const m of masses) if (inside(m, x, z) > 0) h = Math.max(h, m.top)
    return h
  }

  const stones: Stone[] = []
  let n = 0
  const stone = (s: Omit<Stone, 'seed' | 'tone'>) => stones.push({ ...s, seed: ns + n++, tone: r() })

  // plateau stones: big, overlapping, their tops at the tier's height with only slight steps between them
  const lowest = Math.min(...masses.map((o) => o.top))
  for (const m of [...masses].sort((a, b) => a.top - b.top)) {
    const step = 0.8
    // the low shelf's stones keep well inside its rim, so none reaches out as a thin plate into the water
    const keepIn = m.top === lowest ? 0.24 : 0.08
    for (let gz = -m.rz; gz <= m.rz; gz += step * 0.85)
      for (let gx = -m.rx; gx <= m.rx; gx += step) {
        const x = m.x + gx + range(r, -0.25, 0.25) * step
        const z = m.z + gz + range(r, -0.25, 0.25) * step
        const k = inside(m, x, z)
        if (k < keepIn || tierAt(x, z) > m.top + 0.01) continue
        const half = range(r, 0.5, 0.72)
        stone({
          x,
          z,
          base: BASE_Y,
          top: m.top - 0.05 * z + range(r, -0.015, 0.02),
          hx: half * range(r, 1.05, 1.4),
          hz: half,
          yaw: grain + range(r, -0.3, 0.3),
          pitch: range(r, -0.03, 0.03),
          roll: range(r, -0.03, 0.03),
          flatTop: true,
          points: 10,
          moss: m.top > 0.8 && k > 0.35 && r() < 0.14,
          size: half
        })
      }
  }

  // cliff stones round each tier's rim: taller and narrower, packed close, each leaning its own way, so the face is a
  // patchwork of vertical, diagonal and leaning planes
  for (const m of masses) {
    const below = masses.filter((o) => o.top < m.top).reduce((h, o) => Math.max(h, o.top), 0)
    const circumference = Math.PI * (m.rx + m.rz)
    const count = Math.round(circumference / 0.34)
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + range(r, -0.04, 0.04)
      // the rim, where this tier stops (step outward until it does)
      let t = 0.75
      while (t < 1.3 && inside(m, m.x + Math.cos(a) * m.rx * t, m.z + Math.sin(a) * m.rz * t) > 0) t += 0.03
      const x = m.x + Math.cos(a) * m.rx * (t - range(r, 0.02, 0.1))
      const z = m.z + Math.sin(a) * m.rz * (t - range(r, 0.02, 0.1))
      // a rim that runs into a higher tier is buried in it: skip it
      if (tierAt(x + Math.cos(a) * 0.3, z + Math.sin(a) * 0.3) > m.top) continue
      const drop = m.top - below
      const half = range(r, 0.16, 0.3)
      stone({
        x,
        z,
        base: BASE_Y,
        top: m.top - 0.05 * z - (r() < 0.7 ? range(r, 0, 0.06) : range(r, 0.1, Math.min(0.35, drop * 0.5))),
        hx: half * range(r, 0.8, 1.3),
        hz: half * range(r, 0.6, 1.0),
        // turned to face out of the cliff, more or less
        yaw: -a + range(r, -0.5, 0.5),
        pitch: range(r, -0.12, 0.12),
        roll: range(r, -0.12, 0.12),
        flatTop: false,
        points: 12,
        moss: false,
        size: half
      })
    }
  }

  // angular fragments, half-buried round the base, more on the seaward side
  const shelf = masses[0]
  for (let i = 0; i < 26; i++) {
    const a = r() < 0.6 ? range(r, 0.2, Math.PI - 0.2) : r() * Math.PI * 2
    const reach = 1 + range(r, 0.0, 0.25)
    const size = range(r, 0.08, 0.28)
    stone({
      x: shelf.x + Math.cos(a) * shelf.rx * reach,
      z: shelf.z + Math.sin(a) * shelf.rz * reach,
      base: range(r, -0.2, -0.05),
      top: range(r, 0.02, 0.12) + size * range(r, 0.9, 1.5),
      hx: size * range(r, 1.0, 1.35),
      hz: size * range(r, 0.8, 1.0),
      yaw: r() * Math.PI,
      pitch: range(r, -0.25, 0.25),
      roll: range(r, -0.25, 0.25),
      flatTop: false,
      points: 9,
      moss: false,
      size
    })
  }
  return stones
}

/** One stone as a convex solid with chamfered edges, coloured face by face */
function stoneGeometry(s: Stone, lod: Lod) {
  const r = rng(s.seed)
  const bevel = BEVEL[lod]
  const halfH = (s.top - s.base) / 2
  const local: [number, number, number][] = []
  // the box's eight corners, each pulled in a little, so every stone has a full outline...
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) local.push([sx * range(r, 0.72, 1), sy, sz * range(r, 0.72, 1)])
  // ...then points scattered over its faces: each one a corner of some fracture plane
  for (let i = 0; i < s.points; i++) {
    const p: [number, number, number] = [range(r, -1, 1), range(r, -1, 1), range(r, -1, 1)]
    const axis = Math.abs(p[0]) > Math.abs(p[1]) ? (Math.abs(p[0]) > Math.abs(p[2]) ? 0 : 2) : Math.abs(p[1]) > Math.abs(p[2]) ? 1 : 2
    p[axis] = Math.sign(p[axis]) || 1
    // pushed in from the box's faces by differing amounts: the facets come out at differing angles
    const inset = range(r, 0, 0.32)
    for (let k = 0; k < 3; k++) if (k !== 1 || !s.flatTop) p[k] *= 1 - inset * (k === axis ? 1 : 0.2)
    local.push(p)
  }
  // a plateau stone's upper points all lie on its top plane
  if (s.flatTop) for (const p of local) if (p[1] > 0.35) p[1] = 1

  const m = new Matrix4()
    .makeRotationFromEuler(new Euler(s.pitch, s.yaw, s.roll, 'YXZ'))
    .setPosition(s.x, (s.top + s.base) / 2, s.z)
  const points: Vector3[] = []
  const v = new Vector3()
  for (const [x, y, z] of local) {
    v.set(x * s.hx, y * halfH, z * s.hz).applyMatrix4(m)
    // the base is buried: only chamfer what shows
    if (!bevel.width || y < -0.6) points.push(v.clone())
    else for (const [dx, dy, dz] of bevel.dirs) points.push(new Vector3(v.x + dx * bevel.width, v.y + dy * bevel.width, v.z + dz * bevel.width))
  }
  const g = new ConvexGeometry(points)
  g.deleteAttribute('uv')

  // colour: the stone's own tone, lighter on its top faces, darker underneath and near the ground
  // warm grays, pinks and browns, and a few cooler grays, each stone a little lighter or darker than the next
  const tones = ['#a39890', '#b2958a', '#93857a', '#9a9a98', '#b9a091', '#a78c83', '#8f8a86', '#ab9a8a'].map((h) => new Color(h))
  const base = tones[Math.floor(s.tone * tones.length)].clone().multiplyScalar(0.88 + 0.2 * r())
  const top = new Color('#cbbfb2')
  const under = new Color('#6a615d')
  const pos = g.getAttribute('position')
  const nrm = g.getAttribute('normal')
  const col = new Float32Array(pos.count * 3)
  const cover = new Float32Array(pos.count)
  const k = new Color()
  for (let i = 0; i < pos.count; i++) {
    const ny = nrm.getY(i)
    const y = pos.getY(i)
    k.copy(base)
      .lerp(top, smoothstep(0.55, 0.95, ny) * 0.42)
      .lerp(under, smoothstep(-0.1, -0.7, ny) * 0.6)
    k.multiplyScalar(0.7 + 0.3 * smoothstep(-0.25, 1.1, y))
    col.set([k.r, k.g, k.b], i * 3)
    cover[i] = s.moss && ny > 0.75 ? 0.52 : 0
  }
  g.setAttribute('color', new BufferAttribute(col, 3))
  g.setAttribute('aCover', new BufferAttribute(cover, 1))
  return g
}

export async function buildFacetedOutcrop({ seed, lod }: { seed: number; lod: Lod }): Promise<AssetBuild> {
  const t0 = performance.now()
  const stones = layout(seed).filter((s) => s.size >= BEVEL[lod].minFragment)
  const geometry = mergeGeometries(stones.map((s) => stoneGeometry(s, lod)))
  geometry.computeBoundingSphere()
  return {
    parts: [{ geometry, material: graniteMaterial(), castShadow: true, receiveShadow: true }],
    anchor: { footprint: ringFootprint(2.6, 1.8, 12), embed: EMBED, maxTilt: 0.08 },
    size: [7, 2.2, 5],
    stats: {
      triangles: geometry.getAttribute('position').count / 3,
      vertices: geometry.getAttribute('position').count,
      buildMs: Math.round(performance.now() - t0),
      notes: `${stones.length} stones · budget ${ASSET_BUDGETS[ID][lod].toLocaleString()}`
    }
  }
}
