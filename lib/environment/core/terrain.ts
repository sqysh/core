import { Vector3 } from 'three'
import { fbm3, smoothstep } from './noise'

// Terrain sampling: the one interface every asset uses to find the ground. Any terrain (the workshop's test grounds
// now, the CORE world's own coast later) is wrapped as a TerrainSampler, and placement reads heights and slopes from
// it rather than from the mesh, so assets sit the same way whatever the terrain's resolution.

export type TerrainSampler = {
  /** Ground height at a point */
  height: (x: number, z: number) => number
  /** The ground's upward normal at a point (written into `out`) */
  normal: (x: number, z: number, out?: Vector3) => Vector3
  /** Height of the water surface, or null where there is none */
  seaLevel: number | null
}

/** Builds a sampler from a height function, with normals from its slope */
export function samplerFrom(height: (x: number, z: number) => number, seaLevel: number | null, eps = 0.05): TerrainSampler {
  return {
    height,
    seaLevel,
    normal: (x, z, out = new Vector3()) =>
      out.set(height(x - eps, z) - height(x + eps, z), 2 * eps, height(x, z - eps) - height(x, z + eps)).normalize()
  }
}

export type PreviewTerrainKind = 'flat' | 'uneven' | 'shoreline'

/**
 * The workshop's test grounds. `uneven` is rolling, broken ground for checking that assets settle into slopes and
 * hollows; `shoreline` falls away toward +z into water at y = 0, for rocks that should sit partly in the sea.
 */
export function previewTerrain(kind: PreviewTerrainKind, seed = 3): TerrainSampler {
  if (kind === 'flat') return samplerFrom(() => 0, null)
  if (kind === 'uneven')
    return samplerFrom(
      (x, z) => 0.55 * fbm3(x * 0.18, 0, z * 0.18, seed, 4) + 0.12 * fbm3(x * 0.9, 1, z * 0.9, seed + 5, 3) + 0.03 * x,
      null
    )
  return samplerFrom((x, z) => {
    // a beach and ledge shelf sloping down into the water, with a little relief along the shore
    // the waterline falls at about z = 1.8, against the seaward toe of an asset placed at the origin
    const slope = 0.62 - 0.34 * z - 0.05 * Math.max(0, z - 2) ** 2
    const relief = 0.22 * fbm3(x * 0.25, 0, z * 0.25, seed, 4) + 0.06 * fbm3(x * 1.1, 2, z * 1.1, seed + 3, 3)
    return slope + relief * (1 - 0.6 * smoothstep(1, 4, z))
  }, 0)
}
