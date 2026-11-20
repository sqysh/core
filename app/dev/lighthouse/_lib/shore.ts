import { DataTexture, LinearFilter, RGBAFormat, UnsignedByteType } from 'three'
import { fbm3, smoothstep } from './noise'
import { TILE_SIZE } from './world'

/**
 * A tile's land outline as a field over tile-local (x, z): negative on land, positive over water, roughly in world
 * units. The beach, the water's shallows and the foam are all derived from it, so they always agree.
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

/** Where the beach crosses the water surface, measured from the field's zero line */
const WATERLINE = -0.37

/** Distance to the waterline (0 at the shore, rising out to sea, clamped at 2 units) baked for the water shader */
export function bakeShoreTexture(field: ShoreField, size = 256) {
  const data = new Uint8Array(size * size * 4)
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const x = ((i + 0.5) / size - 0.5) * TILE_SIZE
      const z = ((j + 0.5) / size - 0.5) * TILE_SIZE
      const d = Math.min(2, Math.max(0, field(x, z) - WATERLINE))
      const o = (j * size + i) * 4
      data[o] = data[o + 1] = data[o + 2] = Math.round((d / 2) * 255)
      data[o + 3] = 255
    }
  const tex = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType)
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.needsUpdate = true
  return tex
}
