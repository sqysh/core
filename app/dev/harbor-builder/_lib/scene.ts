// The harbor scene as a file: every placed model with its full transform, the approved camera, and the reference image
// it's composed against. The builder reads and autosaves it through ./scene (route.ts), so edits survive a refresh,
// and it exports and imports the same JSON. Positions are world units; each model's origin is the middle of the bottom
// of its bounding box, so y = 0 stands it on the water line and rotation and scale turn it about its base.

export type Vec3 = [number, number, number]

export type SceneObject = {
  id: string
  name: string
  /** A model id from the catalog */
  model: string
  /** Its folder in the object list */
  group: string
  position: Vec3
  /** Degrees, applied X then Y then Z */
  rotation: Vec3
  /** Multiplies the model's own size in the world (catalog `size`): [1, 1, 1] is that size */
  scale: Vec3
  visible: boolean
}

/** The approved camera: orthographic, `width` world units across the reference frame (which is `aspect` wide/high) */
export type SceneCamera = {
  azimuth: number
  elevation: number
  target: Vec3
  width: number
  aspect: number
}

export type SceneFile = {
  version: 1
  reference: string
  camera: SceneCamera
  objects: SceneObject[]
}

export const GROUPS = [
  'Terrain',
  'Lighthouse head',
  'Village',
  'The cove',
  'East shore',
  'Paths and stairs',
  'Woodland',
  'Flowers and grasses',
  'Islets and rocks',
  'Other'
] as const

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isVec3 = (v: unknown): v is Vec3 => Array.isArray(v) && v.length === 3 && v.every(isNum)

/** A scene file checked field by field: throws with what's wrong rather than drawing half a scene */
export function parseScene(raw: unknown): SceneFile {
  const s = raw as Partial<SceneFile>
  if (!s || typeof s !== 'object') throw new Error('not an object')
  if (s.version !== 1) throw new Error(`unknown version ${String(s.version)}`)
  if (typeof s.reference !== 'string') throw new Error('reference is not a string')
  const c = s.camera as Partial<SceneCamera> | undefined
  if (!c || !isNum(c.azimuth) || !isNum(c.elevation) || !isVec3(c.target) || !isNum(c.width) || !isNum(c.aspect))
    throw new Error('camera is incomplete')
  if (!Array.isArray(s.objects)) throw new Error('objects is not a list')
  const ids = new Set<string>()
  s.objects.forEach((o: Partial<SceneObject>, i) => {
    const where = `object ${i} (${String(o?.id)})`
    if (!o || typeof o.id !== 'string' || !o.id) throw new Error(`${where}: no id`)
    if (ids.has(o.id)) throw new Error(`${where}: duplicate id`)
    ids.add(o.id)
    if (typeof o.name !== 'string' || typeof o.model !== 'string' || typeof o.group !== 'string')
      throw new Error(`${where}: name, model and group must be strings`)
    if (!isVec3(o.position) || !isVec3(o.rotation) || !isVec3(o.scale)) throw new Error(`${where}: bad transform`)
    if (typeof o.visible !== 'boolean') throw new Error(`${where}: visible must be true or false`)
  })
  return s as SceneFile
}

/** A new id for a copy or an added model, unlike any in the scene */
export function freshId(base: string, taken: Iterable<string>) {
  const used = new Set(taken)
  const stem = base.replace(/-\d+$/, '')
  for (let n = 1; ; n++) {
    const id = `${stem}-${n}`
    if (!used.has(id)) return id
  }
}
