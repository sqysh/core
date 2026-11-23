import { beachHeight, ShoreField } from '@/app/dev/lighthouse/_lib/shore'
import { at } from '@/app/dev/lighthouse/_lib/world'
import { Level } from '@/lib/environment/core/types'
import { fbm3 } from '@/lib/environment/core/noise'
import { samplerFrom } from '@/lib/environment/core/terrain'

// The composition: the CORE world's own lighthouse, cottage and a vessel from the harbor fleet, set with the new model
// assets on one miniature island, to settle the world's artistic scale before more assets are made. The lighthouse is
// the reference: every other asset's size is a share of its height. Nothing here changes the world or the assets;
// the layout lives in the workshop (and in this browser, while it's being tuned).

/** What an asset is in the world, and how big that kind of thing should be against the lighthouse (a share of its height) */
export type ScaleRole =
  'reference' | 'structure' | 'vessel' | 'mature tree' | 'young tree' | 'large boulder' | 'shrub' | 'coastal grass'

/** Starting points, not rules: the miniature world's proportions, not real-world ones */
export const ROLE_TARGETS: Partial<Record<ScaleRole, [number, number]>> = {
  'mature tree': [0.18, 0.3],
  'young tree': [0.1, 0.15],
  'large boulder': [0.05, 0.1],
  shrub: [0.03, 0.06],
  'coastal grass': [0.01, 0.02]
}

export type VesselClass = 'runabout' | 'lobster' | 'sloop'

export type ItemKind =
  | { type: 'lighthouse' }
  | { type: 'cottage' }
  | { type: 'vessel'; vessel: VesselClass }
  | { type: 'model'; recipe: string }

export type CompositionItem = {
  id: string
  name: string
  kind: ItemKind
  role: ScaleRole
  /**
   * Size. Model assets: their height as a share of the lighthouse's. The world's own pieces (lighthouse, cottage,
   * vessel): a multiplier on their size in the world, 1 as built (the lighthouse stays 1: it's the reference)
   */
  size: number
  /** Screen-aligned position at the isometric view (left → right, back → front), world units across the tile */
  u: number
  v: number
  /** Turn, degrees */
  yaw: number
  /** How far it sinks into the ground, as a share of its own height */
  embed: number
  /** Model assets: which level of detail to draw */
  level: Level
  visible: boolean
}

const item = (i: Omit<CompositionItem, 'visible' | 'level'> & { level?: Level }): CompositionItem => ({
  level: 'medium',
  visible: true,
  ...i
})

/** The recommended starting layout */
export const DEFAULT_ITEMS: CompositionItem[] = [
  item({
    id: 'lighthouse',
    name: 'Lighthouse',
    kind: { type: 'lighthouse' },
    role: 'reference',
    size: 1,
    u: 0.9,
    v: -2.3,
    yaw: 0,
    embed: 0.008
  }),
  item({
    id: 'cottage',
    name: "Keeper's cottage",
    kind: { type: 'cottage' },
    role: 'structure',
    size: 1,
    u: -1.9,
    v: -0.9,
    yaw: 0,
    embed: 0.01
  }),
  item({
    id: 'vessel',
    name: 'Lobster boat',
    kind: { type: 'vessel', vessel: 'lobster' },
    role: 'vessel',
    size: 1,
    u: 0,
    v: 5.0,
    yaw: 30,
    embed: 0
  }),
  item({
    id: 'headland',
    name: 'Granite headland',
    kind: { type: 'model', recipe: 'granite-headland' },
    role: 'large boulder',
    size: 0.085,
    u: 3.9,
    v: 0.6,
    yaw: -20,
    embed: 0.06
  }),
  item({
    id: 'pine',
    name: 'White pine (mature)',
    kind: { type: 'model', recipe: 'eastern-white-pine' },
    role: 'mature tree',
    size: 0.26,
    u: -3.6,
    v: -1.8,
    yaw: 0,
    embed: 0.02
  }),
  item({
    id: 'pine-young',
    name: 'White pine (young)',
    kind: { type: 'model', recipe: 'eastern-white-pine' },
    role: 'young tree',
    size: 0.12,
    u: 3.0,
    v: -1.9,
    yaw: 140,
    embed: 0.02
  }),
  item({
    id: 'oak',
    name: 'Coastal oak',
    kind: { type: 'model', recipe: 'coastal-oak' },
    role: 'mature tree',
    size: 0.21,
    u: -3.3,
    v: 0.4,
    yaw: 30,
    embed: 0.02
  }),
  item({
    id: 'rose-1',
    name: 'Beach rose',
    kind: { type: 'model', recipe: 'beach-rose' },
    role: 'shrub',
    size: 0.045,
    u: -0.5,
    v: 0.9,
    yaw: 0,
    embed: 0.05
  }),
  item({
    id: 'rose-2',
    name: 'Beach rose',
    kind: { type: 'model', recipe: 'beach-rose' },
    role: 'shrub',
    size: 0.038,
    u: 1.7,
    v: 0.7,
    yaw: 110,
    embed: 0.05
  }),
  item({
    id: 'rose-3',
    name: 'Beach rose',
    kind: { type: 'model', recipe: 'beach-rose' },
    role: 'shrub',
    size: 0.05,
    u: -1.3,
    v: 1.7,
    yaw: 230,
    embed: 0.05
  })
]

/** Tile-local (x, z) of an item */
export const positionOf = (i: Pick<CompositionItem, 'u' | 'v'>) => at(i.u, i.v)

/**
 * The composition's island: a rounded square like the lighthouse tile's, smaller and set toward the back of the tile,
 * so open water runs across the front for the vessel, its outline wandering softly
 */
const [backX, backZ] = at(0, -0.6)
export const compositionShore: ShoreField = (x, z) => {
  const X = x - backX
  const Z = z - backZ
  const r = Math.pow(X ** 4 + Z ** 4, 0.25)
  const a = Math.atan2(Z, X)
  const wobble = 0.16 * Math.sin(a * 3 + 0.6) + 0.1 * Math.sin(a * 5 + 2.1) + 0.12 * fbm3(x * 0.8, 0, z * 0.8, 11, 3)
  return r - (4.15 + wobble)
}

/** The island's sand, exactly as the tile draws it */
export const compositionTerrain = samplerFrom((x, z) => beachHeight(compositionShore, x, z), 0)

/** Camera presets: where it looks from, and how much of the world fits across the view */
/** 'focus': close on the selected item */
export type CompositionView = 'portrait' | 'overview' | 'water' | 'focus'
export const COMPOSITION_VIEWS: { id: CompositionView; name: string; note: string }[] = [
  {
    id: 'portrait',
    name: 'Mobile portrait',
    note: "The phone's landing view: the native app's angle and width, on a portrait screen"
  },
  { id: 'overview', name: 'Isometric', note: 'The whole diorama at the world’s isometric angle' },
  { id: 'water', name: 'Water level', note: 'Low over the water, looking in at the island' }
]
