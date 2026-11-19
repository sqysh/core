import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ExtrudeGeometry,
  ExtrudeGeometryOptions,
  IcosahedronGeometry,
  LatheGeometry,
  Path,
  Shape,
  Vector2,
  Vector3
} from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { fbm3, noise3, rng, smoothstep } from './noise'
import { PALETTE } from './materials'

// Sculpted building blocks shared by every tile: chiselled rock slabs, boulders, curved clay roofs, arched windows,
// cypress trees, shrubs, ropes and a rowboat hull.

const col = (hex: string) => new Color(hex)

function paintVertices(geo: BufferGeometry, pick: (p: Vector3, n: Vector3, out: Color) => void) {
  const pos = geo.getAttribute('position')
  const nrm = geo.getAttribute('normal')
  const colors = new Float32Array(pos.count * 3)
  const p = new Vector3()
  const n = new Vector3()
  const c = new Color()
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    n.fromBufferAttribute(nrm, i)
    pick(p, n, c)
    colors.set([c.r, c.g, c.b], i * 3)
  }
  geo.setAttribute('color', new BufferAttribute(colors, 3))
}

/** A layered sandstone slab: a chunky, bevelled, slightly tilted plate with chiselled faces and strata on its sides */
export function rockSlab({
  w,
  d,
  h,
  seed,
  bevel = 0.08,
  tilt = 0.05
}: {
  w: number
  d: number
  h: number
  seed: number
  bevel?: number
  tilt?: number
}) {
  const r = rng(seed)
  const shape = new Shape()
  const corners = 9
  for (let i = 0; i < corners; i++) {
    const a = (i / corners) * Math.PI * 2 + (r() - 0.5) * 0.35
    const cx = Math.cos(a)
    const cz = Math.sin(a)
    // a squarish outline with cut corners, like a split stone plate
    const k = 0.45
    const x = Math.sign(cx) * Math.pow(Math.abs(cx), k) * (w / 2) * (0.86 + r() * 0.14)
    const y = Math.sign(cz) * Math.pow(Math.abs(cz), k) * (d / 2) * (0.86 + r() * 0.14)
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  const depth = Math.max(0.02, h - bevel * 2)
  const geo = new ExtrudeGeometry(shape, {
    depth,
    steps: Math.max(1, Math.round(h / 0.22)),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 1
  })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, bevel, 0)

  const tx = (r() - 0.5) * tilt
  const tz = (r() - 0.5) * tilt
  const pos = geo.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i)
    let y = pos.getY(i)
    let z = pos.getZ(i)
    const taper = 1 - 0.07 * (y / h)
    const n1 = noise3(x * 1.4, y * 1.4, z * 1.4, seed)
    const n2 = noise3(x * 1.4 + 9, y * 1.4, z * 1.4, seed)
    x = x * taper + n1 * 0.07
    z = z * taper + n2 * 0.07
    if (y > h - bevel * 1.2) y += x * tx + z * tz + fbm3(x * 2, 0, z * 2, seed) * 0.025
    else y += n1 * 0.02
    pos.setXYZ(i, x, y, z)
  }
  geo.computeVertexNormals()

  const top = col(PALETTE.rockTop)
  const side = col(PALETTE.rockSide)
  const deep = col(PALETTE.rockDeep)
  paintVertices(geo, (p, n, out) => {
    const grain = fbm3(p.x * 3, p.y * 3, p.z * 3, seed + 3)
    if (n.y > 0.6) {
      out.copy(top).lerp(side, 0.12 + grain * 0.18)
    } else {
      const strata = 0.5 + 0.5 * Math.sin(p.y * 13 + grain * 3)
      out.copy(side).lerp(deep, strata * 0.4 + 0.1)
      // lighter where the face turns toward the top, darker in the slab's foot
      out.lerp(top, smoothstep(0.1, 0.6, n.y) * 0.5)
      out.multiplyScalar(0.8 + 0.2 * smoothstep(0, h * 0.7, p.y))
    }
  })
  return geo
}

/** A weathered gray boulder, faceted, sitting flat on the ground */
export function boulder({ r: radius, seed, squash = 0.7 }: { r: number; seed: number; squash?: number }) {
  const geo = new IcosahedronGeometry(radius, 2)
  const pos = geo.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const s = 1 + 0.22 * fbm3(x * 2.2, y * 2.2, z * 2.2, seed)
    pos.setXYZ(i, x * s, Math.max(-radius * 0.15, y * s * squash), z * s)
  }
  geo.computeVertexNormals()
  const lite = col('#c9c3b8')
  const dark = col('#857f78')
  paintVertices(geo, (p, n, out) => {
    out.copy(dark).lerp(lite, 0.35 + 0.45 * Math.max(0, n.y) + 0.15 * noise3(p.x * 4, p.y * 4, p.z * 4, seed))
  })
  return geo
}

/** Height of a curved roof's top surface at t = 0 (ridge) … 1 (eave tip): steep at the ridge, flaring out at the eaves */
const roofCurve = (t: number, ridge: number, height: number) =>
  ridge - height * (1 - Math.pow(1 - t, 1.9)) + 0.1 * Math.pow(smoothstep(0.72, 1, t), 2)

/**
 * A gable roof whose slopes curve outward into flared eaves, extruded along z. `halfSpan` is ridge to eave tip,
 * `height` ridge to eave. Returns the geometry and the slope's inner surface, so walls can be cut to fit under it.
 * Group 0 is the gable edge (trim), group 1 the tiled slopes, mapped (along the ridge, down the slope) in world units.
 */
export function curvedGableRoof({
  halfSpan,
  height,
  length,
  thickness = 0.13,
  ridge
}: {
  halfSpan: number
  height: number
  length: number
  thickness?: number
  ridge: number
}) {
  const steps = 22
  const outer: Vector2[] = []
  const inner: Vector2[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    outer.push(new Vector2(t * halfSpan, roofCurve(t, ridge, height)))
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps
    inner.push(new Vector2(t * halfSpan, roofCurve(t, ridge, height) - thickness))
  }
  const shape = new Shape()
  // left eave → ridge → right eave on top, then back underneath
  const pts = [
    ...outer
      .slice()
      .reverse()
      .map((p) => new Vector2(-p.x, p.y)),
    ...outer.slice(1),
    ...inner,
    ...inner
      .slice(0, -1)
      .reverse()
      .map((p) => new Vector2(-p.x, p.y))
  ]
  shape.setFromPoints(pts)

  // distance down the slope from the ridge (|x| plus the drop is a close enough arc length for tile rows)
  const downSlope = (x: number, y: number) => Math.abs(x) + (ridge - y)
  const uvGenerator: ExtrudeGeometryOptions['UVGenerator'] = {
    generateTopUV: (_g, v, a, b, c) => [a, b, c].map((i) => new Vector2(v[i * 3], v[i * 3 + 1])),
    generateSideWallUV: (_g, v, a, b, c, d) =>
      [a, b, c, d].map((i) => new Vector2(v[i * 3 + 2] * 0.55, downSlope(v[i * 3], v[i * 3 + 1]) * 0.75))
  }
  const geo = new ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: 1,
    UVGenerator: uvGenerator
  })
  geo.translate(0, 0, -length / 2)
  return { geo, underside: (x: number) => roofCurve(Math.min(1, Math.abs(x) / halfSpan), ridge, height) - thickness }
}

/** A wall block whose gable ends follow a roof's underside */
export function gabledWalls({
  width,
  length,
  underside
}: {
  width: number
  length: number
  underside: (x: number) => number
}) {
  const shape = new Shape()
  shape.moveTo(-width / 2, 0)
  shape.lineTo(width / 2, 0)
  const steps = 16
  for (let i = 0; i <= steps; i++) {
    const x = width / 2 - (i / steps) * width
    shape.lineTo(x, underside(x) - 0.01)
  }
  shape.closePath()
  const geo = new ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
    curveSegments: 1
  })
  geo.translate(0, 0, -length / 2)
  return geo
}

/** An arch outline: a rectangle with a round head, base at y = 0 */
export function archPath(w: number, h: number, path: Path = new Shape()) {
  const r = w / 2
  path.moveTo(-r, 0)
  path.lineTo(r, 0)
  path.lineTo(r, h - r)
  path.absarc(0, h - r, r, 0, Math.PI, false)
  path.lineTo(-r, 0)
  return path
}

/** An arched window frame (with the opening cut out) and its glass */
export function archWindow(w: number, h: number, frame = 0.06, depth = 0.05) {
  const outer = archPath(w + frame * 2, h + frame) as Shape
  outer.holes.push(archPath(w, h, new Path()))
  const frameGeo = new ExtrudeGeometry(outer, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 16
  })
  frameGeo.translate(0, -frame / 2, 0)
  const glassGeo = new ExtrudeGeometry(archPath(w, h) as Shape, {
    depth: 0.01,
    bevelEnabled: false,
    curveSegments: 16
  })
  glassGeo.translate(0, -frame / 2, 0)
  return { frameGeo, glassGeo }
}

/** An Italian cypress: a tall flame of lumpy foliage, darker in its core */
export function cypress({ h, r: radius, seed }: { h: number; r: number; seed: number }) {
  const pts: Vector2[] = []
  const n = 24
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const rr = radius * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.85) * (1 - 0.15 * t)
    pts.push(new Vector2(Math.max(0.001, rr), t * h))
  }
  const lathe = new LatheGeometry(pts, 18)
  lathe.deleteAttribute('uv')
  lathe.deleteAttribute('normal')
  const geo = mergeVertices(lathe)
  const pos = geo.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const lump = 1 + 0.2 * fbm3(x * 4, y * 2.6, z * 4, seed) + 0.08 * noise3(x * 11, y * 8, z * 11, seed + 1)
    pos.setXYZ(i, x * lump, y, z * lump)
  }
  geo.computeVertexNormals()
  const dark = col('#2c4a22')
  const mid = col(PALETTE.foliage)
  const lite = col(PALETTE.foliageLight)
  paintVertices(geo, (p, nn, out) => {
    const t = p.y / h
    out
      .copy(dark)
      .lerp(mid, smoothstep(0, 0.5, t))
      .lerp(lite, Math.max(0, nn.x * -0.4 + nn.y * 0.3 + nn.z * 0.2) * 0.6 + 0.08 * noise3(p.x * 9, p.y * 9, p.z * 9, seed))
  })
  return geo
}

/** A rounded shrub made of a few lumpy blobs */
export function shrub({ r: radius, seed, blobs = 3 }: { r: number; seed: number; blobs?: number }) {
  const rand = rng(seed)
  const parts: BufferGeometry[] = []
  for (let b = 0; b < blobs; b++) {
    const rr = radius * (b === 0 ? 1 : 0.55 + rand() * 0.3)
    const g = new IcosahedronGeometry(rr, 3)
    const a = rand() * Math.PI * 2
    const off = b === 0 ? 0 : radius * 0.7
    g.translate(Math.cos(a) * off, rr * 0.75, Math.sin(a) * off)
    parts.push(g)
  }
  const geo = mergeVertices(mergeAll(parts))
  const pos = geo.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const s = 1 + 0.12 * fbm3(x * 5, y * 5, z * 5, seed)
    pos.setXYZ(i, x * s, Math.max(0, y * s), z * s)
  }
  geo.computeVertexNormals()
  const dark = col('#2f5122')
  const lite = col('#79a145')
  paintVertices(geo, (p, n, out) => {
    out.copy(dark).lerp(lite, 0.3 + 0.45 * Math.max(0, n.y) + 0.1 * noise3(p.x * 10, p.y * 10, p.z * 10, seed))
  })
  return geo
}

function mergeAll(parts: BufferGeometry[]) {
  let count = 0
  const nonIndexed = parts.map((p) => {
    const g = p.index ? p.toNonIndexed() : p
    count += g.getAttribute('position').count
    return g
  })
  const pos = new Float32Array(count * 3)
  let o = 0
  for (const g of nonIndexed) {
    pos.set(g.getAttribute('position').array as Float32Array, o)
    o += g.getAttribute('position').count * 3
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  return geo
}

/** A rope hanging between two points with a natural sag */
export function sagCurve(a: Vector3, b: Vector3, sag: number, points = 24) {
  const pts: Vector3[] = []
  for (let i = 0; i <= points; i++) {
    const t = i / points
    const p = a.clone().lerp(b, t)
    p.y -= sag * 4 * t * (1 - t)
    pts.push(p)
  }
  return new CatmullRomCurve3(pts)
}

/** A clinker rowboat hull along +x: bow at +x, transom at -x. Open on top; uv runs (along hull, around the hull). */
export function rowboatHull({ length = 1.7, beam = 0.62, depth = 0.3 }) {
  const segL = 28
  const segA = 14
  const verts: number[] = []
  const uvs: number[] = []
  const index: number[] = []
  for (let i = 0; i <= segL; i++) {
    const s = i / segL // 0 transom → 1 bow
    // half-beam: full aft, pinching to a point at the bow
    const half = (beam / 2) * Math.pow(Math.sin(Math.PI * (0.5 + s * 0.5)), 0.7) * (0.82 + 0.18 * Math.sin(Math.PI * s))
    const keel = depth * (1 - 0.35 * Math.pow(s, 3))
    const sheer = 0.06 * Math.pow(s, 2.5) + 0.02 * Math.pow(1 - s, 2)
    for (let j = 0; j <= segA; j++) {
      const a = (j / segA) * Math.PI // around: port gunwale → keel → starboard gunwale
      const x = (s - 0.5) * length
      const y = sheer - keel * Math.pow(Math.sin(a), 0.75)
      const z = Math.cos(a) * Math.max(half, 0.005)
      verts.push(x, y, z)
      uvs.push(s * 2, j / segA)
    }
  }
  for (let i = 0; i < segL; i++)
    for (let j = 0; j < segA; j++) {
      const a = i * (segA + 1) + j
      const b = a + segA + 1
      index.push(a, b, a + 1, b, b + 1, a + 1)
    }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3))
  geo.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  geo.setIndex(index)
  geo.computeVertexNormals()
  // the gunwale line, for the rail
  const rail: Vector3[] = []
  for (let i = 0; i <= segL; i++) rail.push(new Vector3(verts[i * (segA + 1) * 3], verts[i * (segA + 1) * 3 + 1], verts[i * (segA + 1) * 3 + 2]))
  for (let i = segL; i >= 0; i--) {
    const k = (i * (segA + 1) + segA) * 3
    rail.push(new Vector3(verts[k], verts[k + 1], verts[k + 2]))
  }
  // transom plate (closes the stern)
  const transom: Vector3[] = []
  for (let j = 0; j <= segA; j++) {
    const k = j * 3
    transom.push(new Vector3(verts[k], verts[k + 1], verts[k + 2]))
  }
  return { geo, rail, transom }
}
