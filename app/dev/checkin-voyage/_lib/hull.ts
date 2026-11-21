import { BufferAttribute, BufferGeometry, CanvasTexture, SRGBColorSpace, Vector3 } from 'three'

// A lofted displacement hull: a transom stern, a full midsection, a raked stem, a sheer that sweeps up to the bow,
// a soft V bottom and a forefoot that lifts toward the bow. The paint (bottom, boot stripe, topsides) comes from a
// texture keyed to height, so the waterline stays crisp however coarse the mesh. Bow points along +x.

import { HullSpec, hullStations } from './hullLines'
import { paintFill } from './vessel/paint'

export type { HullSpec } from './hullLines'
export { hullStations } from './hullLines'

export type HullPaint = { topsides: string; stripe: string; bottom: string; sheerLine?: string }

const SEG_L = 44
const SEG_A = 22

/** The hull's outer skin, open at the deck, with its transom */
export function loftedHull(spec: HullSpec) {
  const { halfBeam, sheer, keel } = hullStations(spec)
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  let yMin = Infinity
  let yMax = -Infinity
  const pts: Vector3[] = []
  for (let i = 0; i <= SEG_L; i++) {
    const s = i / SEG_L
    const hb = Math.max(halfBeam(s), 0.004)
    const top = sheer(s)
    const bottom = -keel(s)
    for (let j = 0; j <= SEG_A; j++) {
      const a = (j / SEG_A) * Math.PI // port sheer → keel → starboard sheer
      const c = Math.cos(a)
      const side = Math.sign(c) * Math.pow(Math.abs(c), spec.fullness)
      const down = 1 - Math.pow(Math.abs(c), 1.15) // 0 at the sheer, 1 on the keel
      const y = top + (bottom - top) * down
      // raked stem: near the bow the lower hull draws aft
      const x = (s - 0.5) * spec.length - spec.rake * spec.length * down * Math.pow(s, 7)
      const p = new Vector3(x, y, side * hb)
      pts.push(p)
      yMin = Math.min(yMin, y)
      yMax = Math.max(yMax, y)
    }
  }
  for (const p of pts) {
    pos.push(p.x, p.y, p.z)
  }
  for (let i = 0; i <= SEG_L; i++)
    for (let j = 0; j <= SEG_A; j++) {
      const p = pts[i * (SEG_A + 1) + j]
      uv.push(i / SEG_L, (p.y - yMin) / (yMax - yMin))
    }
  for (let i = 0; i < SEG_L; i++)
    for (let j = 0; j < SEG_A; j++) {
      const a = i * (SEG_A + 1) + j
      const b = a + SEG_A + 1
      idx.push(a, a + 1, b, b, a + 1, b + 1)
    }
  // transom: a fan across the stern section
  const centre = pos.length / 3
  const sx = pts[0].x
  const sy = (sheer(0) - keel(0)) / 2
  pos.push(sx, sy, 0)
  uv.push(0, (sy - yMin) / (yMax - yMin))
  for (let j = 0; j < SEG_A; j++) idx.push(centre, j + 1, j)

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  geo.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()

  // the sheer line, port then starboard, for rails and the deck
  const sheerLine = (side: 1 | -1) =>
    Array.from({ length: SEG_L + 1 }, (_, i) => {
      const s = i / SEG_L
      return new Vector3((s - 0.5) * spec.length, sheer(s), side * Math.max(halfBeam(s), 0.004))
    })
  return { geo, yMin, yMax, sheerLine }
}

/** A cambered deck that follows the sheer, a little below the rail, between stations `from` and `to` (0 stern, 1 bow) */
export function hullDeck(spec: HullSpec, inset = 0.035, drop = 0.03, from = 0, to = 0.985) {
  const { halfBeam, sheer } = hullStations(spec)
  const across = 8
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= SEG_L; i++) {
    const s = from + (to - from) * (i / SEG_L)
    const hb = Math.max(halfBeam(s) - inset, 0.002)
    for (let j = 0; j <= across; j++) {
      const t = j / across
      const z = (t * 2 - 1) * hb
      const camber = 0.025 * (1 - Math.pow(z / Math.max(hb, 0.01), 2))
      const x = (s - 0.5) * spec.length
      pos.push(x, sheer(s) - drop + camber, z)
      uv.push(x * 1.6, z * 1.6)
    }
  }
  for (let i = 0; i < SEG_L; i++)
    for (let j = 0; j < across; j++) {
      const a = i * (across + 1) + j
      const b = a + across + 1
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  geo.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

const paintCache = new Map<string, CanvasTexture>()

/** Bottom paint, a crisp boot stripe at the waterline, then topsides, with a fine cove line under the sheer */
export function hullPaintTexture(paint: HullPaint, yMin: number, yMax: number, waterline: number) {
  const key = `${paint.topsides}|${paint.stripe}|${paint.bottom}|${paint.sheerLine}|${yMin.toFixed(3)}|${yMax.toFixed(3)}|${waterline}`
  const hit = paintCache.get(key)
  if (hit) return hit
  const H = 512
  const c = document.createElement('canvas')
  c.width = 4
  c.height = H
  const g = c.getContext('2d')!
  const row = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H
  g.fillStyle = paintFill(paint.topsides)
  g.fillRect(0, 0, 4, H)
  g.fillStyle = paintFill(paint.bottom)
  g.fillRect(0, row(waterline), 4, H)
  g.fillStyle = paintFill(paint.stripe)
  g.fillRect(0, row(waterline + 0.045), 4, row(waterline) - row(waterline + 0.045))
  if (paint.sheerLine) {
    g.fillStyle = paintFill(paint.sheerLine)
    g.fillRect(0, row(yMax - 0.035), 4, Math.max(2, row(yMax - 0.05) - row(yMax - 0.035)))
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  // canvas row 0 is the top of the hull; flip so uv.v = 0 is the keel
  tex.flipY = true
  paintCache.set(key, tex)
  return tex
}
