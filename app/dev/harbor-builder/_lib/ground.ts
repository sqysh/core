import {
  DataTexture,
  DoubleSide,
  LinearFilter,
  Matrix4,
  Quaternion,
  Ray,
  RGBAFormat,
  UnsignedByteType,
  Vector3
} from 'three'
import { MAP } from '@/lib/harbor/seaSurface'
import { landBVH, LoadedModel } from './models'

// Where things stand: the ground under any point (cast down onto the land models' real surfaces), and the sea's depth
// map baked from that same land, so the shallows and foam follow the coastline the models actually make.

const DEG = Math.PI / 180

type Transform = {
  position: Vector3
  yaw: number
  scale: number
  /** Its height in the world */
  height: number
  matrix: Matrix4
  inverse: Matrix4
}

export function compose(position: Vector3, yaw: number, scale: number) {
  const matrix = new Matrix4().compose(
    position,
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw * DEG),
    new Vector3(scale, scale, scale)
  )
  return { matrix, inverse: matrix.clone().invert() }
}

/** A land model as drawn: its world matrix (and inverse) and the model, for finding the ground and baking the sea */
export type LandPiece = { transform: Pick<Transform, 'matrix' | 'inverse'>; model: LoadedModel }

const ray = new Ray()
const local = new Ray()
const hitPoint = new Vector3()

/** The highest land surface at (x, z), or null over open water */
export function groundAt(land: LandPiece[], x: number, z: number): number | null {
  let best: number | null = null
  ray.origin.set(x, 200, z)
  ray.direction.set(0, -1, 0)
  for (const { transform, model } of land) {
    local.copy(ray).applyMatrix4(transform.inverse)
    // a quick reject: does the ray pass through this piece's box at all?
    if (!local.intersectsBox(model.box)) continue
    const hit = landBVH(model).raycastFirst(local, DoubleSide)
    if (!hit) continue
    hitPoint.copy(hit.point).applyMatrix4(transform.matrix)
    if (best === null || hitPoint.y > best) best = hitPoint.y
  }
  return best
}

const faceNormal = new Vector3()

/**
 * Whether the land stands in the sea at (x, z): there's land above the water there, and it isn't just a span of rock
 * over open water (under an arch or an overhang the lowest surface above the water faces down: the sea runs beneath).
 */
export function standsInSea(land: LandPiece[], x: number, z: number): boolean {
  ray.origin.set(x, 200, z)
  ray.direction.set(0, -1, 0)
  let lowest: number | null = null
  let lowestFacesUp = true
  for (const { transform, model } of land) {
    local.copy(ray).applyMatrix4(transform.inverse)
    if (!local.intersectsBox(model.box)) continue
    for (const hit of landBVH(model).raycast(local, DoubleSide)) {
      hitPoint.copy(hit.point).applyMatrix4(transform.matrix)
      if (hitPoint.y <= -0.15 || !hit.face) continue
      if (lowest !== null && hitPoint.y >= lowest) continue
      lowest = hitPoint.y
      lowestFacesUp = faceNormal.copy(hit.face.normal).transformDirection(transform.matrix).y > 0
    }
  }
  return lowest !== null && lowestFacesUp
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * The sea's depth map over the check-in sea's area (MAP), from the land as placed: where the land stands above the
 * water, the distance from it, and a sea floor shelving from shallows round each coast down to deep water. Encoded as
 * the sea surface expects (height over [lo, hi] in red, distance from shore / 4 in green).
 */
export function bakeSea(land: LandPiece[], res = 192, shelf = 11) {
  const { minX, minZ, size, lo, hi } = MAP
  const cell = size / res
  const isLandCell = new Uint8Array(res * res)
  for (let j = 0; j < res; j++)
    for (let i = 0; i < res; i++) {
      if (standsInSea(land, minX + (i + 0.5) * cell, minZ + (j + 0.5) * cell)) isLandCell[j * res + i] = 1
    }
  // distance to the coast (chamfer), outside the land and inside it
  const dist = (inside: number) => {
    const d = new Float32Array(res * res)
    for (let k = 0; k < d.length; k++) d[k] = isLandCell[k] === inside ? 0 : 1e9
    const D = 1
    const D2 = Math.SQRT2
    for (let j = 0; j < res; j++)
      for (let i = 0; i < res; i++) {
        const k = j * res + i
        if (i > 0) d[k] = Math.min(d[k], d[k - 1] + D)
        if (j > 0) d[k] = Math.min(d[k], d[k - res] + D)
        if (i > 0 && j > 0) d[k] = Math.min(d[k], d[k - res - 1] + D2)
        if (i < res - 1 && j > 0) d[k] = Math.min(d[k], d[k - res + 1] + D2)
      }
    for (let j = res - 1; j >= 0; j--)
      for (let i = res - 1; i >= 0; i--) {
        const k = j * res + i
        if (i < res - 1) d[k] = Math.min(d[k], d[k + 1] + D)
        if (j < res - 1) d[k] = Math.min(d[k], d[k + res] + D)
        if (i < res - 1 && j < res - 1) d[k] = Math.min(d[k], d[k + res + 1] + D2)
        if (i > 0 && j < res - 1) d[k] = Math.min(d[k], d[k + res - 1] + D2)
      }
    return d
  }
  const out = dist(1)
  const inn = dist(0)
  const data = new Uint8Array(res * res * 4)
  const heights = new Float32Array(res * res)
  for (let k = 0; k < res * res; k++) {
    // signed distance from the coast in world units: negative on land
    const d = isLandCell[k] ? -inn[k] * cell : out[k] * cell
    // the floor: just under the water at the coast, shelving through the shallows to deep water
    const h = d <= 0 ? -0.6 : -0.45 - 4.3 * smooth(0, shelf, d)
    heights[k] = h
    data[k * 4] = Math.round(Math.min(1, Math.max(0, (h - lo) / (hi - lo))) * 255)
    data[k * 4 + 1] = Math.round(Math.min(1, Math.max(0, d / 4)) * 255)
    data[k * 4 + 3] = 255
  }
  const tex = new DataTexture(data, res, res, RGBAFormat, UnsignedByteType)
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.needsUpdate = true
  return { texture: tex, heights, res }
}
