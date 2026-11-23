import { APPROVED_LIGHT, LightParams } from '@/app/dev/checkin-voyage/_lib/lightLook'
import { SEA_DEFAULTS, SeaParams } from '@/app/dev/checkin-voyage/_lib/seaLook'

// The launch screen's own look: warmer, lower sun, richer colour and a brighter, more inviting sea. These are applied
// to this scene's own lights and, for the sea, only while the screen is mounted (see LaunchLook); the Check-in Voyage's
// approved values are never edited.

export const LAUNCH_LIGHT: LightParams = {
  ...APPROVED_LIGHT,
  exposure: 1.2,
  sunColor: '#ffbd6a',
  sunIntensity: 4.6,
  sunAzimuth: APPROVED_LIGHT.sunAzimuth + 10,
  sunElevation: 36,
  shadowSoftness: 12,
  skyColor: '#9fd2ff',
  groundColor: '#a87c48',
  ambient: 1.05,
  fillColor: '#6fb0ff',
  fillIntensity: 0.5,
  reflections: 0.85
}

export const LAUNCH_SEA: SeaParams = {
  ...SEA_DEFAULTS,
  shallowColor: '#9ff7e8',
  deepColor: '#17bdd0',
  reflection: 1,
  sparkle: 2.1,
  caustic: 0.12
}
