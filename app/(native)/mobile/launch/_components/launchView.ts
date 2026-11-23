import { groundHeight } from '@/app/dev/checkin-voyage/_lib/terrain'
import { LIGHTHOUSE } from '@/app/dev/lighthouse/_lib/lighthouseTile'
import { at } from '@/app/dev/lighthouse/_lib/world'
import { easeInOutSine, Journey, Pose, Safety } from '../../_lib/cameraChoreography'

// The launch screen's two views of the harbor and the journey between them, independent of the TV's meeting view.
// The landing looks down on the lighthouse at the diorama's own isometric angle. Signing in, the camera swings round
// the lighthouse's right side and on behind it, coming down toward the water, and ends low over the sheltered inlet
// behind the island.

const DEG = Math.PI / 180

/** Slides a target along the screen's right for a camera at this azimuth */
const slide = (x: number, z: number, az: number, by: number) => ({ x: x + Math.cos(az) * by, z: z - Math.sin(az) * by })

const LANDING_AZ = 45 * DEG
const landingFocus = slide(LIGHTHOUSE.x, LIGHTHOUSE.z, LANDING_AZ, -1.1)

/** The landing: the cottage beside the tower, the island centred, room above the lantern for the wordmark */
export const LANDING_POSE: Pose = {
  target: { x: landingFocus.x, y: LIGHTHOUSE.y + 5.4, z: landingFocus.z },
  azimuth: LANDING_AZ,
  elevation: 35 * DEG,
  width: 13.5
}

/** The inlet behind the island: the sheltered water between the back of the island and the neck, open to the sea behind */
const [inletX, inletZ] = at(-3.6, -4.8)

/**
 * Signing in: the camera has swung right round the lighthouse (about 200°, through its right side and behind it,
 * toward the cottage's side) and come down low over the water, looking into the inlet behind the island. The point
 * looked at sits a little below the water line, which lifts the inlet into the upper part of the screen and leaves the
 * open water in front for the sign-in options.
 */
const SIGN_IN_AZ = 245 * DEG
const signInFocus = slide(inletX, inletZ, SIGN_IN_AZ, 0.7)
export const SIGN_IN_POSE: Pose = {
  target: { x: signInFocus.x, y: -1.4, z: signInFocus.z },
  azimuth: SIGN_IN_AZ,
  elevation: 16 * DEG,
  width: 10
}

/**
 * The journey: a long sweep round the lighthouse's right side and behind it, the focus moving on from the lighthouse
 * to the inlet through the middle of the move, the camera coming down steadily the whole way and drawing in toward
 * the end, so it reads as travelling there rather than turning on the spot.
 */
export const SIGN_IN_JOURNEY: Journey = {
  from: LANDING_POSE,
  to: SIGN_IN_POSE,
  azimuth: { from: 0, to: 0.9 },
  target: { from: 0.2, to: 0.95 },
  elevation: { from: 0, to: 1, ease: easeInOutSine },
  width: { from: 0.3, to: 1 }
}

export const CAMERA_DISTANCE = 140

export const SAFETY: Safety = {
  minElevation: 12 * DEG,
  ground: (x, z) => groundHeight(x, z),
  clearance: 2,
  waterY: 0
}
