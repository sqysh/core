/** Look of the water: tune here. Strengths are multipliers on the diorama's original values (1 = as the diorama). */
import { Color, MeshStandardMaterial } from 'three'

/** The live-tunable parameters (the dev panel drives these; they are shader uniforms, so changes apply instantly) */
export const SEA_DEFAULTS = {
  waveSpeed: 0.2,
  waveHeight: 1.4,
  waveFrequency: 0.65,
  /** degrees the three wave systems are turned together */
  waveDirection: -62,
  textureIntensity: 0.29,
  normalStrength: 0.95,
  reflection: 0.9,
  sparkle: 1.6,
  roughness: 0.34,
  shallowColor: '#8fe0d4',
  deepColor: '#168292',
  transparency: 1,
  /** depth over which the sea floor stays visible */
  sandVisibility: 4.4,
  caustic: 0.08,
  foam: 1.05
}
export type SeaParams = typeof SEA_DEFAULTS

const u = <T,>(value: T) => ({ value })
/** The shader's uniform objects, shared by every sea material and the sea floor */
export const seaUniforms = {
  uWaveSpeed: u(1),
  uWaveHeight: u(1),
  uWaveFreq: u(1),
  uWaveDir: u(0),
  uTexture: u(0.25),
  uNormal: u(1),
  uReflect: u(1),
  uSparkle: u(1),
  uOpacity: u(1),
  uClarity: u(3.4),
  uCaus: u(0.06),
  uFoamAmt: u(1),
  uGlass: u(new Color()),
  uShallow: u(new Color()),
  uBlue: u(new Color()),
  uDeep: u(new Color())
}
export const seaRefs: { water: MeshStandardMaterial | null } = { water: null }

export function applySea(p: SeaParams) {
  seaUniforms.uWaveSpeed.value = p.waveSpeed
  seaUniforms.uWaveHeight.value = p.waveHeight
  seaUniforms.uWaveFreq.value = p.waveFrequency
  seaUniforms.uWaveDir.value = (p.waveDirection * Math.PI) / 180
  seaUniforms.uTexture.value = p.textureIntensity
  seaUniforms.uNormal.value = p.normalStrength
  seaUniforms.uReflect.value = p.reflection
  seaUniforms.uSparkle.value = p.sparkle
  seaUniforms.uOpacity.value = p.transparency
  seaUniforms.uClarity.value = p.sandVisibility
  seaUniforms.uCaus.value = p.caustic
  seaUniforms.uFoamAmt.value = p.foam
  seaUniforms.uShallow.value.set(p.shallowColor)
  seaUniforms.uGlass.value.set(p.shallowColor).lerp(new Color('#ffffff'), 0.2)
  seaUniforms.uDeep.value.set(p.deepColor).lerp(new Color('#000a24'), 0.12)
  seaUniforms.uBlue.value.set(p.deepColor)
  if (seaRefs.water) seaRefs.water.roughness = p.roughness
}
applySea(SEA_DEFAULTS)

export const SEA_LOOK = {
  /** How fast the sun's glints shimmer across the patches */
  glintSpeed: 0.35,
  /** Underwater caustics: their speed, independent of the surface */
  causticSpeed: 0.55,
  /** How far submerged sand shifts to turquoise with depth (0-1), and how irregular the underwater shelf is (world units) */
  sandTurquoise: 0.9,
  /** Texture of the submerged sand: ripple ridges, mottling and speckle (0 = none, 1 = as set here, 2 = double) */
  sandTexture: 1.0,
  /** Texture on the land: grass mottling and blade streaks, dirt speckle, dune ripples on dry sand (0 = none, 2 = double) */
  landTexture: 1.0,
  /** Opacity of the water right over the sand (lower = more see-through, but more of the sand's own colour) */
  shallowAlpha: 0.34,
  /** Submerged sand: how quickly it cools from tan to aqua with depth (world units of depth) */
  sandCoolDepth: [0.08, 1.4] as const,
  shelfIrregularity: 1.1,
  /** Size of the patches the sun's glints come and go in, in world units */
  sparklePatch: 9.0,
  /** Broad colour variation across the open sea (0 = none) and its size in world units */
  tintVariation: 0.3,
  tintScale: 22.0,
  /** Distance over which shallow turns to deep: shore distance (colour) and real depth (colour, clarity) */
  shoreBlend: [0.0, 2.8] as const,
  depthBlend: [1.5, 9.0] as const
}

