import { fbm3, smoothstep } from './noise'

/**
 * A tile's land outline as a field over tile-local (x, z): negative on land, positive over water, roughly in world
 * units. The beach is derived from it.
 */
export type ShoreField = (x: number, z: number) => number

/** Ground height for a sandy island: a flat beach top that rolls softly down under the water */
export function beachHeight(field: ShoreField, x: number, z: number, seed = 0, ox = 0, oz = 0) {
  const d = field(x, z)
  // dune noise in world space (tile-local position plus the tile's origin), so beaches stay continuous across tiles
  const wx = x + ox
  const wz = z + oz
  const top = 0.3 + 0.05 * fbm3(wx * 0.45, 0, wz * 0.45, seed) + 0.03 * fbm3(wx * 2.1, 1, wz * 2.1, seed)
  return top + (-0.5 - top) * smoothstep(-1.15, 0.65, d)
}
