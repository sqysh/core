import { OrthographicCamera, Vector3 } from 'three'

// The meeting shot, shared by the live camera and by berth planning (which needs to know where things land on the
// TV): a true orthographic, isometric three-quarter view like the original diorama, so there is no horizon and the
// water fills the screen. The whole lighthouse stays in frame with room above it, and the harbor below is open water.

export const VIEW = {
  /** What the camera looks at; the world can grow in any direction by moving this */
  target: { x: 3.3, y: 0, z: -8.0 },
  /** Isometric three-quarter: 45° round, 35° down */
  azimuth: Math.PI / 4,
  elevation: (35 * Math.PI) / 180,
  /** Orthographic, so distance only keeps the world in front of the camera */
  distance: 140,
  /** Pixels per world unit at 1080p */
  zoom: 34
}

/** Reference screen the composition (and the UI keep-out zones) are measured in */
export const SCREEN = { w: 1920, h: 1080 }

/** The meeting camera at a given focus, for planning (the live camera uses the same placement) */
export function viewCamera(target = VIEW.target) {
  const cam = new OrthographicCamera(-SCREEN.w / 2, SCREEN.w / 2, SCREEN.h / 2, -SCREEN.h / 2, 0.5, 500)
  const { azimuth: az, elevation: el, distance: d } = VIEW
  cam.zoom = VIEW.zoom
  cam.position.set(target.x + d * Math.cos(el) * Math.sin(az), target.y + d * Math.sin(el), target.z + d * Math.cos(el) * Math.cos(az))
  cam.lookAt(target.x, target.y, target.z)
  cam.updateMatrixWorld()
  cam.updateProjectionMatrix()
  return cam
}

/** Where a screen point (normalised device coordinates) lands on the horizontal plane at height `h` */
export function groundAt(cam: OrthographicCamera, nx: number, ny: number, h = 0) {
  const a = new Vector3(nx, ny, -1).unproject(cam)
  const b = new Vector3(nx, ny, 1).unproject(cam)
  const dir = b.sub(a)
  const t = (h - a.y) / dir.y
  return { x: a.x + dir.x * t, z: a.z + dir.z * t }
}

/**
 * The approved blueprint image (1881 px wide) mapped onto the TV frame: scaled to the full 1920 width, and set 30 px
 * down so the taller 16:9 frame gains open water at the bottom. Level design is authored in blueprint pixels.
 */
export const BLUEPRINT = { scale: SCREEN.w / 1881, dy: 30 }
let planCam: OrthographicCamera | null = null
/** World (x, z) of a blueprint pixel, for a point standing at height `h` */
export function fromBlueprint(bx: number, by: number, h = 0): [number, number] {
  planCam ??= viewCamera()
  const sx = bx * BLUEPRINT.scale
  const sy = by * BLUEPRINT.scale + BLUEPRINT.dy
  const p = groundAt(planCam, (sx / SCREEN.w) * 2 - 1, 1 - (sy / SCREEN.h) * 2, h)
  return [p.x, p.z]
}

const v = new Vector3()
/** World point → reference-screen pixels */
export function toScreen(cam: OrthographicCamera, x: number, y: number, z: number) {
  v.set(x, y, z).project(cam)
  return { x: (v.x * 0.5 + 0.5) * SCREEN.w, y: (-v.y * 0.5 + 0.5) * SCREEN.h, behind: v.z > 1 }
}

export type Rect = { x0: number; y0: number; x1: number; y1: number }

/** Screen areas the overlays own (harbor log, QR card, welcome banner, controls), in reference pixels */
export const UI_ZONES: Rect[] = [
  { x0: 0, y0: 860, x1: 760, y1: 1080 }, // welcome lower-third
  { x0: 600, y0: 960, x1: 1320, y1: 1080 }, // controls
  { x0: 610, y0: 40, x1: 830, y1: 520 }, // the lighthouse tower: nothing moors behind it, no plate crosses it
  { x0: 0, y0: 380, x1: 210, y1: 600 } // the trail sign on the far-left sand: no nameplate crosses it
]

export const overlaps = (a: Rect, b: Rect, pad = 0) =>
  a.x0 < b.x1 + pad && a.x1 + pad > b.x0 && a.y0 < b.y1 + pad && a.y1 + pad > b.y0

/** A profile badge's size on the reference screen: a 4vw circle with its ring */
export const plateSize = (_label: string) => ({ w: 92, h: 92 })

/** The view's own axes, fixed: toward the camera, screen-right, screen-up (and the azimuth) */
export function viewAxes() {
  const { azimuth: az, elevation: el } = VIEW
  const n = new Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az))
  const right = new Vector3(Math.cos(az), 0, -Math.sin(az))
  const up = new Vector3().crossVectors(n, right).multiplyScalar(-1).normalize()
  if (up.y < 0) up.negate()
  return { n, right, up, az }
}
