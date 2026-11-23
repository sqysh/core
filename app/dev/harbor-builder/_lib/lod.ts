import { MeshBasicMaterial } from 'three'

export type LODLevel = 'high' | 'medium' | 'low'
export const LOD_LEVELS: LODLevel[] = ['high', 'medium', 'low']

// Which detail a model is drawn at, from how many pixels it covers (its longest side on screen): what matters is
// triangles per pixel, whatever the window's size. Full detail (0.4–2.4M triangles) only pays when a model fills a
// good part of the view; Medium (30–100k) holds until it's a couple of hundred pixels; below that Low (6–20k) is
// already several triangles per pixel. Each boundary has a gap between going up and going down, so a model sitting
// on one doesn't flicker between two meshes while the view moves.
const HIGH_UP = 560
const HIGH_DOWN = 440
const MEDIUM_UP = 220
const MEDIUM_DOWN = 160

/** The level for a model `pixels` across, given the one it's at (none yet: the level for its size, outright) */
export function selectLOD(prev: LODLevel | undefined, pixels: number): LODLevel {
  if (!prev) return pixels > HIGH_UP ? 'high' : pixels > MEDIUM_UP ? 'medium' : 'low'
  if (prev === 'low') return pixels > HIGH_UP ? 'high' : pixels > MEDIUM_UP ? 'medium' : 'low'
  if (prev === 'high') return pixels < MEDIUM_DOWN ? 'low' : pixels < HIGH_DOWN ? 'medium' : 'high'
  return pixels > HIGH_UP ? 'high' : pixels < MEDIUM_DOWN ? 'low' : 'medium'
}

const debug = (color: number) =>
  new MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.5, depthTest: false })

export const LOD_DEBUG_MATS: Record<LODLevel, MeshBasicMaterial> = {
  high: debug(0x6ee7b7),
  medium: debug(0xfbbf24),
  low: debug(0xf87171)
}

