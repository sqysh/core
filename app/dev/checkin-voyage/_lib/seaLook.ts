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
  /** Speed of the surface's flow (1 = a gentle drift; the fine ripples stream along the wind) and how much the flow wanders (breaks up the repeating pattern) */
  flowSpeed: 1.6,
  flowWarp: 1.8,
  /** Rolling waves: slope strength and speed of the broad directional ripples */
  waveSlope: 1.0,
  waveSpeed: 1.0,
  /** How fast the sun's glints shimmer across the patches */
  glintSpeed: 0.35,
  /** Underwater caustics: brightness and speed, independent of the surface */
  causticStrength: 0.06,
  causticSpeed: 0.55,
  /** How far submerged sand shifts to turquoise with depth (0-1), and how irregular the underwater shelf is (world units) */
  sandTurquoise: 0.6,
  shelfIrregularity: 1.1,
  /** Fine surface texture / normal intensity (the diorama's was 1; 0.4 is 60% calmer) */
  fineRipple: 0.4,
  /** Large, soft, directional ripples: slope strength, and the wavelength scale (bigger = broader) */
  broadRipple: 1.0,
  broadScale: 1.0,
  /** Sun glints: 1 = every ripple sparkles, lower = only where a broad patch catches the sun; patch size in world units */
  sparkleStrength: 1.0,
  sparkleSelect: 0.7,
  sparklePatch: 9.0,
  /** Broad colour variation across the open sea (0 = none) and its size in world units */
  tintVariation: 0.3,
  tintScale: 22.0,
  /** Distance over which shallow turns to deep: shore distance (colour) and real depth (colour, clarity) */
  shoreBlend: [0.0, 2.8] as const,
  depthBlend: [1.5, 9.0] as const,
  clarityDepth: 3.4
}

