import { fbm3 } from './noise'
import { ShoreField } from './shore'
import { at } from './world'

// Layout of the lighthouse tile (tile 0, 0). Positions are authored in screen-aligned (u, v) via `at` and stored as
// tile-local (x, z).

/** A rounded-square island with a softly wandering shoreline */
export const lighthouseShore: ShoreField = (x, z) => {
  const a = Math.atan2(z, x)
  const P = 4
  const r = Math.pow(Math.pow(Math.abs(x), P) + Math.pow(Math.abs(z), P), 1 / P)
  const wobble =
    0.2 * Math.sin(a * 3 + 0.6) + 0.12 * Math.sin(a * 5 + 2.1) + 0.07 * Math.sin(a * 9 + 4) + 0.12 * fbm3(x * 0.8, 0, z * 0.8, 4)
  return r - (4.62 + wobble)
}

const [lhX, lhZ] = at(0.75, -2.85)
const [coX, coZ] = at(-2.05, -0.95)

/** Top of the high rock shelf the lighthouse stands on */
export const LIGHTHOUSE = { x: lhX, z: lhZ, y: 2.52 }
/** Top of the lower shelf under the cottage */
export const COTTAGE = { x: coX, z: coZ, y: 1.92 }

/** Tower body: height where each band meets the next, and the radius taper */
export const TOWER = {
  baseTop: 0.78,
  bands: [0.78, 2.62, 4.46, 6.3, 8.14, 9.98],
  rBottom: 1.58,
  rTop: 1.3,
  gallery: 10.32,
  beamY: 8.95
}
export const towerRadius = (y: number) => {
  const t = (y - TOWER.bands[0]) / (TOWER.bands[TOWER.bands.length - 1] - TOWER.bands[0])
  return TOWER.rBottom + (TOWER.rTop - TOWER.rBottom) * Math.min(1, Math.max(0, t))
}

/** The cottage's tower, relative to the cottage floor */
export const COTTAGE_TOWER = { x: -0.3, z: 0.55, top: 4.25, spire: 1.75 }
