// View geometry for an orthographic camera that looks down at a ground plane (y = 0) from an azimuth and elevation:
// where a screen point lands on the ground, and where to look so a ground point appears at a given screen point.
//
// This is arithmetic only. It says nothing about what a camera may do: no angle is locked, no limit is set, no input is
// read. Whoever uses it (the World Builder, a future gameplay camera) brings its own rules; the World Builder's are in
// app/dev/harbor-builder/_lib/builderCamera.ts and no other camera should import them.
//
// Conventions (the same as three.js): azimuth is degrees round the vertical axis from +z toward +x, elevation degrees
// above the ground, `zoom` is pixels per world unit, and the camera looks at the ground point (x, z).

export const DEG = Math.PI / 180

/** The elevation of a true isometric view: atan(1/√2), 35.264° */
export const ISOMETRIC_ELEVATION = Math.atan(Math.SQRT1_2) / DEG

export type OrthoPose = { azimuth: number; elevation: number; x: number; z: number; zoom: number }

/** The camera's right and up directions, projected on the ground (x, z) */
function basis(azimuth: number, elevation: number) {
  const a = azimuth * DEG
  const sinE = Math.sin(elevation * DEG)
  return { rx: Math.cos(a), rz: -Math.sin(a), ux: -sinE * Math.sin(a), uz: -sinE * Math.cos(a) }
}

/** Where the camera sits relative to the ground point it looks at */
export function cameraOffset(azimuth: number, elevation: number, distance: number): [number, number, number] {
  const a = azimuth * DEG
  const e = elevation * DEG
  return [distance * Math.cos(e) * Math.sin(a), distance * Math.sin(e), distance * Math.cos(e) * Math.cos(a)]
}

/**
 * The ground offset (x, z), from the point the camera looks at, of the screen point (px, py) in a w × h viewport
 * (pixels from its top left corner).
 */
export function groundOffsetAt(pose: OrthoPose, px: number, py: number, w: number, h: number): [number, number] {
  const { rx, rz, ux, uz } = basis(pose.azimuth, pose.elevation)
  const right = (px - w / 2) / pose.zoom
  const up = -(py - h / 2) / pose.zoom
  const det = rx * uz - rz * ux
  return [(right * uz - rz * up) / det, (rx * up - ux * right) / det]
}

/** The ground point (x, z) shown at the screen point (px, py) */
export function groundPointAt(pose: OrthoPose, px: number, py: number, w: number, h: number): [number, number] {
  const [ox, oz] = groundOffsetAt(pose, px, py, w, h)
  return [pose.x + ox, pose.z + oz]
}

/** The ground point to look at, so that `ground` is shown at the screen point (px, py) */
export function lookAtFor(ground: [number, number], pose: OrthoPose, px: number, py: number, w: number, h: number): [number, number] {
  const [ox, oz] = groundOffsetAt(pose, px, py, w, h)
  return [ground[0] - ox, ground[1] - oz]
}

/** The ground point (x, z) a point in the air appears over, seen from this azimuth and elevation */
export function groundBelow(p: [number, number, number], azimuth: number, elevation: number): [number, number] {
  const a = azimuth * DEG
  const lift = p[1] / Math.tan(elevation * DEG)
  return [p[0] - lift * Math.sin(a), p[2] - lift * Math.cos(a)]
}

/** The turn in degrees, in (-180, 180], from one azimuth to another by the shorter way round */
export function shortestTurn(from: number, to: number) {
  const d = (((to - from) % 360) + 360) % 360
  return d > 180 ? d - 360 : d
}

/** An angle in degrees as 0 ≤ a < 360 */
export const wrapDegrees = (a: number) => ((a % 360) + 360) % 360
