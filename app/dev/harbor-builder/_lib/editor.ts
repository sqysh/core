import { DoubleSide, Euler, Matrix4, Mesh, Quaternion, Ray, Raycaster, Sphere, Vector3 } from 'three'
import { acceleratedRaycast, MeshBVH } from 'three-mesh-bvh'
import { isCoast, isGround, ModelDef, modelById, SINK } from './catalog'
import { groundAt, LandPiece } from './ground'
import { landBVH, LoadedModel } from './models'
import { SceneCamera, SceneObject, Vec3 } from './scene'

// How a scene object becomes a drawn model: the model's own size in the world (catalog size over its measured box),
// its origin moved to the middle of its base, and the object's transform on top. And the editor's use of that: the
// ground under a point, dropping a model onto it, and the land the sea's shallows are baked from.

const DEG = Math.PI / 180

/** Scale that takes the model as exported to its catalog size */
export function baseScale(model: LoadedModel, def: ModelDef) {
  const s = model.box.getSize(new Vector3())
  return def.size / (def.by === 'height' ? s.y : Math.max(s.x, s.z))
}

/** The model's offset inside its object: the middle of its box's base moved to the origin */
export function pivotOffset(model: LoadedModel): Vec3 {
  const b = model.box
  return [-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2]
}

/** The object's own transform (what the gizmo moves), as a matrix */
export function objectMatrix(o: Pick<SceneObject, 'position' | 'rotation' | 'scale'>, base: number) {
  return new Matrix4().compose(
    new Vector3(...o.position),
    new Quaternion().setFromEuler(new Euler(o.rotation[0] * DEG, o.rotation[1] * DEG, o.rotation[2] * DEG)),
    new Vector3(o.scale[0] * base, o.scale[1] * base, o.scale[2] * base)
  )
}

/** Model space to world: the object's transform after the pivot offset */
export function modelMatrix(o: SceneObject, model: LoadedModel, def: ModelDef) {
  return objectMatrix(o, baseScale(model, def)).multiply(new Matrix4().makeTranslation(...pivotOffset(model)))
}

export type Models = Record<string, LoadedModel | undefined>

/** Visible, loaded objects as land pieces (`which` picks ground for standing on, or coast for the sea) */
export function landOf(objects: SceneObject[], models: Models, which: (d: ModelDef) => boolean, except?: string) {
  const out: LandPiece[] = []
  for (const o of objects) {
    const def = modelById(o.model)
    const model = models[o.model]
    if (!o.visible || !def || !model || o.id === except || !which(def)) continue
    const matrix = modelMatrix(o, model, def)
    out.push({ model, transform: { matrix, inverse: matrix.clone().invert() } })
  }
  return out
}

export const coastOf = (objects: SceneObject[], models: Models) => landOf(objects, models, isCoast)

/**
 * Where "Drop to ground" puts an object: its base on the highest ground under its middle (the land, islets and paths,
 * not itself), sunk by its kind's share of its height so grass pads and footings don't show their edges. Null over
 * open water.
 */
export function droppedPosition(o: SceneObject, objects: SceneObject[], models: Models): Vec3 | null {
  const def = modelById(o.model)
  const model = models[o.model]
  if (!def || !model) return null
  const ground = groundAt(landOf(objects, models, isGround, o.id), o.position[0], o.position[2])
  if (ground === null) return null
  const height = (model.box.max.y - model.box.min.y) * baseScale(model, def) * o.scale[1]
  return [o.position[0], +(ground - height * SINK[def.kind]).toFixed(3), o.position[2]]
}

const sight = new Ray()
const localSight = new Ray()
const hit = new Vector3()

/**
 * Where an object stands if it's to show where it does now in the approved view: the first land (not itself) along
 * the camera's line of sight through its origin, sunk as "Drop to ground" sinks it. For composing against the
 * reference: a tree placed by the pixel it should stand on lands on the ground the camera sees at that pixel.
 */
export function settledPosition(o: SceneObject, objects: SceneObject[], models: Models, cam: SceneCamera): Vec3 | null {
  const def = modelById(o.model)
  const model = models[o.model]
  if (!def || !model) return null
  const az = cam.azimuth * DEG
  const el = cam.elevation * DEG
  const toCamera = new Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az))
  sight.origin.set(...o.position).addScaledVector(toCamera, 300)
  sight.direction.copy(toCamera).negate()
  let best: Vector3 | null = null
  let bestDistance = Infinity
  for (const { transform, model: m } of landOf(objects, models, isGround, o.id)) {
    localSight.copy(sight).applyMatrix4(transform.inverse)
    if (!localSight.intersectsBox(m.box)) continue
    const h = landBVH(m).raycastFirst(localSight, DoubleSide)
    if (!h) continue
    hit.copy(h.point).applyMatrix4(transform.matrix)
    const d = hit.distanceTo(sight.origin)
    if (d < bestDistance) {
      bestDistance = d
      best = hit.clone()
    }
  }
  if (!best) return null
  const height = (model.box.max.y - model.box.min.y) * baseScale(model, def) * o.scale[1]
  return [+best.x.toFixed(3), +(best.y - height * SINK[def.kind]).toFixed(3), +best.z.toFixed(3)]
}

/** The camera's zoom that fits the reference frame in a viewport (the frame is centred, letterboxed like the overlay) */
export const frameZoom = (cam: SceneCamera, w: number, h: number) => Math.min(w / cam.width, h / (cam.width / cam.aspect))

const sphere = new Sphere()

/**
 * Picking a model: three-mesh-bvh's raycast, its BVH built the first time a ray reaches the model's bounds (a brute
 * force raycast over a million-triangle Meshy model takes a noticeable moment; the BVH makes every later one instant).
 */
export function pickRaycast(this: Mesh, raycaster: Raycaster, intersects: Parameters<Mesh['raycast']>[1]) {
  const g = this.geometry
  if (!g.boundsTree) {
    if (!g.boundingSphere) g.computeBoundingSphere()
    sphere.copy(g.boundingSphere!).applyMatrix4(this.matrixWorld)
    if (!raycaster.ray.intersectsSphere(sphere)) return
    g.boundsTree = new MeshBVH(g)
  }
  acceleratedRaycast.call(this, raycaster, intersects)
}
