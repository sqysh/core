import { PALETTES } from '@/app/(authenticated)/(active)/attendance/_lib/boats'
import { hashString } from '@/app/(authenticated)/(active)/attendance/_lib/random'

// What a member's boat is, as stored: its class, its colours and finish, and (for the boat every member builds) its
// vessel level and the accessories fitted to it. Shared by the harbor scenes (which draw it), the server (which
// validates every save) and the Garage. What each part and accessory is, costs and needs lives in items.ts.
//
// The modular boat is built from real parts (hull, helm, seats, engine, canopy, rig...). Members don't buy those one
// by one: each vessel level (STAGES) is a set of them, so upgrading the vessel rebuilds the boat from the next set. On
// top of its level a boat carries the accessories its member chose, each in a deck zone the level has room in.
//
// Every id here is stored in the database (MemberVessel, VesselUnlock), so ids are only ever added, never renamed or
// reused.

/**
 * The modular boat every member builds part by part (`modular`), and the three hand-built classes from before it, kept
 * for anyone who already sails one (their saved boat is never changed under them)
 */
export const VESSEL_CLASSES = ['runabout', 'lobster', 'sloop', 'modular'] as const
export type VesselClassId = (typeof VESSEL_CLASSES)[number]
export const HERITAGE_CLASSES = ['runabout', 'lobster', 'sloop'] as const
export type HeritageClassId = (typeof HERITAGE_CLASSES)[number]
export const isHeritage = (c: VesselClassId): c is HeritageClassId => c !== 'modular'

export const SAIL_PATTERNS = ['plain', 'band', 'stripes'] as const
export type SailPattern = (typeof SAIL_PATTERNS)[number]

/** Flags on the heritage classes (the modular boat's flags are parts) */
export const ACCESSORIES = ['ensign', 'burgee'] as const
export type AccessoryId = (typeof ACCESSORIES)[number]

/** How the paint is finished: matte (no shine at all), satin, or gloss (the clear-coated look the harbor always had) */
export const FINISHES = ['matte', 'satin', 'gloss'] as const
export type Finish = (typeof FINISHES)[number]
export const FINISH_NAMES: Record<Finish, string> = { matte: 'Matte', satin: 'Satin', gloss: 'Gloss' }

/** Paints beyond the basic lockers, each its own unlock. Their colours are distinctive so no basic swatch matches one. */
export const PREMIUM_PAINTS = [
  { id: 'paint:gold-leaf', hex: '#c9a24b', name: 'Gold leaf' },
  { id: 'paint:pearl', hex: '#f3efe6', name: 'Pearl' },
  { id: 'paint:abyss', hex: '#0b2a3c', name: 'Abyss blue' }
] as const

/** Where accessories go on the boat; each vessel level has room for so many rows of them in each */
export const ZONES = ['bow', 'aft', 'roof', 'upper', 'stern'] as const
export type ZoneId = (typeof ZONES)[number]
/** A zone's room: rows along the boat, each `lanes` accessories wide (port and starboard, or one across) */
export type ZoneRoom = { rows: number; lanes: 1 | 2 }

export type Stage = {
  id: string
  level: number
  name: string
  blurb: string
  /** The level it's built up from (null for the starter) */
  from: string | null
  /** The boat's structure at this level: every part it's built from */
  parts: readonly string[]
  /** Room for accessories in each zone */
  room: Partial<Record<ZoneId, ZoneRoom>>
}

const skiff = ['hull:skiff', 'helm:tiller', 'engine:small', 'seat:bench']
const launch = [
  'hull:long',
  'hull:rub-rail',
  'hull:gunwale-caps',
  'helm:side',
  'helm:windshield',
  'engine:large',
  'seat:bench',
  'seat:stern'
]
const centerConsole = [
  'hull:long',
  'hull:wide',
  'hull:rub-rail',
  'hull:gunwale-caps',
  'hull:transom',
  'helm:center',
  'helm:windshield',
  'helm:throttle',
  'seat:post',
  'seat:cooler',
  'seat:stern',
  'engine:large',
  'top:poles',
  'top:hardtop'
]
const cruiserHull = [
  'hull:cruiser',
  'hull:raised-bow',
  'hull:transom',
  'hull:side-rails',
  'hull:rub-rail',
  'hull:gunwale-caps',
  'hull:keel'
]
const voyagerHull = [
  'hull:voyager',
  'hull:wide',
  'hull:deep',
  'hull:raised-bow',
  'hull:transom',
  'hull:side-rails',
  'hull:rub-rail',
  'hull:gunwale-caps',
  'hull:keel',
  'hull:swim-platform'
]
const rig = ['top:mast', 'top:boom', 'top:rigging', 'top:sails']

/**
 * The vessel levels, in order. From the Center Console a member chooses a path: the Cruiser toward the Flybridge Yacht
 * and the Grand Yacht, or the Sloop toward the Bluewater Sloop. Ids are stored (VesselUnlock 'stage:<id>'), so they're
 * only ever added.
 */
export const STAGES = {
  skiff: {
    id: 'skiff',
    level: 1,
    name: 'Skiff',
    blurb: 'Small, open and well-used. Everyone starts here.',
    from: null,
    parts: skiff,
    room: { bow: { rows: 1, lanes: 2 }, aft: { rows: 1, lanes: 2 }, stern: { rows: 1, lanes: 2 } }
  },
  launch: {
    id: 'launch',
    level: 2,
    name: 'Launch',
    blurb: 'A longer hull, a wheel console and a windshield, a bigger outboard and a stern bench.',
    from: 'skiff',
    parts: launch,
    room: { bow: { rows: 1, lanes: 2 }, aft: { rows: 2, lanes: 2 }, stern: { rows: 1, lanes: 2 } }
  },
  console: {
    id: 'console',
    level: 3,
    name: 'Center Console',
    blurb: 'A wider hull with a center console, leaning post and a hard top.',
    from: 'launch',
    parts: centerConsole,
    room: {
      bow: { rows: 2, lanes: 2 },
      aft: { rows: 2, lanes: 2 },
      roof: { rows: 1, lanes: 2 },
      stern: { rows: 1, lanes: 2 }
    }
  },
  cruiser: {
    id: 'cruiser',
    level: 4,
    name: 'Cruiser',
    blurb: 'A 2.5 m motorboat: navigation console, captain’s chairs, twin outboards.',
    from: 'console',
    parts: [
      ...cruiserHull,
      'hull:wide',
      'helm:nav',
      'helm:windshield',
      'helm:throttle',
      'helm:instruments',
      'seat:captain',
      'seat:passenger',
      'seat:cooler',
      'seat:stern',
      'seat:storage',
      'engine:twin',
      'top:poles',
      'top:hardtop'
    ],
    room: {
      bow: { rows: 2, lanes: 2 },
      aft: { rows: 3, lanes: 2 },
      roof: { rows: 2, lanes: 2 },
      stern: { rows: 1, lanes: 2 }
    }
  },
  sloop: {
    id: 'sloop',
    level: 4,
    name: 'Sloop',
    blurb: 'The sailboat path: a 2.5 m hull with a keel, mast, boom and sails.',
    from: 'console',
    parts: [
      ...cruiserHull,
      'hull:wide',
      'helm:side',
      'helm:windshield',
      'seat:stern',
      'seat:captain',
      'engine:large',
      ...rig
    ],
    room: { bow: { rows: 3, lanes: 2 }, aft: { rows: 3, lanes: 2 }, stern: { rows: 1, lanes: 2 } }
  },
  yacht: {
    id: 'yacht',
    level: 5,
    name: 'Flybridge Yacht',
    blurb: 'A 3.1 m yacht: a wheelhouse, a flybridge on top, an inboard diesel and a swim platform.',
    from: 'cruiser',
    parts: [
      ...voyagerHull,
      'helm:nav',
      'helm:windshield',
      'helm:throttle',
      'helm:instruments',
      'seat:stern',
      'seat:storage',
      'engine:inboard',
      'top:wheelhouse',
      'top:flybridge'
    ],
    room: {
      bow: { rows: 3, lanes: 2 },
      aft: { rows: 3, lanes: 2 },
      roof: { rows: 1, lanes: 2 },
      upper: { rows: 2, lanes: 2 },
      stern: { rows: 2, lanes: 2 }
    }
  },
  bluewater: {
    id: 'bluewater',
    level: 5,
    name: 'Bluewater Sloop',
    blurb: 'A 3.1 m ocean sailer with a swim platform and room for a crew.',
    from: 'sloop',
    parts: [
      ...voyagerHull,
      'helm:side',
      'helm:windshield',
      'helm:instruments',
      'seat:stern',
      'seat:captain',
      'seat:passenger',
      'seat:storage',
      'engine:inboard',
      ...rig
    ],
    room: { bow: { rows: 3, lanes: 2 }, aft: { rows: 4, lanes: 2 }, stern: { rows: 2, lanes: 2 } }
  },
  grand: {
    id: 'grand',
    level: 6,
    name: 'Grand Yacht',
    blurb: 'A 3.8 m yacht with a sky roof over the flybridge: three levels, and room for anything.',
    from: 'yacht',
    parts: [
      ...voyagerHull.map((p) => (p === 'hull:voyager' ? 'hull:grand' : p)),
      'helm:nav',
      'helm:windshield',
      'helm:throttle',
      'helm:instruments',
      'seat:stern',
      'seat:storage',
      'engine:inboard',
      'top:wheelhouse',
      'top:flybridge',
      'top:sky-roof'
    ],
    room: {
      bow: { rows: 4, lanes: 2 },
      aft: { rows: 5, lanes: 2 },
      roof: { rows: 2, lanes: 2 },
      upper: { rows: 3, lanes: 2 },
      stern: { rows: 2, lanes: 2 }
    }
  }
} as const satisfies Record<string, Stage>
export type StageId = keyof typeof STAGES
export const STAGE_IDS = Object.keys(STAGES) as StageId[]
export const isStageId = (id: string): id is StageId => id in STAGES
export const stageDef = (id: StageId): Stage => STAGES[id]
/** Every part any level is built from: these come with a level, never on their own */
export const STRUCTURAL = new Set<string>(STAGE_IDS.flatMap((id) => STAGES[id].parts))

/** The starter skiff's parts (kept for anything that still asks for the starter's structure) */
export const STARTER_PARTS = STAGES.skiff.parts

/**
 * Everything beyond hull, trim, accent and sails: the other painted parts, the finish, and the modular boat's parts.
 * Anything left unset keeps the boat's own look: seats follow the cabin colour, the deck stays bare teak, fittings stay
 * chrome and steel, the finish is gloss.
 */
export type VesselDetails = {
  cabinColor?: string
  roofColor?: string
  bottomColor?: string
  seatsColor?: string
  deckColor?: string
  equipmentColor?: string
  finish?: Finish
  /** The modular boat's vessel level (the starter skiff until upgraded) */
  stage?: StageId
  /** The accessories fitted to it (item ids, items.ts); its structure comes from its level */
  parts?: string[]
}

/** A member's boat as stored and as drawn: what they sail and how it's dressed */
export type VesselConfig = {
  vesselClass: VesselClassId
  hullColor: string
  trimColor: string
  accentColor: string
  sailColor: string
  sailPattern: SailPattern
  accessories: AccessoryId[]
  details: VesselDetails
}

/** Every colour a configuration paints with */
export const paintsOf = (c: VesselConfig) =>
  [
    c.hullColor,
    c.trimColor,
    c.accentColor,
    c.sailColor,
    c.details.cabinColor,
    c.details.roofColor,
    c.details.bottomColor,
    c.details.seatsColor,
    c.details.deckColor,
    c.details.equipmentColor
  ]
    .filter((x): x is string => !!x)
    .map((x) => x.toLowerCase())

/** The modular boat's vessel level */
export const stageOf = (c: Pick<VesselConfig, 'details'>): StageId => c.details.stage ?? 'skiff'
/** The accessories fitted to a modular boat (anything structural stored with them comes from the level instead) */
export const accessoriesOf = (c: Pick<VesselConfig, 'details'>): string[] =>
  (c.details.parts ?? []).filter((p) => !STRUCTURAL.has(p))
/** Every part a modular boat is drawn with: its level's structure, then its accessories */
export const partsOf = (c: Pick<VesselConfig, 'details'>): string[] => [
  ...STAGES[stageOf(c)].parts,
  ...accessoriesOf(c)
]

/**
 * The items a configuration uses, by id, so the server can check each is owned: its class, sail pattern and finish,
 * any premium paint, its flags (heritage classes), or its vessel level and every accessory (the modular boat)
 */
export const equippedItems = (c: VesselConfig): string[] => {
  const paints = new Set(paintsOf(c))
  return [
    `class:${c.vesselClass}`,
    `pattern:${c.sailPattern}`,
    `finish:${c.details.finish ?? 'gloss'}`,
    ...c.accessories.map((a) => `accessory:${a}`),
    ...PREMIUM_PAINTS.filter((p) => paints.has(p.hex)).map((p) => p.id),
    ...(c.vesselClass === 'modular' ? [`stage:${stageOf(c)}`, ...accessoriesOf(c)] : [])
  ]
}

/**
 * The boat a member sails until they save one in the Garage: the starter skiff, painted in the colours their id has
 * always given them (the same hash and palettes as the 2D harbor board), so the harbor stays easy to read and it's
 * identical on every screen, device and visit.
 */
export function defaultVesselConfig(memberId: string): VesselConfig {
  const h = hashString(memberId)
  // the palette pick is unchanged from before the starter boat, so every member keeps their colours
  const p = PALETTES[Math.floor(h / 3) % PALETTES.length]
  return {
    vesselClass: 'modular',
    hullColor: p.hull,
    trimColor: p.trim,
    accentColor: p.accent,
    sailColor: p.sail,
    sailPattern: 'plain',
    accessories: [],
    details: { cabinColor: p.cabin, roofColor: p.roof, stage: 'skiff', parts: [] }
  }
}
