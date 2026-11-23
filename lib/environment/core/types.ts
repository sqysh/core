import { BufferGeometry, Material } from 'three'
import { GroundAnchor } from './placement'

// The asset library's shared vocabulary. An asset is a recipe: given a seed and a level of detail it builds geometry
// with its materials, and says how it meets the ground. Procedural recipes build their own geometry; a recipe may just
// as well load an optimised GLB and return its meshes, so the library isn't tied to one way of making things.

export type AssetCategory = 'granite' | 'trees' | 'vegetation'

/** high: close-up hero shots; medium: the default for phones; low: distant or many-at-once */
export type Lod = 'high' | 'medium' | 'low'
export const LODS: Lod[] = ['high', 'medium', 'low']
/** A level of detail, or (for assets made from a master model) the master itself, for comparison */
export type Level = Lod | 'original'

export type AssetPart = { geometry: BufferGeometry; material: Material; castShadow?: boolean; receiveShadow?: boolean }

export type AssetBuild = {
  parts: AssetPart[]
  anchor: GroundAnchor
  /** Rough size, for framing the camera (width, height, depth) */
  size: [number, number, number]
  stats: {
    triangles: number
    vertices: number
    buildMs: number
    sourceTriangles?: number
    /** Mean distance from the source's surface, world units */
    error?: number
    notes?: string
    /** For model assets: the file, and what its textures take on the GPU (bytes, mipmaps included) */
    file?: { bytes: number; textureBytes: number; textures: string }
  }
}

/** What a model asset's optimisation produced (from its manifest), for comparing levels with the master */
export type ModelLevelInfo = {
  triangles: number
  vertices: number
  bytes: number
  textures: string
  textureBytes: number
  /** Mean and largest distance between this level's surface and the master's, world units */
  deviation?: { mean: number; max: number }
}
export type ModelInfo = { source: string; original: ModelLevelInfo; levels: Record<Lod, ModelLevelInfo> }

export type AssetRecipe = {
  id: string
  name: string
  category: AssetCategory
  description: string
  /** Planned assets are listed but not built yet */
  status: 'ready' | 'planned'
  /** How many seeded variations to offer in the workshop (any integer seed works) */
  variations: number
  /** Builds a variation at a level of detail (asynchronous: simplification and model loading are) */
  build?: (opts: { seed: number; lod: Lod }) => Promise<AssetBuild>
  /** Assets made from a master model: loads the master as authored, at the same placement, for comparison */
  original?: () => Promise<AssetBuild>
  model?: ModelInfo
}
