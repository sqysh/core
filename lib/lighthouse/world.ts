// Shared world units for every terrain tile. The lighthouse diorama is tile (0, 0); later tiles sit on the same grid,
// share the same water elevation and sea depth, and use the same materials and lights, so their seams disappear when
// they are joined.

/** Edge length of one terrain tile, in world units (1 unit ≈ 1 m at diorama scale) */
export const TILE_SIZE = 10
/** Water surface elevation, the same on every tile */
export const WATER_Y = 0

/** World-space centre of the tile at grid column `col` (east, +x) and row `row` (south, +z) */
export const tileOrigin = (col: number, row: number): [number, number, number] => [
  col * TILE_SIZE,
  WATER_Y,
  row * TILE_SIZE
]

// The diorama's default view looks at the tile from its south-east corner, so authoring is easier in screen-aligned
// axes: u runs left → right across the screen, v runs back → front toward the viewer.
const R = Math.SQRT1_2
/** Tile-local (x, z) for a screen-aligned (u, v) position at the default view */
export const at = (u: number, v: number): [number, number] => [(u + v) * R, (v - u) * R]
