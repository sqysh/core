import { OrthographicCamera } from 'three'

// Camera journeys for the native app's orthographic 3D screens. A journey runs between two poses; each part of the
// pose (where it looks, its compass angle, its height above the ground plane, its zoom) moves on its own stretch of
// the journey with its own easing, so a move can swing round first, then sink and draw in, rather than sliding
// everything at once. Played backwards it retraces the same path. Screens describe their poses and hand this the
// progress (0 → 1); nothing here knows about any particular scene.

/** Where the camera looks and how: an orthographic camera at `distance` from the target along these angles */
export type Pose = {
  target: { x: number; y: number; z: number }
  /** Compass angle of the camera round the target (radians; 0 = from +z) */
  azimuth: number
  /** Angle above the horizontal (radians) */
  elevation: number
  /** World units across the screen's width (the zoom) */
  width: number
}

/** The part of the journey (0–1) over which a channel moves, and its easing */
export type Stretch = { from: number; to: number; ease?: (t: number) => number }

export type Journey = {
  from: Pose
  to: Pose
  target: Stretch
  azimuth: Stretch
  elevation: Stretch
  width: Stretch
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const local = (s: Stretch, p: number) => (s.ease ?? easeInOutCubic)(Math.min(1, Math.max(0, (p - s.from) / (s.to - s.from))))

/** The pose a journey has reached at progress `p` (0 = its start, 1 = its end) */
export function poseAt(j: Journey, p: number): Pose {
  const t = local(j.target, p)
  return {
    target: {
      x: lerp(j.from.target.x, j.to.target.x, t),
      y: lerp(j.from.target.y, j.to.target.y, t),
      z: lerp(j.from.target.z, j.to.target.z, t)
    },
    azimuth: lerp(j.from.azimuth, j.to.azimuth, local(j.azimuth, p)),
    elevation: lerp(j.from.elevation, j.to.elevation, local(j.elevation, p)),
    width: lerp(j.from.width, j.to.width, local(j.width, p))
  }
}

export type Safety = {
  /** The lowest the camera may look from (radians) */
  minElevation: number
  /** Ground (or sea floor) height at a point; the camera is kept clear above it and above the water */
  ground: (x: number, z: number) => number
  /** Clearance kept above the ground and the water */
  clearance: number
  /** Height of the water surface */
  waterY: number
}

/**
 * Places an orthographic camera at a pose, `distance` back from its target and fitted to the screen's width. It never
 * sits lower than the minimum angle, inside the terrain or under the water: if the pose would put it there, it is
 * raised until it clears them.
 */
export function placeCamera(camera: OrthographicCamera, pose: Pose, screenWidth: number, distance: number, safety: Safety) {
  const { target: t, azimuth: az } = pose
  let el = Math.max(pose.elevation, safety.minElevation)
  const at = (e: number) => ({
    x: t.x + distance * Math.cos(e) * Math.sin(az),
    y: t.y + distance * Math.sin(e),
    z: t.z + distance * Math.cos(e) * Math.cos(az)
  })
  let p = at(el)
  for (let i = 0; i < 20 && p.y < Math.max(safety.ground(p.x, p.z), safety.waterY) + safety.clearance; i++) {
    el = Math.min(Math.PI / 2 - 0.01, el + 0.02)
    p = at(el)
  }
  camera.position.set(p.x, p.y, p.z)
  camera.zoom = screenWidth / pose.width
  camera.lookAt(t.x, t.y, t.z)
  camera.updateProjectionMatrix()
}
