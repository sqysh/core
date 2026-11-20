import { BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Vector3 } from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { fbm3, noise3, rng, smoothstep } from '../../lighthouse/_lib/noise'

// Sculpted pieces for landscaping, in the diorama's hand-made style: big rounded rocks, mature trees with full,
// whimsical canopies, hydrangea bushes heavy with blooms, and grass tufts. All vertex-coloured, so they instance
// cheaply with one shared material each.

function paint(geo: BufferGeometry, pick: (p: Vector3, n: Vector3, out: Color) => void) {
  const pos = geo.getAttribute('position')
  const nrm = geo.getAttribute('normal')
  const col = new Float32Array(pos.count * 3)
  const p = new Vector3()
  const n = new Vector3()
  const c = new Color()
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    n.fromBufferAttribute(nrm, i)
    pick(p, n, c)
    col.set([c.r, c.g, c.b], i * 3)
  }
  geo.setAttribute('color', new BufferAttribute(col, 3))
  return geo
}

function solid(geo: BufferGeometry, hex: string) {
  const c = new Color(hex)
  return paint(geo, (_p, _n, out) => out.copy(c))
}

/** A smooth, rounded boulder of weathered stone, unit radius, sitting on y = 0 with a third of it below */
export function roundedRock(seed: number, tone: 'sand' | 'gray' = 'sand') {
  const g = new IcosahedronGeometry(1, 3)
  g.deleteAttribute('uv')
  g.deleteAttribute('normal')
  const geo = mergeVertices(g)
  const pos = geo.getAttribute('position')
  const r = rng(seed)
  const sx = 0.85 + r() * 0.4
  const sz = 0.8 + r() * 0.35
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    // lumpy and pillowy, then a flatter, heavier base
    const k = 1 + 0.2 * fbm3(x * 1.3, y * 1.3, z * 1.3, seed) + 0.05 * noise3(x * 4, y * 4, z * 4, seed + 1)
    const yy = y * k * (y > 0 ? 0.78 : 0.55)
    pos.setXYZ(i, x * k * sx, yy, z * k * sz)
  }
  geo.computeVertexNormals()
  const light = new Color(tone === 'sand' ? '#e3cdb0' : '#c9c4bb')
  const mid = new Color(tone === 'sand' ? '#c4a385' : '#a19b92')
  const dark = new Color(tone === 'sand' ? '#8f725d' : '#6f6a64')
  return paint(geo, (p, n, out) => {
    const lit = 0.5 + 0.5 * n.y
    const crevice = smoothstep(0.1, -0.35, fbm3(p.x * 2.2, p.y * 2.2, p.z * 2.2, seed + 2))
    out.copy(mid).lerp(light, smoothstep(0.35, 0.95, lit)).lerp(dark, crevice * 0.45 + smoothstep(0.1, -0.3, p.y) * 0.4)
  })
}

/** A mature broadleaf tree: a stout trunk with a couple of limbs and a full, rounded, sunlit crown */
export function canopyTree(seed: number, crown: number, trunk: number) {
  const r = rng(seed)
  const blobs: BufferGeometry[] = []
  const centres: [number, number, number, number][] = [[0, 0, 0, 1]]
  const ring = 5 + Math.floor(r() * 2)
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2 + r() * 0.5
    centres.push([Math.cos(a) * 0.62, -0.18 + r() * 0.2, Math.sin(a) * 0.62, 0.62 + r() * 0.18])
  }
  centres.push([0.1, 0.48, -0.05, 0.66])
  for (const [x, y, z, s] of centres) {
    const g = new IcosahedronGeometry(crown * s, 2)
    g.translate(x * crown, y * crown, z * crown)
    g.deleteAttribute('uv')
    g.deleteAttribute('normal')
    blobs.push(g)
  }
  const crownGeo = mergeVertices(mergeGeometries(blobs)!)
  const pos = crownGeo.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const k = 1 + 0.1 * fbm3(x * 2.5, y * 2.5, z * 2.5, seed)
    pos.setXYZ(i, x * k, y * k, z * k)
  }
  crownGeo.computeVertexNormals()
  const shade = new Color('#33582a')
  const mid = new Color('#5d8a3a')
  const sun = new Color('#a9c45e')
  paint(crownGeo, (p, n, out) => {
    const lit = smoothstep(-0.3, 0.95, n.y * 0.8 + n.x * -0.25 + n.z * 0.15)
    out.copy(shade).lerp(mid, smoothstep(0, 0.55, lit)).lerp(sun, smoothstep(0.55, 1, lit) * 0.85)
    out.multiplyScalar(0.93 + 0.12 * noise3(p.x * 3, p.y * 3, p.z * 3, seed + 3))
  })
  crownGeo.translate(0, trunk + crown * 0.55, 0)

  const bark = '#5a3d29'
  const stem = new CylinderGeometry(crown * 0.09, crown * 0.14, trunk + crown * 0.3, 8)
  stem.translate(0, (trunk + crown * 0.3) / 2, 0)
  const limbs = [0.9, -1.1].map((a) => {
    const l = new CylinderGeometry(crown * 0.05, crown * 0.07, crown * 0.7, 6)
    l.translate(0, crown * 0.35, 0)
    l.rotateZ(a * 0.6)
    l.rotateY(r() * Math.PI)
    l.translate(0, trunk * 0.8, 0)
    return l
  })
  const wood = [stem, ...limbs].map((g) => {
    g.deleteAttribute('uv')
    return solid(g, bark)
  })
  return mergeGeometries([crownGeo, ...wood])!
}

const BLOOMS = ['#7fa2e6', '#f0a6c8', '#f4efe4', '#b59ae2']

/** A hydrangea bush: a low mound of leaves crowned with big round flower heads */
export function hydrangea(seed: number, size: number, bloom = BLOOMS[seed % BLOOMS.length]) {
  const r = rng(seed)
  const leaves: BufferGeometry[] = []
  for (let i = 0; i < 4; i++) {
    const a = r() * Math.PI * 2
    const g = new IcosahedronGeometry(size * (0.55 + r() * 0.2), 2)
    g.translate(Math.cos(a) * size * 0.4, size * 0.4, Math.sin(a) * size * 0.4)
    g.deleteAttribute('uv')
    g.deleteAttribute('normal')
    leaves.push(g)
  }
  const mound = mergeVertices(mergeGeometries(leaves)!)
  mound.computeVertexNormals()
  const dark = new Color('#3a6230')
  const lite = new Color('#6f9a45')
  paint(mound, (p, n, out) => out.copy(dark).lerp(lite, smoothstep(-0.2, 0.9, n.y)))
  const heads: BufferGeometry[] = []
  const c = new Color(bloom)
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2
    const rad = size * (0.2 + r() * 0.55)
    const g = new IcosahedronGeometry(size * (0.2 + r() * 0.08), 1)
    g.deleteAttribute('uv')
    g.translate(Math.cos(a) * rad, size * (0.72 + r() * 0.25), Math.sin(a) * rad)
    const tint = c.clone().multiplyScalar(0.85 + r() * 0.25)
    heads.push(paint(g, (_p, n, out) => out.copy(tint).multiplyScalar(0.8 + 0.25 * Math.max(0, n.y))))
  }
  mound.deleteAttribute('uv')
  const flowers = mergeGeometries(heads.map((g) => (g.index ? g.toNonIndexed() : g)))!
  return mergeGeometries([mound.toNonIndexed(), flowers])!
}
export const HYDRANGEA_COLOURS = BLOOMS

/** A clump of grass blades */
export function tuft(seed: number) {
  const r = rng(seed)
  const blades: BufferGeometry[] = []
  for (let i = 0; i < 5; i++) {
    const h = 0.18 + r() * 0.14
    const g = new ConeGeometry(0.025, h, 3)
    g.deleteAttribute('uv')
    g.translate(0, h / 2, 0)
    g.rotateZ((r() - 0.5) * 0.7)
    g.rotateY(r() * Math.PI * 2)
    g.translate((r() - 0.5) * 0.1, 0, (r() - 0.5) * 0.1)
    blades.push(paint(g.toNonIndexed(), (p, _n, out) => out.set('#4c7a33').lerp(new Color('#9cb85a'), p.y / 0.32)))
  }
  return mergeGeometries(blades)!
}

/** A pine: a dark, stacked-cone tree with a reddish trunk, quite unlike the round broadleaf crowns */
export function pine(seed: number, h: number) {
  const r = rng(seed)
  const parts: BufferGeometry[] = []
  const trunk = new CylinderGeometry(h * 0.03, h * 0.05, h * 0.45, 7)
  trunk.translate(0, h * 0.22, 0)
  trunk.deleteAttribute('uv')
  parts.push(solid(trunk, '#6b4630'))
  const tiers = 4 + Math.floor(r() * 2)
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers
    const rad = h * (0.3 - t * 0.2) * (0.9 + r() * 0.2)
    const cone = new ConeGeometry(rad, h * 0.34, 9)
    cone.deleteAttribute('uv')
    cone.translate(0, h * (0.3 + t * 0.55), 0)
    cone.rotateY(r() * Math.PI)
    const dark = new Color('#2a4d2b')
    const lite = new Color('#4f7d3a')
    parts.push(paint(cone, (p, n, out) => out.copy(dark).lerp(lite, smoothstep(-0.3, 0.9, n.y) * (0.45 + t * 0.4))))
  }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!
}

/** A birch: a slim pale trunk under a loose, airy crown of small bright-green clumps */
export function birch(seed: number, h: number) {
  const r = rng(seed)
  const parts: BufferGeometry[] = []
  const trunk = new CylinderGeometry(h * 0.02, h * 0.035, h * 0.78, 6)
  trunk.translate(0, h * 0.39, 0)
  trunk.deleteAttribute('uv')
  parts.push(solid(trunk, '#e6e0d2'))
  for (let i = 0; i < 6; i++) {
    const g = new IcosahedronGeometry(h * (0.15 + r() * 0.08), 1)
    g.deleteAttribute('uv')
    g.translate((r() - 0.5) * h * 0.34, h * (0.62 + r() * 0.3), (r() - 0.5) * h * 0.34)
    parts.push(
      paint(g, (_p, n, out) => out.set('#7fa84a').lerp(new Color('#b6d26a'), smoothstep(-0.2, 0.9, n.y)).multiplyScalar(0.9 + r() * 0.15))
    )
  }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!
}
