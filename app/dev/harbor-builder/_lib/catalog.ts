// Every model the harbor builder can place. Each is a Meshy GLB in public/models/environment (or a derivative of one),
// loaded as it is on disk. Meshy exports each model about 1.9 units across, whatever it is, so each gets a size in the
// world here: its height (buildings, trees) or its wider side (landforms, paths, props), measured from its real
// bounding box when it loads. A scene object's scale multiplies that size. World units follow the CORE world's (the
// old lighthouse tile is 10 units across).

export type ModelKind = 'land' | 'islet' | 'path' | 'structure' | 'prop' | 'tree' | 'plant'

export type ModelDef = {
  id: string
  name: string
  file: string
  kind: ModelKind
  /** Its size in the world at scale 1: the measured dimension (`by`) scales to this many units */
  size: number
  by: 'height' | 'width'
  /** Has a derivative with Meshy's painted water removed (scripts/environment/clean-water.mjs) */
  cleaned?: boolean
  /** "Drop to ground" leaves it where it is (the bridge spans water; land is set by hand) */
  free?: boolean
  /** The section it's listed under in the Add Model library (within its kind): for finding it, nothing else reads it */
  group?: string
}

export const KINDS: { kind: ModelKind; name: string }[] = [
  { kind: 'land', name: 'Terrain' },
  { kind: 'islet', name: 'Islets and rocks' },
  { kind: 'path', name: 'Paths and stairs' },
  { kind: 'structure', name: 'Buildings and bridges' },
  { kind: 'prop', name: 'Fences and walls' },
  { kind: 'tree', name: 'Trees' },
  { kind: 'plant', name: 'Plants and flowers' }
]

const base = '/models/environment'
const m = (
  id: string,
  name: string,
  file: string,
  kind: ModelKind,
  size: number,
  by: 'height' | 'width',
  extra: Partial<ModelDef> = {}
): ModelDef => ({ id, name, file: `${base}/${file}`, kind, size, by, ...extra })

const land = { cleaned: true, free: true }
/** The library's sections: `group` is what a model is listed under, in the order the entries run */
const g = (group: string, extra: Partial<ModelDef> = {}): Partial<ModelDef> => ({ group, ...extra })

export const MODELS: ModelDef[] = [
  // Terrain
  m('cliff-plateau', 'Cliff plateau', 'terrain/03-cliff-plateau.glb', 'land', 12, 'width', g('Cliffs and hills', { free: true })),
  m('cliff-concave', 'Cliff, concave', 'terrain/07-cliff-concave.glb', 'land', 10, 'width', g('Cliffs and hills', { free: true })),
  m('mountain-rounded', 'Rounded mountain', 'terrain/12-mountain-rounded.glb', 'land', 14, 'width', g('Cliffs and hills', { free: true })),
  m('ridge-long', 'Ridge, long', 'terrain/13-ridge-long.glb', 'land', 12, 'width', g('Cliffs and hills', { free: true })),
  m('shore-rock-islet', 'Shore rock islet', 'terrain/15-shore-rock-islet.glb', 'land', 8, 'width', g('Cliffs and hills', { free: true })),
  m('rock-steps', 'Rock steps', 'terrain/18-rock-steps.glb', 'land', 10, 'width', g('Cliffs and hills', { free: true })),
  m('cliff-arch', 'Cliff arch', 'terrain/19-cliff-arch.glb', 'land', 10, 'width', g('Cliffs and hills', { free: true })),
  m('grassy-cliff-overhang', 'Grassy cliff overhang', 'terrain/grassy-cliff-overhang-01.glb', 'land', 10, 'width', g('Cliffs and hills', { free: true })),
  m('jetti-connector-cliff', 'Wooden jetty to cliff', 'terrain/jetti-connector-cliff-01.glb', 'land', 8, 'width', g('Jetty connectors', { free: true })),
  m('sandy-jetti-connector', 'Sandy jetty to cliff', 'terrain/sandy-jetti-connector-01.glb', 'land', 8, 'width', g('Jetty connectors', { free: true })),

  // Islets and rocks
  m('granite-rock-islet-bare', 'Granite boulder', 'islands/granite-rock-islet-bare-01.glb', 'islet', 4, 'width', g('Rocks', land)),
  m('pine-flower-islet', 'Islet: pines and flowers', 'islands/pine-flower-islet-01.glb', 'islet', 6, 'width', g('Planted islets', land)),
  m('mixed-trees-islet', 'Islet: oak and pine', 'islands/mixed-trees-islet-01.glb', 'islet', 6, 'width', g('Planted islets', land)),
  m('wooded-granite-islet', 'Islet: wooded granite', 'islands/wooded-granite-islet-01.glb', 'islet', 7, 'width', g('Planted islets', land)),
  m('low-shrub-islet', 'Islet: low shrubs', 'islands/low-shrub-islet-01.glb', 'islet', 6, 'width', g('Planted islets', land)),
  m('wooded-coastal-islet', 'Islet: beach and trees', 'islands/wooded-coastal-islet-01.glb', 'islet', 9, 'width', g('Planted islets', land)),
  m('sandy-jetti', 'Sandy jetty strip', 'islands/sandy-jetti.glb', 'islet', 8, 'width', g('Sand and jetties', { free: true })),

  // Paths and stairs
  m('cliff-stairs', 'Stairs up a cliff', 'paths/s-path-left.glb', 'path', 6, 'width', g('Stairs', { free: true })),
  m('stone-stairs-wide', 'Stone stairs (wide)', 'paths/stone-stairs-wide-01.glb', 'path', 5, 'width', g('Stairs', { free: true })),
  m('path-straight', 'Path (straight)', 'paths/long-path-straight-01.glb', 'path', 6, 'width', g('Paths', { free: true })),
  m('path-curve-left', 'Path (curve left)', 'paths/curved-path-left.glb', 'path', 6, 'width', g('Paths', { free: true })),
  m('path-curve-right', 'Path (curve right)', 'paths/curved-path-right.glb', 'path', 6, 'width', g('Paths', { free: true })),

  // Buildings and bridges
  m('lighthouse', 'Lighthouse', 'structures/lighthouse-tall-01.glb', 'structure', 13.5, 'height', g('Buildings')),
  m('keepers-cottage', "Keeper's cottage", 'structures/keepers-cottage-red-roof-01.glb', 'structure', 5.4, 'height', g('Buildings')),
  m('stone-cabin', 'Stone cabin, blue roof', 'structures/small-stone-cabin-blue-roof.glb', 'structure', 5, 'height', g('Buildings')),
  m('stone-house', 'Stone house, blue roof', 'structures/small-stone-house-blue-roof.glb', 'structure', 5, 'height', g('Buildings')),
  m('stone-bridge', 'Stone arch bridge', 'structures/stone-bridge.glb', 'structure', 8, 'width', g('Bridges', { free: true })),

  // Fences and walls
  m('fence-straight', 'Wooden fence', 'structures/wood-fence-straight-01.glb', 'prop', 3, 'width', g('Fences')),
  m('fence-corner', 'Fence corner on paving', 'structures/wood-fence-stone-corner-01.glb', 'prop', 3, 'width', g('Fences')),
  m('stone-retaining-wall', 'Stone retaining wall', 'structures/stone-retaining-wall-01.glb', 'prop', 4, 'width', g('Walls')),

  // Trees (the second name of a pair is another entry for the same file: both stay, scenes use either)
  m('white-pine-tall', 'White pine (tall)', 'trees/pine-tall-bright-01.glb', 'tree', 5.2, 'height', g('Pines')),
  m('pine-tall-bright', 'Pine (tall, bright)', 'trees/pine-tall-bright-01.glb', 'tree', 5.2, 'height', g('Pines')),
  m('white-pine-medium', 'White pine (medium)', 'trees/pine-medium-rounded-01.glb', 'tree', 4.4, 'height', g('Pines')),
  m('pine-medium-rounded', 'Pine (medium, rounded)', 'trees/pine-medium-rounded-01.glb', 'tree', 4.4, 'height', g('Pines')),
  m('white-pine-small', 'White pine (small)', 'trees/pine-sapling-01.glb', 'tree', 3.4, 'height', g('Pines')),
  m('pine-sapling', 'Pine sapling', 'trees/pine-sapling-01.glb', 'tree', 2.8, 'height', g('Pines')),
  m('pine-narrow-spire', 'Pine (narrow spire)', 'trees/pine-narrow-spire-01.glb', 'tree', 5.0, 'height', g('Pines')),
  m('pine-windswept', 'Windswept pine', 'trees/pine-windswept-01.glb', 'tree', 3.8, 'height', g('Pines')),
  m('coastal-oak-rounded', 'Coastal oak (rounded)', 'trees/ornamental-compact-01.glb', 'tree', 4.2, 'height', g('Oaks and broadleaf')),
  m('ornamental-compact', 'Ornamental tree', 'trees/ornamental-compact-01.glb', 'tree', 3.5, 'height', g('Oaks and broadleaf')),
  m('coastal-oak-leaning', 'Coastal oak (leaning)', 'trees/oak-leaning-01.glb', 'tree', 4.2, 'height', g('Oaks and broadleaf')),
  m('oak-leaning', 'Oak (leaning)', 'trees/oak-leaning-01.glb', 'tree', 4.2, 'height', g('Oaks and broadleaf')),
  m('oak-twin-trunk', 'Oak (twin trunk)', 'trees/oak-twin-trunk-01.glb', 'tree', 4.5, 'height', g('Oaks and broadleaf')),

  // Plants and flowers
  m('purple-coastal-flowers', 'Purple coastal flowers', 'plants/purple-coastal-flowers-01.glb', 'plant', 1.8, 'width', g('Flowers')),
  m('beach-grass-green', 'Beach grass', 'plants/beach-grass-green-01.glb', 'plant', 1.8, 'width', g('Grasses and moss')),
  m('beach-grass-plumes', 'Beach grass with plumes', 'plants/beach-grass-plumes-01.glb', 'plant', 1.8, 'width', g('Grasses and moss')),
  m('hanging-moss', 'Hanging moss', 'plants/hanging-moss-rock-edge-01.glb', 'plant', 2.4, 'width', g('Grasses and moss'))
]

/**
 * Files in the folders the builder leaves out: byte-for-byte copies of other models, so the asset they're named for
 * was never actually exported.
 */
export const MISLABELLED = [
  { file: 'paths/stone-stairs-narrow-01.glb', copyOf: 'islands/pine-flower-islet-01.glb' },
  { file: 'structures/wood-fence-end-01.glb', copyOf: 'structures/stone-retaining-wall-01.glb' },
  { file: 'trees/cypress-tall-01.glb', copyOf: 'trees/pine-tall-bright-01.glb' }
]

const byId = new Map(MODELS.map((d) => [d.id, d]))
export const modelById = (id: string) => byId.get(id)

/** Which files to draw: Meshy exports as-is, cleaned derivatives (land only), or decimated drafts (~10% tris, editor perf) */
export type Source = 'cleaned' | 'original' | 'draft'

export const fileOf = (d: ModelDef, source: Source) => {
  if (source === 'draft') return d.file.replace('/models/environment/', '/models/environment-derived/draft/')
  if (source === 'cleaned' && d.cleaned)
    return d.file.replace('/models/environment/', '/models/environment-derived/cleaned/')
  return d.file
}

export const lodFileOf = (d: ModelDef, level: 'medium' | 'low') =>
  d.file.replace('/models/environment/', `/models/environment-derived/lod/${level}/`)

/** Land: what trees, buildings and props stand on, and what the sea's shallows are baked from */
export const isGround = (d: ModelDef) => d.kind === 'land' || d.kind === 'islet' || d.kind === 'path'
export const isCoast = (d: ModelDef) => d.kind === 'land' || d.kind === 'islet'

/** How far "Drop to ground" sinks a model, as a share of its height (trees and props stand on grass pads) */
export const SINK: Record<ModelKind, number> = {
  land: 0,
  islet: 0,
  path: 0.05,
  structure: 0.02,
  prop: 0.06,
  tree: 0.03,
  plant: 0.12
}
