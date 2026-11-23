import { BufferAttribute, BufferGeometry, InterleavedBufferAttribute, Material, Mesh, MeshStandardMaterial, Texture } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { ringFootprint } from '../core/placement'
import { AssetBuild, AssetCategory, AssetRecipe, Lod, LODS, ModelInfo, ModelLevelInfo } from '../core/types'

// Assets made from a master model (a Meshy GLB, say) rather than modelled in code. scripts/environment/optimize-glb.mjs
// turns the master into a GLB per level of detail, normalised (a rock's footprint, or a tree's or shrub's height, is 1
// unit) and anchored where it meets the ground (a tree at its trunk), and writes a manifest of what each level costs,
// how far it strays from the master and where its base is. A model recipe loads a level, scales it to its size in the
// world and grounds it like any other asset. In development the master itself can be loaded, read-only, for comparison.

/** The manifest optimize-glb.mjs writes beside the levels */
export type ModelManifest = {
  id: string
  master: { bytes: number; triangles: number; vertices: number; textures: { slot: string; width: number; height: number; bytes: number }[] }
  normalisation: {
    scale: number
    offset: number[]
    size: number[]
    /** Where it meets the ground (x, z from the origin, and its reach either way); older manifests leave it out */
    base?: { center: number[]; reach: number[] }
  }
  lods: Record<
    Lod,
    {
      file: string
      bytes: number
      triangles: number
      vertices: number
      textures: { slot: string; width?: number; height?: number; dropped?: boolean }[]
      gpuTextureBytes: number
      deviation: { masterToLod: { mean: number; max: number }; lodToMaster: { mean: number; max: number } }
    }
  >
}

export type ModelAssetSpec = {
  id: string
  name: string
  category: AssetCategory
  description: string
  manifest: ModelManifest
  /** Where the levels are served from (public/…) */
  path: string
  /** Where development serves the master from, if it can be compared */
  masterUrl?: string
  /** Its size in the world: the length of its normalised unit (a rock's footprint, a tree's or shrub's height) */
  worldSize: number
  /** How far it sinks below the ground its footprint stands on */
  embed: number
  /** Footprint ring, as fractions of its base's reach (or, without a measured base, of its half-width and half-depth) */
  ring?: number
  /** Most it may lean to follow the ground: rocks settle into a slope, trees grow straight up */
  maxTilt?: number
}

let loader: GLTFLoader | null = null
function gltfLoader() {
  if (!loader) {
    loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
  }
  return loader
}

/** GPU bytes for a set of RGBA8 textures with mipmaps */
const gpuBytes = (textures: { width: number; height: number }[]) => textures.reduce((n, t) => n + t.width * t.height * 4 * (4 / 3), 0)
const textureList = (textures: { slot: string; width?: number; dropped?: boolean }[]) =>
  textures.map((t) => (t.dropped ? `${t.slot} (constant)` : `${t.slot} ${t.width}`)).join(' · ')

/** An attribute as plain floats (quantised ones are stored as normalised integers, which can't be transformed in place) */
function toFloat(attr: BufferAttribute | InterleavedBufferAttribute) {
  const out = new Float32Array(attr.count * attr.itemSize)
  for (let i = 0; i < attr.count; i++) for (let c = 0; c < attr.itemSize; c++) out[i * attr.itemSize + c] = attr.getComponent(i, c)
  return new BufferAttribute(out, attr.itemSize)
}

/** Loads a GLB's one mesh as a part, scaled (and for a master, first re-anchored) into world units */
async function loadPart(url: string, transform: (g: BufferGeometry) => void) {
  const gltf = await gltfLoader().loadAsync(url)
  let mesh: Mesh | null = null
  gltf.scene.traverse((o) => {
    if (!mesh && (o as Mesh).isMesh) mesh = o as Mesh
  })
  if (!mesh) throw new Error(`${url} has no mesh`)
  const { geometry, material } = mesh as Mesh<BufferGeometry, Material>
  // quantised levels carry their dequantisation on the node: bake it (and any other node transform) into the geometry
  gltf.scene.updateMatrixWorld(true)
  for (const name of ['position', 'normal', 'tangent']) {
    const attr = geometry.getAttribute(name)
    if (attr && (attr.normalized || !(attr.array instanceof Float32Array) || (attr as InterleavedBufferAttribute).isInterleavedBufferAttribute))
      geometry.setAttribute(name, toFloat(attr))
  }
  geometry.applyMatrix4((mesh as Mesh).matrixWorld)
  transform(geometry)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  // sharper textures at the low, raking angles of the isometric camera
  const std = material as MeshStandardMaterial
  for (const t of [std.map, std.normalMap, std.roughnessMap, std.metalnessMap] as (Texture | null)[]) if (t) t.anisotropy = 8
  return { geometry, material, castShadow: true, receiveShadow: true }
}

const trianglesOf = (g: BufferGeometry) => (g.index ? g.index.count : g.getAttribute('position').count) / 3

export function modelRecipe(spec: ModelAssetSpec): AssetRecipe {
  const m = spec.manifest
  const k = spec.worldSize
  const size: [number, number, number] = [m.normalisation.size[0] * k, m.normalisation.size[1] * k, m.normalisation.size[2] * k]
  const ring = spec.ring ?? 0.72
  const base = m.normalisation.base
  const footprint = base
    ? ringFootprint(base.reach[0] * k * ring, base.reach[1] * k * ring, 12).map(([x, z]) => [x + base.center[0] * k, z + base.center[1] * k] as [number, number])
    : ringFootprint((size[0] / 2) * ring, (size[2] / 2) * ring, 12)
  const anchor = { footprint, embed: spec.embed, maxTilt: spec.maxTilt ?? 0.06 }

  const levelInfo = (lod: Lod): ModelLevelInfo => {
    const l = m.lods[lod]
    return {
      triangles: l.triangles,
      vertices: l.vertices,
      bytes: l.bytes,
      textures: textureList(l.textures),
      textureBytes: l.gpuTextureBytes,
      deviation: { mean: l.deviation.masterToLod.mean * k, max: Math.max(l.deviation.masterToLod.max, l.deviation.lodToMaster.max) * k }
    }
  }
  const original: ModelLevelInfo = {
    triangles: m.master.triangles,
    vertices: m.master.vertices,
    bytes: m.master.bytes,
    textures: m.master.textures.map((t) => `${t.slot} ${t.width}`).join(' · '),
    textureBytes: Math.round(gpuBytes(m.master.textures))
  }
  const model: ModelInfo = {
    source: 'Meshy master',
    original,
    levels: Object.fromEntries(LODS.map((l) => [l, levelInfo(l)])) as Record<Lod, ModelLevelInfo>
  }

  const finish = (part: Awaited<ReturnType<typeof loadPart>>, info: ModelLevelInfo, started: number): AssetBuild => ({
    parts: [part],
    anchor,
    size,
    stats: {
      triangles: trianglesOf(part.geometry),
      vertices: part.geometry.getAttribute('position').count,
      buildMs: Math.round(performance.now() - started),
      sourceTriangles: m.master.triangles,
      error: info.deviation?.mean,
      file: { bytes: info.bytes, textureBytes: info.textureBytes, textures: info.textures }
    }
  })

  return {
    id: spec.id,
    name: spec.name,
    category: spec.category,
    description: spec.description,
    status: 'ready',
    variations: 1,
    model,
    build: async ({ lod }) => {
      const started = performance.now()
      const part = await loadPart(`${spec.path}/${m.lods[lod].file}`, (g) => g.scale(k, k, k))
      return finish(part, model.levels[lod], started)
    },
    original: spec.masterUrl
      ? async () => {
          const started = performance.now()
          const [ox, oy, oz] = m.normalisation.offset
          const s = m.normalisation.scale * k
          const part = await loadPart(spec.masterUrl!, (g) => g.translate(ox, oy, oz).scale(s, s, s))
          return finish(part, original, started)
        }
      : undefined
  }
}
