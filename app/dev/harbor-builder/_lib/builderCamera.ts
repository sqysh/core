import { ISOMETRIC_ELEVATION } from '@/lib/camera/orthoView'

// The World Builder's camera: what the editor's camera may and may not do. It is a tool's camera, for placing and
// inspecting things, and nothing here is a decision about how the game's camera behaves: that hasn't been made, and
// when it is it gets a configuration of its own. Nothing outside the harbor builder should import this file; what
// the two may share is the view geometry in lib/camera/orthoView.ts, which sets no limits.
//
// The rules: always orthographic; the elevation is fixed at true isometric and nothing changes it (no tilt, no
// perspective); the camera turns freely about the vertical axis; it pans and zooms within limits; none of it moves
// the elevation.

export const WORLD_BUILDER_CAMERA = {
  projection: 'orthographic',
  /** Degrees above the ground, constant: rotating, panning and zooming never change it */
  elevation: ISOMETRIC_ELEVATION,
  /** The viewing direction "Reset camera" returns to: degrees from +z toward +x, the isometric diagonal */
  defaultAzimuth: 45,
  /** How far the camera sits from what it looks at, and its clipping range (orthographic: only the depth range) */
  distance: 200,
  near: 1,
  far: 800,
  zoom: {
    /** How much of the world fits across the canvas at the closest and the farthest zoom, in world units */
    minViewWidth: 8,
    maxViewWidth: 300,
    /** Zoom per pixel of mouse wheel, and per unit of a trackpad pinch */
    wheelRate: 0.0016,
    pinchRate: 0.012,
    /** How quickly an eased zoom settles (per second) */
    damping: 14
  },
  rotate: {
    /** Degrees of turn per pixel of drag, and per pixel of ⌥-scroll */
    degreesPerPixel: 0.4,
    scrollDegreesPerPixel: 0.25,
    /** Degrees per press of an arrow key, and per click of the turn buttons */
    keyStep: 15,
    buttonStep: 45,
    damping: 12,
    /** A two-finger twist under this many degrees is ignored, so a pinch or a pan doesn't turn the view */
    twistDeadZone: 8
  },
  pan: {
    /** How far (world units, each way) the camera may be panned from the approved framing */
    limit: 100,
    /** Pixels a pointer moves before a drag is a pan (a smaller movement is a click, for selecting) */
    dragThreshold: 4,
    damping: 14,
    /** A pan carries on after release, slowing at this rate per second, until under this speed (pixels per ms) */
    inertiaPerSecond: 5,
    minInertiaSpeed: 0.02
  }
} as const

export type BuilderCameraConfig = typeof WORLD_BUILDER_CAMERA
