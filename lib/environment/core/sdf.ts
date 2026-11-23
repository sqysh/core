// Signed distance field helpers: negative inside a shape, positive outside, roughly the distance to its surface.
// Shapes are combined with smooth unions and intersections and then meshed (see surfaceNets).

/** Distance to a box of half-extents (hx, hy, hz) with edges rounded by r, centred on the origin */
export function roundBox(px: number, py: number, pz: number, hx: number, hy: number, hz: number, r: number) {
  const qx = Math.abs(px) - hx + r
  const qy = Math.abs(py) - hy + r
  const qz = Math.abs(pz) - hz + r
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  const oz = Math.max(qz, 0)
  return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r
}

/** Smooth union: blends two shapes over a distance k */
export function smin(a: number, b: number, k: number) {
  if (k <= 0) return Math.min(a, b)
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

/** Smooth intersection / subtraction (use -b to cut b away) */
export const smax = (a: number, b: number, k: number) => -smin(-a, -b, k)

/** A rigid placement: a point in world space taken into a shape's own frame (turned about y, then tipped about x) */
export type Frame = { cx: number; cy: number; cz: number; cosYaw: number; sinYaw: number; cosTip: number; sinTip: number }

export function frame(cx: number, cy: number, cz: number, yaw: number, tip: number): Frame {
  return { cx, cy, cz, cosYaw: Math.cos(yaw), sinYaw: Math.sin(yaw), cosTip: Math.cos(tip), sinTip: Math.sin(tip) }
}

/** Writes the point's local coordinates into out[0..2] */
export function toLocal(f: Frame, x: number, y: number, z: number, out: Float64Array) {
  const dx = x - f.cx
  const dy = y - f.cy
  const dz = z - f.cz
  const x1 = f.cosYaw * dx - f.sinYaw * dz
  const z1 = f.sinYaw * dx + f.cosYaw * dz
  // tipped about x: positive tip slopes the shape's top down toward +z
  out[0] = x1
  out[1] = f.cosTip * dy + f.sinTip * z1
  out[2] = -f.sinTip * dy + f.cosTip * z1
}
