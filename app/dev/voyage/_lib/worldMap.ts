import { lighthouseShore } from '../../lighthouse/_lib/lighthouseTile'
import { fbm3 } from '../../lighthouse/_lib/noise'
import { ShoreField } from '../../lighthouse/_lib/shore'
import { TILE_SIZE, TileSides, tileOrigin } from '../../lighthouse/_lib/world'

// The connected 2 × 2 test world. One shoreline field covers the whole world in world coordinates; each tile bakes
// its own window onto it, so beaches, shallows and foam run straight across tile edges with no seam.
//
//            west            east
//   north  (0,0) lighthouse  (1,0) rocky islet
//   south  (0,1) rocky coast (1,1) sandbar

export const GRID = { cols: 2, rows: 2 }

/** World extent (tile edges), in world units */
export const WORLD = {
  minX: -TILE_SIZE / 2,
  maxX: (GRID.cols - 0.5) * TILE_SIZE,
  minZ: -TILE_SIZE / 2,
  maxZ: (GRID.rows - 0.5) * TILE_SIZE
}
export const WORLD_CENTER: [number, number] = [(WORLD.minX + WORLD.maxX) / 2, (WORLD.minZ + WORLD.maxZ) / 2]

const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}
const smax = (a: number, b: number, k: number) => -smin(-a, -b, k)

/** A rounded islet with a wandering outline: centre, radii, seed */
const islet = (cx: number, cz: number, rx: number, rz: number, seed: number): ShoreField => (x, z) => {
  const dx = (x - cx) / rx
  const dz = (z - cz) / rz
  const a = Math.atan2(dz, dx)
  const wob = 0.1 * Math.sin(a * 3 + seed) + 0.07 * Math.sin(a * 5 + seed * 2) + 0.08 * fbm3(x * 0.9, 0, z * 0.9, seed)
  return (Math.hypot(dx, dz) - 1) * Math.min(rx, rz) - wob
}

/** An L-shaped rocky shore along the south-west tile's west and south sides */
const southWestCoast: ShoreField = (x, z) => {
  const west = x - (-1.7 + 0.3 * Math.sin(z * 0.8 + 1) + 0.25 * fbm3(0, z * 0.6, 0, 7))
  const south = 11.7 + 0.3 * Math.sin(x * 0.9) + 0.25 * fbm3(x * 0.6, 0, 0, 8) - z
  let f = smin(west, south, 1.6)
  f = smax(f, 5.9 - z, 1.2) // begins a channel's width south of the lighthouse island
  f = smax(f, x - 4.3, 1.2) // and ends before the sandbar's tile
  return f
}

export const FEATURES = {
  northEastIslet: { x: 9.9, z: -0.5, rx: 1.7, rz: 1.5 },
  rock: { x: 8.7, z: 3.4, r: 0.55 },
  sandbar: { x: 9.4, z: 10.4, rx: 1.5, rz: 1.1 }
}

const newLand: ShoreField[] = [
  islet(FEATURES.northEastIslet.x, FEATURES.northEastIslet.z, FEATURES.northEastIslet.rx, FEATURES.northEastIslet.rz, 3),
  islet(FEATURES.rock.x, FEATURES.rock.z, FEATURES.rock.r, FEATURES.rock.r, 5),
  islet(FEATURES.sandbar.x, FEATURES.sandbar.z, FEATURES.sandbar.rx, FEATURES.sandbar.rz, 9),
  southWestCoast
]

/** Distance from the world's outer glass wall */
const edgeDistance = (x: number, z: number) =>
  Math.min(x - WORLD.minX, WORLD.maxX - x, z - WORLD.minZ, WORLD.maxZ - z)

/** The whole world's shoreline: negative on land, positive over water, in world coordinates */
export const worldShore: ShoreField = (x, z) => {
  let land = Infinity
  for (const f of newLand) land = Math.min(land, f(x, z))
  // keep a ribbon of open water inside the outer glass walls, like the lighthouse diorama
  land = smax(land, 1.0 - edgeDistance(x, z), 0.6)
  // the lighthouse island is used exactly as authored
  return Math.min(land, lighthouseShore(x, z))
}

export type WorldTile = { col: number; row: number; key: string; shore: ShoreField; sides: TileSides; lighthouse: boolean }

/** Every tile, with its window onto the world shoreline and only its outer sides walled */
export const TILES: WorldTile[] = Array.from({ length: GRID.cols * GRID.rows }, (_, i) => {
  const col = i % GRID.cols
  const row = Math.floor(i / GRID.cols)
  const [ox, , oz] = tileOrigin(col, row)
  return {
    col,
    row,
    key: `${col},${row}`,
    shore: (x: number, z: number) => worldShore(x + ox, z + oz),
    sides: { north: row === 0, south: row === GRID.rows - 1, west: col === 0, east: col === GRID.cols - 1 },
    lighthouse: col === 0 && row === 0
  }
})
