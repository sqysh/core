// The harbor generator's view of the models: each GLB read as the editor reads it (app/dev/harbor-builder/_lib:
// models.ts and editor.ts), so a placement worked out here lands exactly where the editor draws it. A model's sizing
// box is its original's bounds, its scale takes that box to its catalog size, and its origin is the middle of the
// box's base. Land models get a BVH, for finding the ground under a point by casting down onto their real surfaces.
//
// Only reads: nothing here writes a model.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dequantize } from '@gltf-transform/functions'
import { MeshoptDecoder } from 'meshoptimizer'
import { Box3, BufferAttribute, BufferGeometry, DoubleSide, Euler, Matrix4, Quaternion, Ray, Vector3 } from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import { fileOf, lodFileOf, modelById, MODELS } from '../../../app/dev/harbor-builder/_lib/catalog.ts'

export { fileOf, lodFileOf, modelById, MODELS }

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const PUBLIC = join(ROOT, 'public')
const DEG = Math.PI / 180

await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })

const cache = new Map()

/**
 * A model's geometry and sizing box. `detail` picks the file: 'full' is what the editor draws at full quality (the
 * water-removed derivative where there is one), 'medium' the medium LOD (a tenth of the triangles: enough for a
 * footprint, and quick to read).
 */
export async function loadModel(id, detail = 'full') {
  const def = modelById(id)
  if (!def) throw new Error(`unknown model "${id}"`)
  let url = detail === 'full' ? fileOf(def, 'cleaned') : lodFileOf(def, detail)
  // no LOD of it yet: its full geometry does
  if (detail !== 'full' && !existsSync(join(PUBLIC, url))) url = fileOf(def, 'cleaned')
  const hit = cache.get(url)
  if (hit) return hit
  const path = join(PUBLIC, url)
  if (!existsSync(path)) throw new Error(`${id}: no file at public${url}`)
  const bytes = readFileSync(path)
  const doc = await io.readBinary(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.length))
  await doc.transform(dequantize())
  const node = doc.getRoot().listNodes().find((n) => n.getMesh())
  if (!node) throw new Error(`${id}: no mesh`)
  const prim = node.getMesh().listPrimitives()[0]
  const world = new Matrix4().fromArray(node.getWorldMatrix())
  const position = new BufferAttribute(new Float32Array(prim.getAttribute('POSITION').getArray()), 3)
  position.applyMatrix4(world)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', position)
  const indices = prim.getIndices()
  if (indices) geometry.setIndex(new BufferAttribute(new Uint32Array(indices.getArray()), 1))
  geometry.computeBoundingBox()
  const source = node.getExtras().sourceBounds ?? doc.getRoot().listScenes()[0]?.getExtras().sourceBounds
  const box = source
    ? new Box3(new Vector3(...source.min), new Vector3(...source.max))
    : geometry.boundingBox.clone()
  // where it meets the ground: the middle of its lowest slice (a leaning tree's trunk, not its box's middle)
  const floor = geometry.boundingBox.min.y + (geometry.boundingBox.max.y - geometry.boundingBox.min.y) * 0.02
  let bx = 0
  let bz = 0
  let bn = 0
  for (let i = 0; i < position.count; i++)
    if (position.getY(i) <= floor) {
      bx += position.getX(i)
      bz += position.getZ(i)
      bn++
    }
  const model = {
    id,
    def,
    geometry,
    box,
    /** The foot's offset from the middle of the box, in model units */
    foot: bn ? { x: bx / bn - (box.min.x + box.max.x) / 2, z: bz / bn - (box.min.z + box.max.z) / 2 } : { x: 0, z: 0 },
    triangles: (indices ? indices.getCount() : position.count) / 3,
    bytes: bytes.length,
    textures: doc.getRoot().listTextures().length
  }
  cache.set(url, model)
  return model
}

export function landBVH(model) {
  model.bvh ??= new MeshBVH(model.geometry)
  return model.bvh
}

/** Scale that takes the model as exported to its catalog size (editor.ts: baseScale) */
export function baseScale(model) {
  const s = model.box.getSize(new Vector3())
  return model.def.size / (model.def.by === 'height' ? s.y : Math.max(s.x, s.z))
}

/** The model's size in the world at object scale [1, 1, 1] */
export function worldSize(model) {
  return model.box.getSize(new Vector3()).multiplyScalar(baseScale(model))
}

/** Model space to world for a scene object (editor.ts: modelMatrix) */
export function modelMatrix(o, model) {
  const base = baseScale(model)
  const b = model.box
  return new Matrix4()
    .compose(
      new Vector3(...o.position),
      new Quaternion().setFromEuler(new Euler(o.rotation[0] * DEG, o.rotation[1] * DEG, o.rotation[2] * DEG)),
      new Vector3(o.scale[0] * base, o.scale[1] * base, o.scale[2] * base)
    )
    .multiply(new Matrix4().makeTranslation(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2))
}

/** A placed land model, ready for ground casts */
export function landPiece(o, model) {
  const matrix = modelMatrix(o, model)
  landBVH(model)
  return { o, model, matrix, inverse: matrix.clone().invert(), worldBox: model.box.clone().applyMatrix4(matrix) }
}

const ray = new Ray()
const local = new Ray()
const point = new Vector3()
const normal = new Vector3()

/**
 * The highest land surface at (x, z): its height, its slope in degrees, and the piece it's on. Null over open water.
 * `below` starts the cast from that height (for finding ground under an arch or an overhang).
 */
export function groundAt(land, x, z, below = 400) {
  let best = null
  ray.origin.set(x, below, z)
  ray.direction.set(0, -1, 0)
  for (const piece of land) {
    const wb = piece.worldBox
    if (x < wb.min.x || x > wb.max.x || z < wb.min.z || z > wb.max.z) continue
    local.copy(ray).applyMatrix4(piece.inverse)
    const hit = piece.model.bvh.raycastFirst(local, DoubleSide)
    if (!hit) continue
    point.copy(hit.point).applyMatrix4(piece.matrix)
    if (best && point.y <= best.y) continue
    normal.copy(hit.face.normal).transformDirection(piece.matrix)
    best = { y: point.y, slope: Math.acos(Math.min(1, Math.abs(normal.y))) / DEG, piece }
  }
  return best
}

/** A small deterministic generator (mulberry32): the same seed gives the same harbor */
export function rng(seed) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  next.range = (lo, hi) => lo + (hi - lo) * next()
  next.pick = (list) => list[Math.floor(next() * list.length)]
  /** A generator of its own for one part of the scene, so adding to one part leaves the others as they were */
  next.fork = (label) => {
    let h = seed >>> 0
    for (const ch of label) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0
    return rng(h)
  }
  return next
}
