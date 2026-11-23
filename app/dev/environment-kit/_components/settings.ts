import { PreviewTerrainKind } from '@/lib/environment/core/terrain'

/** The diorama island (the world's own coastal tile) or one of the plain test grounds */
export type GroundKind = 'diorama' | PreviewTerrainKind

export type WorkshopSettings = {
  ground: GroundKind
  terrainSeed: number
  /** The asset's turn on the ground (degrees) */
  yaw: number
  wireframe: boolean
  shadows: boolean
  /** The world's finish: ambient occlusion, bloom, tone mapping, vignette */
  finish: boolean
  anchors: boolean
  autoRotate: boolean
  /** The world's lighting rig, adjusted: where the sun is (degrees) and multipliers on its lights */
  sunAzimuth: number
  sunElevation: number
  sunStrength: number
  skyLight: number
  reflections: number
  exposure: number
}

/** The world's lighting rig as it stands (its sun sits at (-14, 24, 15) from its focus) */
export const RIG_SUN = { azimuth: 317, elevation: 49 }

export const DEFAULT_SETTINGS: WorkshopSettings = {
  ground: 'diorama',
  terrainSeed: 3,
  yaw: 0,
  wireframe: false,
  shadows: true,
  finish: true,
  anchors: false,
  autoRotate: false,
  sunAzimuth: RIG_SUN.azimuth,
  sunElevation: RIG_SUN.elevation,
  sunStrength: 1,
  skyLight: 1,
  reflections: 0.8,
  exposure: 1
}
