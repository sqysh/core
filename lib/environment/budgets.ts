import { AssetCategory, Lod } from './core/types'

// Practical geometry budgets for the native mobile app, where the CORE world has to hold 60 fps on older iPhones (an
// A15-class GPU, a ~3× retina screen at up to 1.5× render scale) alongside its water, lighting and UI.
//
// Per asset, triangles at each level of detail: `medium` is what phones draw for anything in the main view, `high` is
// for hero close-ups (and the TV), `low` for distant or numerous copies. Surface detail below these budgets belongs in
// the shared material maps, not in geometry.

export const ASSET_BUDGETS: Record<string, Record<Lod, number>> = {
  // granite
  'granite-headland': { high: 15000, medium: 7500, low: 2500 },
  'granite-sculpted-ledge': { high: 14000, medium: 7000, low: 2500 },
  'granite-coastal-formation': { high: 14000, medium: 7000, low: 2500 },
  'granite-faceted-outcrop': { high: 14000, medium: 7000, low: 2500 },
  'granite-cliff': { high: 16000, medium: 8000, low: 3000 },
  'granite-bedrock-ledge': { high: 6000, medium: 3000, low: 1000 },
  'granite-glacial-boulder': { high: 2500, medium: 1200, low: 400 },
  'granite-mossy-rock': { high: 2500, medium: 1200, low: 400 },
  'granite-shore-rock': { high: 1800, medium: 900, low: 300 },
  'granite-stones': { high: 160, medium: 80, low: 24 },
  // trees: model assets carry crown, trunk and roots as one sculpted surface, the leaf detail in their maps
  'eastern-white-pine': { high: 15000, medium: 6000, low: 2000 },
  'tree-pitch-pine': { high: 8000, medium: 4000, low: 1000 },
  'tree-red-cedar': { high: 6000, medium: 3000, low: 800 },
  'coastal-oak': { high: 15000, medium: 7500, low: 2500 },
  // vegetation: mostly instanced
  'veg-bayberry': { high: 2500, medium: 1200, low: 300 },
  'beach-rose': { high: 8000, medium: 3000, low: 1000 },
  'veg-juniper': { high: 2000, medium: 1000, low: 250 },
  'veg-grasses': { high: 400, medium: 180, low: 40 },
  'veg-ferns-moss': { high: 900, medium: 450, low: 120 }
}

/** Budgets for one view of the world on a phone, everything on screen together */
export const SCENE_BUDGET = {
  /** Triangles drawn per frame, all passes (shadow maps included) */
  triangles: 350_000,
  drawCalls: 120,
  /** Texture memory, MB (environment maps and shadow maps included) */
  textureMB: 64,
  /** Shadow map resolution on phones */
  shadowMap: 1024
}

export const CATEGORY_NOTES: Record<AssetCategory, string> = {
  granite: 'Shape in geometry, surface in the shared granite maps. Small stones instanced.',
  trees: 'Tapered trunk and branches as geometry; foliage as instanced leaf clusters.',
  vegetation: 'Instanced clumps; leaf clusters rather than solid volumes.'
}
