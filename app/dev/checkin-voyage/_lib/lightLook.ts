import { useSyncExternalStore } from 'react'

/**
 * Lighting and colour grading of the harbor, tuned live from the Lighting panel (like the sea's, seaLook.ts). The
 * lights themselves live in the shared StudioLighting rig (also used by the Garage and the phones), which is left
 * exactly as it is: LightingGrade adjusts this scene's own copies of those lights from these values.
 *
 * APPROVED_LIGHT is the configuration the scene had before this was added; Reset restores it exactly. GOLDEN_LIGHT is
 * the warmer, richer experimental proposal, one click away in the panel (the scene starts on the approved look).
 */
export const TONE_MAPPINGS = ['NEUTRAL', 'ACES_FILMIC', 'AGX', 'CINEON', 'UNCHARTED2', 'REINHARD2'] as const
export type ToneMap = (typeof TONE_MAPPINGS)[number]

export type LightParams = {
  /** A gain on every light (sun, fill, sky and reflections), before tone mapping: how bright the world is */
  exposure: number
  sunColor: string
  sunIntensity: number
  /** Where the sun is: compass angle round the scene (°) and height above the horizon (°) */
  sunAzimuth: number
  sunElevation: number
  /** Edge blur of the sun's shadows */
  shadowSoftness: number
  skyColor: string
  groundColor: string
  /** The sky-to-ground ambient light */
  ambient: number
  fillColor: string
  fillIntensity: number
  /** Soft reflections on paint, glass and water */
  reflections: number
  /** Contact shadows where things meet the ground */
  aoIntensity: number
  aoRadius: number
  bloom: number
  bloomThreshold: number
  tone: ToneMap
  /** Grading after tone mapping: all 0 changes nothing */
  saturation: number
  contrast: number
  brightness: number
  vignette: number
}

/** Directions of the shared rig's sun, as it is set up in StudioLighting: offset (-14, 24, 15) from its focus */
const SUN_OFFSET = { x: -14, y: 24, z: 15 }
const DEG = 180 / Math.PI

export const APPROVED_LIGHT: LightParams = {
  exposure: 1,
  sunColor: '#ffdcb2',
  sunIntensity: 3.7,
  sunAzimuth: Math.atan2(SUN_OFFSET.z, SUN_OFFSET.x) * DEG,
  sunElevation: Math.atan2(SUN_OFFSET.y, Math.hypot(SUN_OFFSET.x, SUN_OFFSET.z)) * DEG,
  shadowSoftness: 10,
  skyColor: '#c4dcf2',
  groundColor: '#6a5a4a',
  ambient: 1.15,
  fillColor: '#8fb4e6',
  fillIntensity: 0.55,
  reflections: 0.8,
  aoIntensity: 2.3,
  aoRadius: 0.7,
  bloom: 0.45,
  bloomThreshold: 0.95,
  tone: 'NEUTRAL',
  saturation: 0,
  contrast: 0,
  brightness: 0,
  vignette: 0.18
}

/** Warmer, golden sun lower in the sky (longer, softer shadows), a deeper sky against warm bounce light, a little more colour */
export const GOLDEN_LIGHT: LightParams = {
  ...APPROVED_LIGHT,
  exposure: 1.05,
  sunColor: '#ffc680',
  sunIntensity: 4.1,
  sunAzimuth: APPROVED_LIGHT.sunAzimuth + 8,
  sunElevation: 40,
  shadowSoftness: 12,
  skyColor: '#a9c9ee',
  groundColor: '#8a6a47',
  ambient: 0.95,
  fillColor: '#7ea4e0',
  fillIntensity: 0.5,
  reflections: 0.75,
  aoIntensity: 2.6,
  saturation: 0.12,
  contrast: 0.05,
  vignette: 0.2
}

let current: LightParams = { ...APPROVED_LIGHT }
let version = 0
const listeners = new Set<() => void>()

export const getLight = () => current
export const lightVersion = () => version
export function setLight(patch: Partial<LightParams>) {
  current = { ...current, ...patch }
  version++
  listeners.forEach((l) => l())
}
export const useLight = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getLight,
    getLight
  )

/** The sun's position as a unit direction from its focus */
export function sunDirection(azimuth: number, elevation: number) {
  const az = azimuth / DEG
  const el = elevation / DEG
  return { x: Math.cos(el) * Math.cos(az), y: Math.sin(el), z: Math.cos(el) * Math.sin(az) }
}
