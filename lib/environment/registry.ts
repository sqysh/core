import { buildCoastalLedge } from './granite/coastalLedge'
import { buildFacetedOutcrop } from './granite/facetedOutcrop'
import { buildSculptedLedge } from './granite/sculptedLedge'
import { AssetCategory, AssetRecipe } from './core/types'

// Every asset in the CORE environment library, by category, after the coast around Coolidge Point in
// Manchester-by-the-Sea. Planned assets are listed so the library's shape is visible; each is built and approved one
// category at a time before anything goes into the world.

export const CATEGORIES: { id: AssetCategory; name: string }[] = [
  { id: 'granite', name: 'Granite' },
  { id: 'trees', name: 'Trees' },
  { id: 'vegetation', name: 'Vegetation' }
]

const planned = (id: string, name: string, category: AssetCategory, description: string): AssetRecipe => ({
  id,
  name,
  category,
  description,
  status: 'planned',
  variations: 0
})

export const ASSETS: AssetRecipe[] = [
  {
    id: 'granite-sculpted-ledge',
    name: 'Sculpted coastal ledge',
    category: 'granite',
    description:
      'The benchmark: tiered granite headland built like a kit-bashed diorama. Flat plateaus, rims of narrow striated columns with broken tops and sheeting ledges, rubble at the foot, and ray-traced occlusion baked into every crevice.',
    status: 'ready',
    variations: 12,
    build: buildSculptedLedge
  },
  {
    id: 'granite-coastal-formation',
    name: 'Coastal granite formation',
    category: 'granite',
    description:
      'Sheeted bedrock ledge stepping down to the sea: glacially rounded tops, plucked seaward fractures, open joints, fallen blocks, lichen and moss.',
    status: 'ready',
    variations: 12,
    build: buildCoastalLedge
  },
  {
    id: 'granite-faceted-outcrop',
    name: 'Faceted granite outcrop (experimental)',
    category: 'granite',
    description:
      'Modelled like authored game geology: interlocking polygonal rock chunks with flat fracture planes and narrow chamfered edges, in deliberate tiers stepping down to the sea, with angular fragments round the base.',
    status: 'ready',
    variations: 12,
    build: buildFacetedOutcrop
  },
  planned('granite-bedrock-ledge', 'Bedrock ledge', 'granite', 'Low, smooth whaleback ledge breaking the surface of the ground.'),
  planned('granite-cliff', 'Fractured granite cliff', 'granite', 'Tall jointed cliff face for headlands and coves.'),
  planned('granite-glacial-boulder', 'Glacial boulder', 'granite', 'Rounded erratic, partly buried.'),
  planned('granite-mossy-rock', 'Moss-covered rock', 'granite', 'Woodland rock under moss and fern.'),
  planned('granite-shore-rock', 'Shoreline rock', 'granite', 'Partly submerged rock with the tide zones.'),
  planned('granite-stones', 'Small stones', 'granite', 'Cobbles and pebbles, instanced.'),
  planned('tree-white-pine', 'Eastern white pine', 'trees', 'Tall, layered, soft-needled pine.'),
  planned('tree-pitch-pine', 'Windswept pitch pine', 'trees', 'Gnarled, leaning coastal pine.'),
  planned('tree-red-cedar', 'Eastern red cedar', 'trees', 'Narrow, dense, dark juniper.'),
  planned('tree-coastal-oak', 'Coastal oak', 'trees', 'Broad, low, wind-pruned oak.'),
  planned('veg-bayberry', 'Bayberry', 'vegetation', 'Dense, glossy coastal shrub.'),
  planned('veg-beach-rose', 'Beach rose', 'vegetation', 'Rugosa rose with pink blooms and hips.'),
  planned('veg-juniper', 'Low juniper', 'vegetation', 'Creeping juniper mats over ledge.'),
  planned('veg-grasses', 'Coastal grasses', 'vegetation', 'Beach grass and switchgrass clumps.'),
  planned('veg-ferns-moss', 'Ferns and moss', 'vegetation', 'Hay-scented fern and moss cushions.')
]
