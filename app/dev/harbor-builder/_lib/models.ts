import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  InterleavedBufferAttribute,
  Material,
  Mesh,
  MeshStandardMaterial,
  Texture,
  Vector3
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { MeshBVH } from 'three-mesh-bvh'

// Loading the builder's GLBs exactly as they are on disk: each file once, its geometry and material shared by every
// placement of it. On load the model's real bounding box is measured (that's what its size in the world is scaled
// from), and what it costs is counted. Land gets a BVH, so trees and the cottage can find the ground on it.
//
// The one material change is nondestructive and can be switched off: Meshy exports its roughness/metal maps with the
// metal factor at 1 and a slightly noisy metal channel, and some maps run glossy, which reads as plastic under the
// world's light. "Less gloss" takes metal to 0, keeps roughness at or above a floor, and turns reflections down.

export type LoadedModel = {
  geometry: BufferGeometry
  material: Material
  /** The model's bounding box as exported (for a derivative, its original's): what it's sized and placed by */
  box: Box3
  /** Where it meets the ground: the middle (x, z) of its lowest slice (a leaning tree's trunk, not its box's middle) */
  base: { x: number; z: number }
  triangles: number
  vertices: number
  /** The textures' size: as files, and on the GPU (RGBA8 with mipmaps) */
  textureFileBytes: number
  textureGpuBytes: number
  textures: string[]
  bytes: number
  loadMs: number
  bvh?: MeshBVH
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
const cache = new Map<string, Promise<LoadedModel>>()

// A few files at a time. Each full-quality model unpacks three or four large images (up to 4096 px, 64 MB each as
// pixels); started all at once, a scene's worth of them can exhaust the decoder for a moment, and GLTFLoader then
// leaves the failed map off the material without failing the load: the model draws white. So loads take turns, each
// is checked for the maps its file gives it, and one that came up short is loaded again on its own, once the rest
// have finished.
const AT_ONCE = 3
let running = 0
let alone = false
const waiting: { go: () => void; alone: boolean }[] = []
function next() {
  while (waiting.length && !alone) {
    const turn = waiting[0]
    if (turn.alone ? running > 0 : running >= AT_ONCE) return
    waiting.shift()
    running++
    alone = turn.alone
    turn.go()
  }
}
async function inTurn<T>(job: () => Promise<T>, byItself = false, first = false): Promise<T> {
  await new Promise<void>((go) => {
    if (first) waiting.unshift({ go, alone: byItself })
    else waiting.push({ go, alone: byItself })
    next()
  })
  try {
    return await job()
  } finally {
    running--
    if (byItself) alone = false
    next()
  }
}

type GltfJson = {
  materials?: {
    pbrMetallicRoughness?: { baseColorTexture?: unknown; metallicRoughnessTexture?: unknown }
    normalTexture?: unknown
    emissiveTexture?: unknown
  }[]
}

/** The maps the file gives its material that didn't arrive on it */
function missingMaps(json: GltfJson, material: MeshStandardMaterial) {
  const declared = json.materials?.[0]
  if (!declared) return []
  const missing: string[] = []
  if (declared.pbrMetallicRoughness?.baseColorTexture && !material.map) missing.push('base colour')
  if (declared.pbrMetallicRoughness?.metallicRoughnessTexture && !material.roughnessMap) missing.push('roughness')
  if (declared.normalTexture && !material.normalMap) missing.push('normal')
  if (declared.emissiveTexture && !material.emissiveMap) missing.push('emissive')
  return missing
}

/** Every material the builder loaded, for switching the gloss reduction */
const loadedMaterials = new Set<MeshStandardMaterial>()
const MIN_ROUGHNESS = { value: 0.62 }

function rememberOriginal(m: MeshStandardMaterial) {
  m.userData.original ??= { metalness: m.metalness, roughness: m.roughness, envMapIntensity: m.envMapIntensity }
  // a roughness floor, applied in the shader after the roughness map (0 leaves the material as exported)
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uMinRough = m.userData.minRough
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uMinRough;')
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = max(roughnessFactor, uMinRough);'
      )
  }
  m.userData.minRough = { value: 0 }
  m.customProgramCacheKey = () => 'harbor-builder-min-rough'
}

/** Less gloss on (true) or every material back as exported (false) */
export function setLessGloss(on: boolean) {
  for (const m of loadedMaterials) {
    const o = m.userData.original
    m.metalness = on ? 0 : o.metalness
    m.envMapIntensity = on ? 0.55 : o.envMapIntensity
    m.userData.minRough.value = on ? MIN_ROUGHNESS.value : 0
  }
}

const imageBytes = (t: Texture | null) => {
  const img = t?.image as { width?: number; height?: number } | undefined
  return img?.width && img?.height ? { w: img.width, h: img.height } : null
}

/** An attribute as plain floats */
function toFloat(attr: BufferAttribute | InterleavedBufferAttribute) {
  const out = new Float32Array(attr.count * attr.itemSize)
  for (let i = 0; i < attr.count; i++)
    for (let c = 0; c < attr.itemSize; c++) out[i * attr.itemSize + c] = attr.getComponent(i, c)
  return new BufferAttribute(out, attr.itemSize)
}

export function loadModel(
  url: string,
  lessGloss: boolean,
  onProgress?: (loaded: number, total: number) => void
): Promise<LoadedModel> {
  const hit = cache.get(url)
  if (hit) return hit
  const started = performance.now()
  let bytes = 0
  const fetchIt = () =>
    loader.loadAsync(url, (e) => {
      bytes = e.total || e.loaded
      onProgress?.(e.loaded, e.total)
    })
  const short = (gltf: Awaited<ReturnType<typeof fetchIt>>) => {
    let material: MeshStandardMaterial | undefined
    gltf.scene.traverse((o) => {
      if ((o as Mesh).isMesh) material ??= (o as Mesh).material as MeshStandardMaterial
    })
    return material ? missingMaps(gltf.parser.json as GltfJson, material) : []
  }
  // the reduced meshes go to the front of the queue: they're a few hundred kB each, and with them in hand a model
  // is drawn at the detail its size on screen calls for from the moment its full file arrives
  const promise = inTurn(fetchIt, false, url.includes('/environment-derived/lod/'))
    .then(async (first) => {
      let gltf = first
      for (let again = 0; again < 3 && short(gltf).length; again++) {
        console.warn(`${url}: its ${short(gltf).join(', ')} map didn't load; loading it again on its own`)
        gltf = await inTurn(fetchIt, true)
      }
      if (short(gltf).length) throw new Error(`its ${short(gltf).join(', ')} map failed to load`)
      return gltf
    })
    .then((gltf) => {
      const meshes: Mesh[] = []
      gltf.scene.updateMatrixWorld(true)
      gltf.scene.traverse((o) => {
        if ((o as Mesh).isMesh) meshes.push(o as Mesh)
      })
      if (meshes.length !== 1) console.warn(`${url}: ${meshes.length} meshes; the builder draws the first`)
      const mesh = meshes[0]
      // quantised derivatives (the cleaned models) store normalised integers, dequantised by their node's transform:
      // turn them back into floats before baking that transform in
      const geometry = (mesh.geometry as BufferGeometry).clone()
      for (const name of ['position', 'normal', 'tangent']) {
        const attr = geometry.getAttribute(name)
        if (
          attr &&
          (attr.normalized ||
            !(attr.array instanceof Float32Array) ||
            (attr as InterleavedBufferAttribute).isInterleavedBufferAttribute)
        )
          geometry.setAttribute(name, toFloat(attr))
      }
      geometry.applyMatrix4(mesh.matrixWorld)
      geometry.computeBoundingBox()
      // a derivative carries its original's bounds: it's sized and placed by those, so it matches the original exactly
      const source = (mesh.userData.sourceBounds ?? gltf.scene.userData.sourceBounds) as
        { min: number[]; max: number[] } | undefined
      const sizingBox = source
        ? new Box3().set(new Vector3(...source.min), new Vector3(...source.max))
        : geometry.boundingBox!.clone()
      geometry.computeBoundingSphere()
      const material = mesh.material as MeshStandardMaterial
      rememberOriginal(material)
      loadedMaterials.add(material)
      setLessGloss(lessGloss)
      const maps = [
        material.map,
        material.normalMap,
        material.roughnessMap,
        material.metalnessMap,
        material.aoMap,
        material.emissiveMap
      ]
      const unique = [...new Set(maps.filter(Boolean))] as Texture[]
      for (const t of unique) t.anisotropy = 8
      let textureGpuBytes = 0
      const textures: string[] = []
      for (const t of unique) {
        const d = imageBytes(t)
        if (!d) continue
        textureGpuBytes += d.w * d.h * 4 * (4 / 3)
        textures.push(`${d.w}`)
      }
      // what the GLB holds as image files
      const textureFileBytes = (gltf.parser.json.bufferViews ?? [])
        .filter((_: unknown, i: number) =>
          (gltf.parser.json.images ?? []).some((im: { bufferView?: number }) => im.bufferView === i)
        )
        .reduce((n: number, bv: { byteLength: number }) => n + bv.byteLength, 0)
      // the middle of its lowest 2%
      const pos = geometry.getAttribute('position')
      const box = geometry.boundingBox!
      const floor = box.min.y + (box.max.y - box.min.y) * 0.02
      let bx = 0
      let bz = 0
      let bn = 0
      for (let i = 0; i < pos.count; i++)
        if (pos.getY(i) <= floor) {
          bx += pos.getX(i)
          bz += pos.getZ(i)
          bn++
        }
      const index = geometry.getIndex()
      return {
        base: bn ? { x: bx / bn, z: bz / bn } : { x: 0, z: 0 },
        geometry,
        material,
        box: sizingBox,
        triangles: (index ? index.count : geometry.getAttribute('position').count) / 3,
        vertices: geometry.getAttribute('position').count,
        textureFileBytes,
        textureGpuBytes,
        textures,
        bytes,
        loadMs: Math.round(performance.now() - started)
      }
    })
  cache.set(url, promise)
  promise.catch(() => cache.delete(url))
  return promise
}

/** A BVH over a model's surface, for finding the ground and picking it (built once, on first use) */
export function landBVH(model: LoadedModel) {
  model.bvh ??= model.geometry.boundsTree ?? new MeshBVH(model.geometry)
  model.geometry.boundsTree = model.bvh
  return model.bvh
}
