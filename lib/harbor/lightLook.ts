
/**
 * The harbor's lighting and colour-grade values (the light rig itself is the shared StudioLighting, used by the Garage
 * and the phones too). APPROVED_LIGHT is the approved look; the launch screen builds its own from it.
 */
const TONE_MAPPINGS = ['NEUTRAL', 'ACES_FILMIC', 'AGX', 'CINEON', 'UNCHARTED2', 'REINHARD2'] as const
type ToneMap = (typeof TONE_MAPPINGS)[number]

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

/** The sun's position as a unit direction from its focus */
export function sunDirection(azimuth: number, elevation: number) {
  const az = azimuth / DEG
  const el = elevation / DEG
  return { x: Math.cos(el) * Math.cos(az), y: Math.sin(el), z: Math.cos(el) * Math.sin(az) }
}
