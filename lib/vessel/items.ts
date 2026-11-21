import {
  accessoriesOf,
  equippedItems,
  isHeritage,
  isStageId,
  partsOf,
  STAGE_IDS,
  stageDef,
  StageId,
  stageOf,
  STAGES,
  STRUCTURAL,
  VesselConfig,
  ZoneId,
  ZONES
} from './catalog'

// Every item a boat can carry, as data, and the rules for having and fitting them. Three kinds:
//   vessel levels   'stage:<id>' (catalog.ts, STAGES): Upgrade Vessel buys the next one, and the boat is rebuilt from
//                   its set of structural parts
//   structural parts the real pieces the levels are built from (hulls, consoles, seats, engines, canopies, the rig):
//                   they come with a level, never on their own, and any a member bought earlier counts toward the
//                   level that includes them
//   accessories     what members choose to fit (`custom`): each unlocks at a vessel level, is bought separately, needs
//                   compatible parts to mount on, and takes room in a deck zone the level has space in
// plus paints, finishes and sail patterns. The server validates saves and purchases with these rules and the Garage
// draws its menus from them, so a new accessory is an entry here plus its model in the harbor.
//
// How items are had:
//   free         the starter skiff and everything basic: every locker paint (black included), all three finishes
//   credits      Shipyard credits, earned from what a member does for CORE (counted on the server from confirmed
//                records, so nothing is granted by opening a page), spent on levels and accessories as they choose
//   heritage     the hand-built classes from before the modular boat, kept by anyone who already sails one
//   planned:     treasure, achievement, event and purchase items are in the catalog so members can see what's coming,
//                but nothing grants them yet. Purchases will go through Stripe and be granted by its verified webhook.

// ─── progress ──────────────────────────────────────────────────────────────────

/** What a member has done, counted on the server from records another member (or the meeting) confirmed */
export type Stats = {
  /** Meetings checked in to */
  meetings: number
  /** 1-2-1s completed */
  oneToOnes: number
  /** Referrals given that the receiver acknowledged */
  referrals: number
  /** Thanks for closed business: business closed from a referral they gave, reported by the member who closed it */
  tyfcb: number
  /** Closed business they reported */
  closed: number
}
export const STAT_KEYS = [
  'meetings',
  'oneToOnes',
  'referrals',
  'tyfcb',
  'closed'
] as const satisfies readonly (keyof Stats)[]
export const STAT_NAMES: Record<keyof Stats, { one: string; many: string }> = {
  meetings: { one: 'meeting', many: 'meetings' },
  oneToOnes: { one: '1-2-1', many: '1-2-1s' },
  referrals: { one: 'referral', many: 'referrals' },
  tyfcb: { one: 'TYFCB', many: 'TYFCBs' },
  closed: { one: 'closed deal', many: 'closed deals' }
}
/** Shipyard credits each one earns */
export const CREDITS_PER: Record<keyof Stats, number> = { meetings: 1, oneToOnes: 1, referrals: 2, tyfcb: 2, closed: 1 }
export const NO_STATS: Stats = { meetings: 0, oneToOnes: 0, referrals: 0, tyfcb: 0, closed: 0 }
export const creditsEarned = (s: Stats) => STAT_KEYS.reduce((n, k) => n + s[k] * CREDITS_PER[k], 0)
export const statLabel = (k: keyof Stats, n: number) => `${n} ${n === 1 ? STAT_NAMES[k].one : STAT_NAMES[k].many}`

// ─── the catalog ───────────────────────────────────────────────────────────────

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const
export type Rarity = (typeof RARITIES)[number]
export const RARITY_NAMES: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary'
}

export const COLLECTIONS = {
  starter: { name: 'Starter', blurb: 'Where every Navigator begins.' },
  shipyard: { name: 'Shipyard', blurb: 'The boat itself, level by level.' },
  helm: { name: 'Helm & Comfort', blurb: 'Consoles, controls and somewhere good to sit.' },
  workboat: { name: 'Working Harbor', blurb: 'Gear for a boat that earns its keep.' },
  bluewater: { name: 'Bluewater', blurb: 'Masts, canvas and the kit for open water.' },
  evening: { name: 'Evening Harbor', blurb: 'Lanterns and lights for after dark.' },
  leisure: { name: 'Leisure Deck', blurb: 'Hot tubs, slides, pools and gardens: the fun stuff.' },
  heritage: { name: 'Heritage', blurb: 'The hand-built boats from the first harbor.' },
  treasure: { name: 'Treasure Finds', blurb: 'Found, not bought.' },
  milestones: { name: 'Milestones', blurb: 'Earned by showing up for CORE.' },
  seasonal: { name: 'Seasonal', blurb: 'Here for a season, kept for good.' },
  premium: { name: 'Shipwright', blurb: 'Optional extras that support the chapter.' }
} as const
export type CollectionId = keyof typeof COLLECTIONS

/** Where a part goes on the boat */
export const CATEGORIES = {
  hull: { name: 'Hull', blurb: 'Hull & structure' },
  helm: { name: 'Helm', blurb: 'Helm & controls' },
  seats: { name: 'Seating', blurb: 'Seating & interior' },
  engine: { name: 'Engine', blurb: 'Propulsion & stern' },
  deck: { name: 'Deck', blurb: 'Deck & work gear' },
  top: { name: 'Top', blurb: 'Canopy, upper deck & rig' },
  style: { name: 'Style', blurb: 'Identity & decoration' },
  perf: { name: 'Performance', blurb: 'Equipment that changes how she handles' },
  leisure: { name: 'Leisure', blurb: 'The fun stuff' }
} as const
export type CategoryId = keyof typeof CATEGORIES

/** Parts of which a boat carries one at a time; a boat always has one of each `required` group */
export const GROUPS = {
  hull: { name: 'Hull length', required: true },
  helm: { name: 'Helm', required: true },
  engine: { name: 'Engine', required: true },
  canopy: { name: 'Canopy', required: false },
  fwdseat: { name: 'Forward seat', required: false },
  helmseat: { name: 'Helm seat', required: false }
} as const
export type GroupId = keyof typeof GROUPS

/** The kind of boat it's becoming: which accessories suit it follows from it */
export type BoatPath = 'skiff' | 'motor' | 'sail'
export const PATH_NAMES: Record<BoatPath, string> = { skiff: 'Skiff', motor: 'Motorboat', sail: 'Sailboat' }

export const ZONE_NAMES: Record<ZoneId, string> = {
  bow: 'Foredeck',
  aft: 'Aft deck',
  roof: 'Roof',
  upper: 'Flybridge deck',
  stern: 'Stern'
}

export type Price =
  | { kind: 'free' }
  | { kind: 'credits'; credits: number }
  | { kind: 'heritage' }
  | { kind: 'treasure'; hint: string }
  | { kind: 'achievement'; name: string }
  | { kind: 'event'; name: string }
  | { kind: 'purchase'; price: string }

/** The ways of getting an item that work today; the rest are planned */
export const LIVE_PRICES: Price['kind'][] = ['free', 'credits', 'heritage']

/** An accessory: the vessel level it unlocks at, and the room it takes (none for a fitting on its own mount) */
export type Custom = {
  level: number
  /** Deck zones it can go in, in order of preference */
  zones?: ZoneId[]
  /** Full rows of a zone it fills (a hot tub, a pool); otherwise it takes one spot in a row */
  rows?: number
}

/**
 * What a piece of functional equipment does to her handling: factors on top speed, acceleration, turn rate, roll (below
 * 1 is steadier) and range, and floors for roll damping and for steerage at a standstill. The layout applies them to
 * her spec (vessel/modular.ts), which is what the harbor's controller sails her by.
 */
export type Effect = {
  cruise?: number
  accel?: number
  turn?: number
  roll?: number
  range?: number
  damping?: number
  steerage?: number
}

/**
 * Things a boat can do, granted by what she carries. They come with Free Sail (the member's own helm), which reads
 * them; none bears on treasure, or on anything won with real money.
 */
export const ABILITIES = {
  anchor: { name: 'Anchor anywhere', blurb: 'Drop anchor wherever you like and lie to it.' },
  fishing: { name: 'Fishing', blurb: 'Cast a line at the harbor’s fishing spots.' },
  lobstering: { name: 'Lobstering', blurb: 'Set traps and haul them on your rounds.' },
  radar: { name: 'Radar', blurb: 'See other boats and landmarks beyond your view (never treasure).' },
  night: { name: 'Night running', blurb: 'Sail after dark by your own light.' },
  swim: { name: 'Swim stops', blurb: 'Stop anywhere for a swim off the stern.' },
  host: { name: 'Deck parties', blurb: 'Invite other Navigators aboard to hang out.' },
  tender: { name: 'Jet ski tender', blurb: 'Launch a jet ski to reach beaches she can’t.' },
  sail: { name: 'Under sail', blurb: 'Sail with the wind, quiet and far.' }
} as const
export type AbilityId = keyof typeof ABILITIES

export type ItemDef = {
  name: string
  blurb: string
  rarity: Rarity
  collection: CollectionId
  price: Price
  /** A boat part: where it goes, and the group it's one of (if any) */
  category?: CategoryId
  group?: GroupId
  /** An accessory members choose and fit; anything else that's a part comes with a vessel level */
  custom?: Custom
  /** Before it can be had: milestones (counts of what they've done), and items already owned */
  needs?: Partial<Stats> & { owns?: string[] }
  /** Before it can be fitted: all of `requires`, one of `requiresAny`, a hull at least this long, none of `excludes` */
  fit?: { requires?: string[]; requiresAny?: string[]; minLength?: number; excludes?: string[] }
  /** Fits the hand-built heritage classes (they have their own models of it) */
  heritage?: boolean
  /** Functional equipment: what it does to her handling */
  effect?: Effect
  /** What it lets her do */
  ability?: AbilityId
}

const free = { kind: 'free' } as const
const credits = (n: number) => ({ kind: 'credits', credits: n }) as const
const CONSOLES = ['helm:center', 'helm:side', 'helm:nav']
const CENTER_CONSOLES = ['helm:center', 'helm:nav']
const OUTBOARDS = ['engine:small', 'engine:large', 'engine:twin']
const ROOFS = ['top:hardtop', 'top:wheelhouse']

export const ITEMS = {
  // ── classes ──
  'class:modular': {
    name: 'Your boat',
    blurb: 'The boat you build.',
    rarity: 'common',
    collection: 'starter',
    price: free
  },
  'class:runabout': {
    name: 'Runabout',
    blurb: 'Quick, nimble and chrome-trimmed.',
    rarity: 'rare',
    collection: 'heritage',
    price: { kind: 'heritage' }
  },
  'class:lobster': {
    name: 'Lobster Boat',
    blurb: 'A steady Maine workboat.',
    rarity: 'rare',
    collection: 'heritage',
    price: { kind: 'heritage' }
  },
  'class:sloop': {
    name: 'Sloop',
    blurb: 'A classic sailboat with a tall mast.',
    rarity: 'rare',
    collection: 'heritage',
    price: { kind: 'heritage' }
  },

  // ── vessel levels (what each is built from: catalog.ts, STAGES) ──
  'stage:skiff': { name: 'Skiff', blurb: STAGES.skiff.blurb, rarity: 'common', collection: 'starter', price: free },
  'stage:launch': {
    name: 'Launch',
    blurb: STAGES.launch.blurb,
    rarity: 'common',
    collection: 'shipyard',
    price: credits(12)
  },
  'stage:console': {
    name: 'Center Console',
    blurb: STAGES.console.blurb,
    rarity: 'uncommon',
    collection: 'shipyard',
    price: credits(25)
  },
  'stage:cruiser': {
    name: 'Cruiser',
    blurb: STAGES.cruiser.blurb,
    rarity: 'rare',
    collection: 'shipyard',
    price: credits(40)
  },
  'stage:sloop': {
    name: 'Sloop',
    blurb: STAGES.sloop.blurb,
    rarity: 'rare',
    collection: 'bluewater',
    price: credits(40)
  },
  'stage:yacht': {
    name: 'Flybridge Yacht',
    blurb: STAGES.yacht.blurb,
    rarity: 'epic',
    collection: 'shipyard',
    price: credits(70)
  },
  'stage:bluewater': {
    name: 'Bluewater Sloop',
    blurb: STAGES.bluewater.blurb,
    rarity: 'epic',
    collection: 'bluewater',
    price: credits(65)
  },
  'stage:grand': {
    name: 'Grand Yacht',
    blurb: STAGES.grand.blurb,
    rarity: 'legendary',
    collection: 'shipyard',
    price: credits(110)
  },

  // ── structure: these come with a vessel level (their credit values count toward a level a member partly owns) ──
  'hull:skiff': {
    name: 'Starter skiff hull',
    blurb: 'Small, open and well-used.',
    category: 'hull',
    group: 'hull',
    rarity: 'common',
    collection: 'starter',
    price: free
  },
  'hull:long': {
    name: 'Longer hull',
    blurb: 'Lengthened to 2 m.',
    category: 'hull',
    group: 'hull',
    rarity: 'uncommon',
    collection: 'shipyard',
    price: credits(6)
  },
  'hull:cruiser': {
    name: 'Cruiser hull',
    blurb: 'A 2.5 m hull, deeper and drier.',
    category: 'hull',
    group: 'hull',
    rarity: 'rare',
    collection: 'shipyard',
    price: credits(14)
  },
  'hull:voyager': {
    name: 'Voyager hull',
    blurb: 'A 3.1 m hull with the freeboard for anything.',
    category: 'hull',
    group: 'hull',
    rarity: 'epic',
    collection: 'shipyard',
    price: credits(30)
  },
  'hull:grand': {
    name: 'Grand hull',
    blurb: 'A 3.8 m hull: a ship, nearly.',
    category: 'hull',
    group: 'hull',
    rarity: 'legendary',
    collection: 'shipyard',
    price: credits(45)
  },
  'hull:wide': {
    name: 'Wider beam',
    blurb: 'Broader sections: steadier and roomier.',
    category: 'hull',
    rarity: 'uncommon',
    collection: 'shipyard',
    price: credits(8),
    fit: { minLength: 2 }
  },
  'hull:raised-bow': {
    name: 'Raised bow',
    blurb: 'A sheer that sweeps up forward.',
    category: 'hull',
    rarity: 'uncommon',
    collection: 'shipyard',
    price: credits(5),
    fit: { minLength: 2 }
  },
  'hull:deep': {
    name: 'Deeper hull',
    blurb: 'More freeboard and a deeper vee below.',
    category: 'hull',
    rarity: 'rare',
    collection: 'shipyard',
    price: credits(10),
    fit: { minLength: 2.5 }
  },
  'hull:transom': {
    name: 'Reinforced transom',
    blurb: 'A doubled transom and motor pad.',
    category: 'hull',
    rarity: 'common',
    collection: 'shipyard',
    price: credits(4)
  },
  'hull:side-rails': {
    name: 'Side rails',
    blurb: 'Stanchions and grab rails along both sides.',
    category: 'hull',
    rarity: 'uncommon',
    collection: 'shipyard',
    price: credits(6),
    fit: { minLength: 2 }
  },
  'hull:gunwale-caps': {
    name: 'Gunwale caps',
    blurb: 'Varnished teak capping along the gunwale.',
    category: 'hull',
    rarity: 'common',
    collection: 'shipyard',
    price: credits(3)
  },
  'hull:rub-rail': {
    name: 'Rub rail',
    blurb: 'A rubbing strake to take the knocks.',
    category: 'hull',
    rarity: 'common',
    collection: 'shipyard',
    price: credits(2)
  },
  'hull:keel': {
    name: 'Keel detail',
    blurb: 'A keel and skeg under the hull.',
    category: 'hull',
    rarity: 'uncommon',
    collection: 'shipyard',
    price: credits(5)
  },
  'hull:swim-platform': {
    ability: 'swim',
    name: 'Swim platform',
    blurb: 'A teak platform off the transom, at the waterline.',
    category: 'hull',
    rarity: 'rare',
    collection: 'shipyard',
    price: credits(10),
    fit: { minLength: 2.5, requires: ['engine:inboard'] }
  },
  'helm:tiller': {
    name: 'Tiller',
    blurb: 'Steer from the outboard itself.',
    category: 'helm',
    group: 'helm',
    rarity: 'common',
    collection: 'starter',
    price: free
  },
  'helm:side': {
    name: 'Wheel console',
    blurb: 'A compact console with a wheel, to starboard.',
    category: 'helm',
    group: 'helm',
    rarity: 'common',
    collection: 'helm',
    price: credits(4)
  },
  'helm:center': {
    name: 'Center console',
    blurb: 'A console amidships.',
    category: 'helm',
    group: 'helm',
    rarity: 'uncommon',
    collection: 'helm',
    price: credits(6)
  },
  'helm:nav': {
    name: 'Navigation console',
    blurb: 'A big center console with a chart screen.',
    category: 'helm',
    group: 'helm',
    rarity: 'rare',
    collection: 'helm',
    price: credits(16),
    fit: { minLength: 2.5 }
  },
  'helm:windshield': {
    name: 'Windshield',
    blurb: 'Tinted and chrome-framed.',
    category: 'helm',
    rarity: 'common',
    collection: 'helm',
    price: credits(3),
    fit: { requiresAny: CONSOLES }
  },
  'helm:throttle': {
    name: 'Throttle controls',
    blurb: 'A chrome throttle lever.',
    category: 'helm',
    rarity: 'common',
    collection: 'helm',
    price: credits(2),
    fit: { requiresAny: CONSOLES }
  },
  'helm:instruments': {
    name: 'Instrument panel',
    blurb: 'Gauges and a compass.',
    category: 'helm',
    rarity: 'uncommon',
    collection: 'helm',
    price: credits(4),
    fit: { requiresAny: CONSOLES }
  },
  'seat:bench': {
    name: 'Bench seat',
    blurb: 'A plank thwart across the bow.',
    category: 'seats',
    group: 'fwdseat',
    rarity: 'common',
    collection: 'starter',
    price: free
  },
  'seat:cooler': {
    name: 'Cooler seat',
    blurb: 'A cushioned cooler in front of the console.',
    category: 'seats',
    group: 'fwdseat',
    rarity: 'common',
    collection: 'helm',
    price: credits(4),
    fit: { requiresAny: CENTER_CONSOLES }
  },
  'seat:center': {
    name: 'Center bench',
    blurb: 'A cushioned bench amidships.',
    category: 'seats',
    rarity: 'common',
    collection: 'helm',
    price: credits(3),
    fit: { excludes: CONSOLES }
  },
  'seat:stern': {
    name: 'Stern bench',
    blurb: 'A full-width bench across the stern.',
    category: 'seats',
    rarity: 'common',
    collection: 'helm',
    price: credits(4)
  },
  'seat:post': {
    name: 'Leaning post',
    blurb: 'A padded post behind the console.',
    category: 'seats',
    group: 'helmseat',
    rarity: 'uncommon',
    collection: 'helm',
    price: credits(5),
    fit: { requiresAny: CENTER_CONSOLES }
  },
  'seat:captain': {
    name: "Captain's chair",
    blurb: 'A high-backed helm chair.',
    category: 'seats',
    group: 'helmseat',
    rarity: 'rare',
    collection: 'helm',
    price: credits(10),
    fit: { requiresAny: CONSOLES }
  },
  'seat:passenger': {
    name: 'Passenger seat',
    blurb: 'A second chair beside the helm.',
    category: 'seats',
    rarity: 'uncommon',
    collection: 'helm',
    price: credits(6),
    fit: { requires: ['seat:captain'], minLength: 2 }
  },
  'seat:storage': {
    name: 'Storage compartments',
    blurb: 'Flush deck hatches with lockers below.',
    category: 'seats',
    rarity: 'uncommon',
    collection: 'workboat',
    price: credits(5),
    fit: { minLength: 2 }
  },
  'engine:small': {
    name: 'Small outboard',
    blurb: 'Old, small and stubborn.',
    category: 'engine',
    group: 'engine',
    rarity: 'common',
    collection: 'starter',
    price: free
  },
  'engine:large': {
    name: 'Larger outboard',
    blurb: 'A modern four-stroke.',
    category: 'engine',
    group: 'engine',
    rarity: 'uncommon',
    collection: 'shipyard',
    price: credits(8)
  },
  'engine:twin': {
    name: 'Dual outboards',
    blurb: 'Two big engines on the transom.',
    category: 'engine',
    group: 'engine',
    rarity: 'epic',
    collection: 'shipyard',
    price: credits(25),
    fit: { minLength: 2.5, requires: ['hull:transom'], requiresAny: CONSOLES }
  },
  'engine:inboard': {
    name: 'Inboard diesel',
    blurb: 'A diesel below, a shaft and propeller under the hull.',
    category: 'engine',
    group: 'engine',
    rarity: 'rare',
    collection: 'workboat',
    price: credits(20),
    fit: { minLength: 2.5 }
  },
  'top:bimini': {
    name: 'Bimini top',
    blurb: 'A canvas sunshade on folding bows.',
    category: 'top',
    group: 'canopy',
    rarity: 'uncommon',
    collection: 'helm',
    price: credits(8),
    fit: { excludes: ['top:poles'] }
  },
  'top:poles': {
    name: 'Support poles',
    blurb: 'A stainless frame over the helm.',
    category: 'top',
    rarity: 'uncommon',
    collection: 'helm',
    price: credits(5),
    fit: { requiresAny: CENTER_CONSOLES }
  },
  'top:hardtop': {
    name: 'Hard top',
    blurb: 'A solid roof over the console.',
    category: 'top',
    group: 'canopy',
    rarity: 'rare',
    collection: 'helm',
    price: credits(14),
    fit: { requires: ['top:poles'], requiresAny: CENTER_CONSOLES }
  },
  'top:wheelhouse': {
    name: 'Wheelhouse',
    blurb: 'A full wheelhouse around the helm.',
    category: 'top',
    group: 'canopy',
    rarity: 'epic',
    collection: 'workboat',
    price: credits(22),
    fit: { minLength: 2.5, requiresAny: CENTER_CONSOLES, excludes: ['top:poles'] }
  },
  'top:flybridge': {
    name: 'Flybridge',
    blurb: 'A second level with its own helm.',
    category: 'top',
    rarity: 'legendary',
    collection: 'workboat',
    price: credits(40),
    fit: { minLength: 2.5, requiresAny: ROOFS }
  },
  'top:sky-roof': {
    name: 'Sky roof',
    blurb: 'A roof over the flybridge: a third level.',
    category: 'top',
    rarity: 'legendary',
    collection: 'shipyard',
    price: credits(30),
    fit: { requires: ['top:flybridge'] }
  },
  'top:mast': {
    name: 'Mast',
    blurb: 'A mast stepped on the keel.',
    category: 'top',
    rarity: 'rare',
    collection: 'bluewater',
    price: credits(12),
    fit: {
      minLength: 2,
      requires: ['hull:keel'],
      excludes: ['top:poles', 'top:hardtop', 'top:wheelhouse', 'top:flybridge', 'top:bimini']
    }
  },
  'top:boom': {
    name: 'Boom',
    blurb: 'A varnished boom for the mainsail.',
    category: 'top',
    rarity: 'uncommon',
    collection: 'bluewater',
    price: credits(5),
    fit: { requires: ['top:mast'] }
  },
  'top:rigging': {
    name: 'Rigging',
    blurb: 'Shrouds, spreaders and stays.',
    category: 'top',
    rarity: 'uncommon',
    collection: 'bluewater',
    price: credits(6),
    fit: { requires: ['top:mast'] }
  },
  'top:sails': {
    ability: 'sail',
    effect: { range: 1.2 },
    name: 'Sails',
    blurb: 'A mainsail and jib, in your colours.',
    category: 'top',
    rarity: 'rare',
    collection: 'bluewater',
    price: credits(10),
    fit: { requires: ['top:boom', 'top:rigging'] }
  },

  // ── accessories: unlocked by vessel level, bought and fitted by choice ──
  'deck:cleats': {
    name: 'Cleats',
    blurb: 'Chrome cleats at the bow and either quarter.',
    category: 'deck',
    custom: { level: 1 },
    rarity: 'common',
    collection: 'workboat',
    price: credits(1)
  },
  'deck:anchor': {
    ability: 'anchor',
    name: 'Anchor & bow roller',
    blurb: 'A plough anchor stowed on a bow roller.',
    category: 'deck',
    custom: { level: 1 },
    rarity: 'common',
    collection: 'workboat',
    price: credits(3)
  },
  'deck:anchor-rope': {
    name: 'Anchor rope',
    blurb: 'A coil of rode on the foredeck.',
    category: 'deck',
    custom: { level: 1, zones: ['bow'] },
    rarity: 'common',
    collection: 'workboat',
    price: credits(1),
    fit: { requires: ['deck:anchor'] }
  },
  'deck:rods': {
    ability: 'fishing',
    name: 'Rod holders',
    blurb: 'A pair of rods in holders on the quarters.',
    category: 'deck',
    custom: { level: 1 },
    rarity: 'common',
    collection: 'workboat',
    price: credits(3)
  },
  'deck:crate': {
    name: 'Storage crate',
    blurb: 'A wooden crate lashed on deck.',
    category: 'deck',
    custom: { level: 1, zones: ['aft', 'bow'] },
    rarity: 'common',
    collection: 'workboat',
    price: credits(2)
  },
  'deck:tackle': {
    name: 'Tackle box',
    blurb: 'Hooks, lures and line in a green box.',
    category: 'deck',
    custom: { level: 1, zones: ['aft', 'bow'] },
    rarity: 'common',
    collection: 'workboat',
    price: credits(2)
  },
  'deck:bumpers': {
    name: 'Dock bumpers',
    blurb: 'Fenders hung over the side.',
    category: 'deck',
    custom: { level: 1 },
    rarity: 'common',
    collection: 'workboat',
    price: credits(2)
  },
  'deck:ladder': {
    ability: 'swim',
    name: 'Boarding ladder',
    blurb: 'A chrome ladder over the transom.',
    category: 'deck',
    custom: { level: 2, zones: ['stern'] },
    rarity: 'common',
    collection: 'workboat',
    price: credits(4)
  },
  'deck:antenna': {
    name: 'VHF antenna',
    blurb: 'A whip antenna for the radio.',
    category: 'deck',
    custom: { level: 2 },
    rarity: 'common',
    collection: 'workboat',
    price: credits(4),
    fit: { requiresAny: CONSOLES }
  },
  'deck:work-lights': {
    ability: 'night',
    name: 'Work lights',
    blurb: 'Floodlights for hauling after dark.',
    category: 'deck',
    custom: { level: 3 },
    rarity: 'uncommon',
    collection: 'workboat',
    price: credits(6),
    fit: { requiresAny: ['top:poles', ...ROOFS] }
  },
  'deck:radar': {
    ability: 'radar',
    name: 'Radar dome',
    blurb: 'On the roof, slowly sweeping.',
    category: 'deck',
    custom: { level: 3, zones: ['roof'] },
    rarity: 'rare',
    collection: 'workboat',
    price: credits(12),
    fit: { requiresAny: ROOFS }
  },
  'engine:prop': {
    effect: { cruise: 1.05, accel: 1.1 },
    name: 'Stainless propeller',
    blurb: 'A polished four-blade prop: more bite, more speed.',
    category: 'engine',
    custom: { level: 1 },
    rarity: 'common',
    collection: 'shipyard',
    price: credits(3),
    fit: { requiresAny: OUTBOARDS }
  },
  'engine:cowl': {
    name: 'Engine housing details',
    blurb: 'Racing stripes, chrome trim and vents on the cowling.',
    category: 'engine',
    custom: { level: 1 },
    rarity: 'uncommon',
    collection: 'shipyard',
    price: credits(4),
    fit: { requiresAny: OUTBOARDS }
  },
  'engine:fuel-tank': {
    effect: { range: 1.12 },
    name: 'Spare fuel tank',
    blurb: 'A portable tank with its fuel line: she goes further out.',
    category: 'engine',
    custom: { level: 1, zones: ['aft'] },
    rarity: 'common',
    collection: 'workboat',
    price: credits(2),
    fit: { requiresAny: OUTBOARDS }
  },
  'helm:wheel': {
    name: 'Spoked steering wheel',
    blurb: 'A classic varnished wheel with brass spokes.',
    category: 'helm',
    custom: { level: 2 },
    rarity: 'uncommon',
    collection: 'helm',
    price: credits(4),
    fit: { requiresAny: CONSOLES }
  },
  // ── performance: equipment that changes how she handles (no deck room: it's below decks or at the helm) ──
  'perf:steering': {
    name: 'Hydraulic steering',
    blurb: 'A lighter, quicker helm: she turns faster.',
    effect: { turn: 1.12 },
    category: 'perf',
    custom: { level: 2 },
    rarity: 'uncommon',
    collection: 'helm',
    price: credits(6),
    fit: { requiresAny: CONSOLES }
  },
  'perf:tune': {
    name: 'Engine tune-up',
    blurb: 'A proper service and tune: more speed and a quicker start.',
    effect: { cruise: 1.06, accel: 1.06 },
    category: 'perf',
    custom: { level: 2 },
    rarity: 'uncommon',
    collection: 'shipyard',
    price: credits(8)
  },
  'perf:trim-tabs': {
    name: 'Trim tabs',
    blurb: 'Plates on the transom: she rides steadier and gets up on the plane sooner.',
    effect: { roll: 0.88, accel: 1.04 },
    category: 'perf',
    custom: { level: 3 },
    rarity: 'uncommon',
    collection: 'shipyard',
    price: credits(8),
    fit: { minLength: 2, excludes: ['top:mast'] }
  },
  'perf:long-range': {
    name: 'Long-range tank',
    blurb: 'A big tank below: she ranges much further, a little slower off the mark.',
    effect: { range: 1.3, accel: 0.97 },
    category: 'perf',
    custom: { level: 3 },
    rarity: 'rare',
    collection: 'bluewater',
    price: credits(10)
  },
  'perf:bow-thruster': {
    name: 'Bow thruster',
    blurb: 'A thruster in the bow: she turns on the spot in tight places.',
    effect: { steerage: 0.6 },
    category: 'perf',
    custom: { level: 4 },
    rarity: 'rare',
    collection: 'workboat',
    price: credits(12)
  },
  'perf:stabilizer': {
    name: 'Gyro stabilizer',
    blurb: 'A spinning gyro below: she barely rolls, even in a swell.',
    effect: { roll: 0.85, damping: 0.8 },
    category: 'perf',
    custom: { level: 5 },
    rarity: 'epic',
    collection: 'bluewater',
    price: credits(18)
  },

  'decor:ensign': {
    name: 'Stern flag',
    blurb: 'A flag at the stern in your accent colour.',
    category: 'style',
    custom: { level: 1 },
    rarity: 'common',
    collection: 'starter',
    price: free
  },
  'decor:stripe': {
    name: 'Accent striping',
    blurb: 'A boot stripe in your accent colour.',
    category: 'style',
    custom: { level: 1 },
    rarity: 'common',
    collection: 'shipyard',
    price: credits(2)
  },
  'decor:nameplate': {
    name: 'Nameplate',
    blurb: 'Your name in gold on a varnished board.',
    category: 'style',
    custom: { level: 1 },
    rarity: 'uncommon',
    collection: 'shipyard',
    price: credits(4)
  },
  'decor:lantern': {
    ability: 'night',
    name: 'Lantern',
    blurb: 'A brass hurricane lantern with a flickering flame.',
    category: 'style',
    custom: { level: 1, zones: ['stern'] },
    rarity: 'common',
    collection: 'evening',
    price: credits(3)
  },
  'decor:buoys': {
    name: 'Buoys',
    blurb: 'Painted buoys hung on the rail.',
    category: 'style',
    custom: { level: 1 },
    rarity: 'common',
    collection: 'workboat',
    price: credits(3)
  },
  'decor:lifering': {
    name: 'Life ring',
    blurb: 'In your accent colour.',
    category: 'style',
    custom: { level: 1 },
    rarity: 'common',
    collection: 'shipyard',
    price: credits(2)
  },
  'decor:traps': {
    ability: 'lobstering',
    name: 'Lobster traps',
    blurb: 'A stack of traps on the deck.',
    category: 'style',
    custom: { level: 2, zones: ['aft', 'bow'] },
    rarity: 'uncommon',
    collection: 'workboat',
    price: credits(6)
  },
  'decor:string-lights': {
    ability: 'night',
    name: 'String lights',
    blurb: 'Warm bulbs that twinkle after dark.',
    category: 'style',
    custom: { level: 3 },
    rarity: 'rare',
    collection: 'evening',
    price: credits(10),
    fit: { requiresAny: ['top:rigging', ...ROOFS] }
  },
  'decor:pennant': {
    name: 'Masthead pennant',
    blurb: 'A long pennant streaming from the masthead.',
    category: 'style',
    custom: { level: 4 },
    rarity: 'common',
    collection: 'bluewater',
    price: credits(3),
    fit: { requires: ['top:mast'] }
  },
  'decor:pennant-line': {
    name: 'Pennant line',
    blurb: 'Code flags dressed overall, bow to masthead.',
    category: 'style',
    custom: { level: 4 },
    rarity: 'uncommon',
    collection: 'bluewater',
    price: credits(6),
    fit: { requires: ['top:rigging'] }
  },
  'fun:grill': {
    ability: 'host',
    name: 'Barbecue grill',
    blurb: 'A kettle grill with glowing coals.',
    category: 'leisure',
    custom: { level: 3, zones: ['aft', 'upper'] },
    rarity: 'uncommon',
    collection: 'leisure',
    price: credits(6)
  },
  'fun:palms': {
    name: 'Potted palm',
    blurb: 'A little palm tree in a terracotta pot.',
    category: 'leisure',
    custom: { level: 3, zones: ['aft', 'bow', 'upper'] },
    rarity: 'uncommon',
    collection: 'leisure',
    price: credits(5)
  },
  'fun:loungers': {
    ability: 'host',
    name: 'Sun loungers',
    blurb: 'Two loungers and beach towels on the foredeck.',
    category: 'leisure',
    custom: { level: 4, zones: ['bow'], rows: 1 },
    rarity: 'rare',
    collection: 'leisure',
    price: credits(10)
  },
  'fun:hot-tub': {
    ability: 'host',
    name: 'Hot tub',
    blurb: 'Bubbling, steaming, and very much on a boat.',
    category: 'leisure',
    custom: { level: 4, zones: ['upper', 'aft'], rows: 2 },
    rarity: 'epic',
    collection: 'leisure',
    price: credits(25)
  },
  'fun:jet-ski': {
    ability: 'tender',
    name: 'Jet ski',
    blurb: 'Parked on the swim platform, in your colours.',
    category: 'leisure',
    custom: { level: 5, zones: ['stern'], rows: 1 },
    rarity: 'epic',
    collection: 'leisure',
    price: credits(30),
    fit: { requires: ['hull:swim-platform'] }
  },
  'fun:slide': {
    ability: 'swim',
    name: 'Water slide',
    blurb: 'From the flybridge, round and down into the sea.',
    category: 'leisure',
    custom: { level: 5 },
    rarity: 'legendary',
    collection: 'leisure',
    price: credits(45),
    fit: { requires: ['top:flybridge', 'hull:swim-platform'] }
  },
  'fun:garden': {
    name: 'Rooftop garden',
    blurb: 'Planters, flowers and a little tree on the sky roof.',
    category: 'leisure',
    custom: { level: 6, zones: ['roof'], rows: 1 },
    rarity: 'legendary',
    collection: 'leisure',
    price: credits(20),
    fit: { requires: ['top:sky-roof'] }
  },
  'fun:pool': {
    ability: 'host',
    name: 'Pool',
    blurb: 'A whole swimming pool on the aft deck.',
    category: 'leisure',
    custom: { level: 6, zones: ['aft'], rows: 3 },
    rarity: 'legendary',
    collection: 'leisure',
    price: credits(60)
  },
  'decor:chest': {
    name: 'Treasure chest',
    blurb: 'Brass-bound, on the deck.',
    category: 'style',
    custom: { level: 1, zones: ['bow', 'aft'] },
    rarity: 'epic',
    collection: 'treasure',
    price: { kind: 'treasure', hint: 'Somewhere in the harbor' }
  },
  'decor:bell': {
    name: "Ship's bell",
    blurb: 'Polished bronze, by the helm.',
    category: 'style',
    custom: { level: 1 },
    rarity: 'rare',
    collection: 'milestones',
    price: { kind: 'achievement', name: 'Ten in a row: ten meetings without a miss' }
  },
  'decor:wreath': {
    name: 'Winter wreath',
    blurb: 'Evergreen and red ribbon on the bow.',
    category: 'style',
    custom: { level: 1 },
    rarity: 'uncommon',
    collection: 'seasonal',
    price: { kind: 'event', name: 'Winter Harbor 2026' }
  },
  'decor:brass': {
    name: "Shipwright's brass",
    blurb: 'Brass fittings throughout.',
    category: 'style',
    custom: { level: 3 },
    rarity: 'epic',
    collection: 'premium',
    price: { kind: 'purchase', price: '$6.99' }
  },

  // ── sails, finishes, paints, heritage flags ──
  'pattern:plain': {
    name: 'Plain sails',
    blurb: 'Clean canvas.',
    rarity: 'common',
    collection: 'starter',
    price: free
  },
  'pattern:band': {
    name: 'Band sails',
    blurb: 'A broad band in your accent colour.',
    rarity: 'common',
    collection: 'bluewater',
    price: credits(3)
  },
  'pattern:stripes': {
    name: 'Striped sails',
    blurb: 'Racing stripes in your accent colour.',
    rarity: 'uncommon',
    collection: 'bluewater',
    price: credits(5)
  },
  'finish:matte': {
    name: 'Matte finish',
    blurb: 'No shine at all.',
    rarity: 'common',
    collection: 'starter',
    price: free
  },
  'finish:satin': {
    name: 'Satin finish',
    blurb: 'A soft sheen.',
    rarity: 'common',
    collection: 'starter',
    price: free
  },
  'finish:gloss': {
    name: 'Gloss finish',
    blurb: 'Clear-coated and bright.',
    rarity: 'common',
    collection: 'starter',
    price: free
  },
  'paint:gold-leaf': {
    name: 'Gold leaf',
    blurb: 'A metallic gold paint.',
    rarity: 'legendary',
    collection: 'treasure',
    price: { kind: 'treasure', hint: 'Somewhere in the harbor' }
  },
  'paint:abyss': {
    name: 'Abyss blue',
    blurb: 'The deepest blue.',
    rarity: 'epic',
    collection: 'milestones',
    price: { kind: 'achievement', name: 'Perfect quarter: every meeting for 13 weeks' }
  },
  'paint:pearl': {
    name: 'Pearl',
    blurb: 'A warm pearl white.',
    rarity: 'rare',
    collection: 'premium',
    price: { kind: 'purchase', price: '$4.99' }
  },
  'accessory:ensign': {
    name: 'Stern ensign',
    blurb: 'A flag at the stern in your accent colour.',
    rarity: 'common',
    collection: 'heritage',
    price: free,
    heritage: true
  },
  'accessory:burgee': {
    name: 'Masthead burgee',
    blurb: 'A long pennant streaming from the masthead.',
    rarity: 'uncommon',
    collection: 'heritage',
    price: credits(3),
    heritage: true
  }
} as const satisfies Record<string, ItemDef>

/**
 * Ids from the Garage's first, slot-based build (November 2026, before boats were made of parts), each mapped to the
 * items that replaced it, so anything bought then is still owned now. Ids are never reused, so these stay here.
 */
export const SUCCESSORS: Record<string, string[]> = {
  'hull:launch': ['hull:long'],
  'beam:wide': ['hull:wide'],
  'cabin:console': ['helm:center'],
  'cabin:cuddy': ['helm:side', 'helm:windshield'],
  'cabin:wheelhouse': ['top:wheelhouse'],
  'upper:hardtop': ['top:poles', 'top:hardtop'],
  'upper:flybridge': ['top:flybridge'],
  'engine:outboard': ['engine:large'],
  'mast:riding': ['top:mast', 'hull:keel'],
  'mast:sloop': ['top:mast', 'top:boom', 'top:rigging', 'top:sails', 'hull:keel'],
  'rail:bow': ['hull:side-rails'],
  'rail:lifelines': ['hull:side-rails'],
  'accessory:burgee': ['decor:pennant'],
  'accessory:lantern': ['decor:lantern'],
  'accessory:rods': ['deck:rods'],
  'accessory:lifering': ['decor:lifering'],
  'accessory:traps': ['decor:traps'],
  'accessory:deckchairs': ['fun:loungers'],
  'accessory:radar': ['deck:radar'],
  'accessory:searchlight': ['deck:work-lights'],
  'accessory:signal-flags': ['decor:pennant-line'],
  'accessory:string-lights': ['decor:string-lights'],
  'accessory:chest': ['decor:chest'],
  'accessory:bell': ['decor:bell'],
  'accessory:wreath': ['decor:wreath']
}

export type ItemId = keyof typeof ITEMS
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[]
export const isItemId = (id: string): id is ItemId => id in ITEMS
export const itemDef = (id: ItemId): ItemDef => ITEMS[id]
export const FREE_ITEMS = ITEM_IDS.filter((id) => itemDef(id).price.kind === 'free')
export const isLive = (id: ItemId) => LIVE_PRICES.includes(itemDef(id).price.kind)
/** Every boat part (structural and accessory), in catalog order */
export const PART_IDS = ITEM_IDS.filter((id) => !!itemDef(id).category)
export const isPart = (id: string) => isItemId(id) && !!itemDef(id).category
/** The accessories members choose, in catalog order */
export const ACCESSORY_IDS = ITEM_IDS.filter((id) => !!itemDef(id).custom)
export const isAccessory = (id: string): id is ItemId => isItemId(id) && !!itemDef(id).custom
export const stageItem = (id: StageId) => `stage:${id}` as ItemId

/** The combined effect of everything fitted (factors multiply; floors take the strongest) */
export function effectsOf(parts: Iterable<string>) {
  const fx = { cruise: 1, accel: 1, turn: 1, roll: 1, range: 1, damping: 0, steerage: 0 }
  for (const id of parts) {
    const e = isItemId(id) ? itemDef(id).effect : undefined
    if (!e) continue
    for (const k of ['cruise', 'accel', 'turn', 'roll', 'range'] as const) fx[k] *= e[k] ?? 1
    fx.damping = Math.max(fx.damping, e.damping ?? 0)
    fx.steerage = Math.max(fx.steerage, e.steerage ?? 0)
  }
  return fx
}

/** What a boat can do, from what she carries */
export const abilitiesOf = (parts: Iterable<string>) => [
  ...new Set(
    [...parts].map((id) => (isItemId(id) ? itemDef(id).ability : undefined)).filter((a): a is AbilityId => !!a)
  )
]

/** In words, how an item is had */
export function priceLabel(p: Price) {
  switch (p.kind) {
    case 'free':
      return 'Included'
    case 'credits':
      return `${p.credits} ${p.credits === 1 ? 'credit' : 'credits'}`
    case 'heritage':
      return 'Heritage'
    case 'treasure':
      return `Treasure · ${p.hint}`
    case 'achievement':
      return `Achievement · ${p.name}`
    case 'event':
      return `Event · ${p.name}`
    case 'purchase':
      return `Shipwright upgrade · ${p.price}`
  }
}

// ─── vessel levels ─────────────────────────────────────────────────────────────

/** The highest vessel level a member owns (everyone has the skiff) */
export function maxLevel(owned: Iterable<string>) {
  let level = 1
  for (const id of owned)
    if (id.startsWith('stage:') && isStageId(id.slice(6))) level = Math.max(level, STAGES[id.slice(6) as StageId].level)
  return level
}

/** The levels that build on this one (two where the paths divide) */
export const nextStages = (id: StageId) => STAGE_IDS.filter((s) => STAGES[s].from === id)
/** The first level named at a level number (for "unlocks at Level 4 · Cruiser") */
export const stagesAtLevel = (level: number) => STAGE_IDS.filter((s) => STAGES[s].level === level)

const creditValue = (id: string) => {
  const p = isItemId(id) ? itemDef(id).price : null
  return p?.kind === 'credits' ? p.credits : 0
}

/**
 * What a level costs a member: its price, less the share of it they've already paid for in parts. A level's value is
 * the parts it adds to the one before; any of those a member bought earlier (when parts were sold one by one) count
 * toward it, so nothing they spent is lost. Never less than a credit.
 */
export function stagePrice(id: StageId, owned: Iterable<string>) {
  const def = itemDef(stageItem(id)).price
  const base = def.kind === 'credits' ? def.credits : 0
  if (!base) return 0
  const from = STAGES[id].from
  const before = new Set<string>(from ? STAGES[from as StageId].parts : [])
  const adds = STAGES[id].parts.filter((p) => !before.has(p))
  const value = adds.reduce((n, p) => n + creditValue(p), 0)
  if (!value) return base
  const have = new Set(owned)
  const paid = adds.filter((p) => have.has(p)).reduce((n, p) => n + creditValue(p), 0)
  return Math.max(1, Math.ceil(base * (1 - paid / value)))
}

// ─── room on deck ──────────────────────────────────────────────────────────────

/** Where an accessory sits: a zone, the row it starts at and how many it fills, and its lane (null: the full width) */
export type Placement = { zone: ZoneId; row: number; rows: number; lane: number | null }

/**
 * Packs a boat's accessories into its level's deck zones: those that fill whole rows first (from the start of the
 * zone), then those that take a single spot (from the far end), each in the first of its zones with room, the most
 * particular first. Anything that doesn't fit is reported, never overlapped.
 */
export function allocate(stage: StageId, accessories: string[]) {
  const room = STAGES[stage].room as Partial<Record<ZoneId, { rows: number; lanes: number }>>
  const grid = Object.fromEntries(
    ZONES.map((z) => [z, Array.from({ length: room[z]?.rows ?? 0 }, () => Array(room[z]?.lanes ?? 0).fill(false))])
  ) as Record<ZoneId, boolean[][]>
  const placements: Record<string, Placement> = {}
  const problems: { id: ItemId; problem: string }[] = []
  const zoned = accessories.filter((id): id is ItemId => isAccessory(id) && !!itemDef(id).custom!.zones?.length)
  // whole-row pieces first, then single spots; within each, those with the fewest places they can go first (so a fuel
  // tank, which only fits aft, isn't crowded out by a crate that could as well sit forward)
  const fewest = (a: ItemId, b: ItemId) => itemDef(a).custom!.zones!.length - itemDef(b).custom!.zones!.length
  const order = [
    ...zoned.filter((id) => itemDef(id).custom!.rows).sort(fewest),
    ...zoned.filter((id) => !itemDef(id).custom!.rows).sort(fewest)
  ]
  for (const id of order) {
    const c = itemDef(id).custom!
    let placed: Placement | null = null
    for (const zone of c.zones!) {
      const g = grid[zone]
      if (c.rows) {
        for (let r = 0; r + c.rows <= g.length && !placed; r++)
          if (g.slice(r, r + c.rows).every((row) => row.every((x) => !x))) {
            for (let k = r; k < r + c.rows; k++) g[k].fill(true)
            placed = { zone, row: r, rows: c.rows, lane: null }
          }
      } else {
        for (let r = g.length - 1; r >= 0 && !placed; r--)
          for (let l = 0; l < g[r].length && !placed; l++)
            if (!g[r][l]) {
              g[r][l] = true
              placed = { zone, row: r, rows: 1, lane: l }
            }
      }
      if (placed) break
    }
    if (placed) placements[id] = placed
    else
      problems.push({
        id,
        problem: `No room ${c.zones!.map((z) => `on the ${ZONE_NAMES[z].toLowerCase()}`).join(' or ')}${c.rows ? ` (needs ${c.rows} ${c.rows === 1 ? 'row' : 'rows'})` : ''}`
      })
  }
  return { placements, problems }
}

/** How full each zone is: spots taken of spots there are */
export function roomUsed(stage: StageId, accessories: string[]) {
  const room = STAGES[stage].room as Partial<Record<ZoneId, { rows: number; lanes: number }>>
  const { placements } = allocate(stage, accessories)
  return ZONES.filter((z) => room[z]).map((z) => ({
    zone: z,
    total: room[z]!.rows * room[z]!.lanes,
    used: Object.values(placements)
      .filter((p) => p.zone === z)
      .reduce((n, p) => n + (p.lane === null ? p.rows * room[z]!.lanes : 1), 0)
  }))
}

/** How much room an accessory takes, in words */
export function roomLabel(id: ItemId) {
  const c = itemDef(id).custom
  if (!c?.zones?.length) return 'Its own mount'
  const where = c.zones.map((z) => ZONE_NAMES[z]).join(' or ')
  return c.rows ? `${where} · ${c.rows} full ${c.rows === 1 ? 'row' : 'rows'}` : `${where} · 1 spot`
}

// ─── the rules ─────────────────────────────────────────────────────────────────

/** Hull length (world units) for each hull, which the 3D layout lofts and the fit rules measure */
export const HULL_LENGTH: Record<string, number> = {
  'hull:skiff': 1.55,
  'hull:long': 2.0,
  'hull:cruiser': 2.5,
  'hull:voyager': 3.1,
  'hull:grand': 3.8
}
const lengthOf = (parts: Set<string>) => HULL_LENGTH[[...parts].find((p) => p in HULL_LENGTH) ?? 'hull:skiff']

/** The kind of boat it's becoming: a sailboat once it has a mast, a motorboat on a cruiser hull or bigger, else a skiff */
export function pathOf(c: VesselConfig): BoatPath {
  const parts = new Set(partsOf(c))
  if (parts.has('top:mast')) return 'sail'
  return lengthOf(parts) >= 2.5 ? 'motor' : 'skiff'
}

/** What a member's boat is called: its vessel level, or its heritage class */
export function boatName(c: VesselConfig) {
  if (isHeritage(c.vesselClass)) return ITEMS[`class:${c.vesselClass}`].name
  return STAGES[stageOf(c)].name
}

const LENGTH_NAMES: [number, string][] = [
  [3.8, 'Grand hull'],
  [3.1, 'Voyager hull or longer'],
  [2.5, 'Cruiser hull or longer'],
  [2, 'Longer hull']
]
const sameGroup = (a: string, b: string) =>
  isItemId(a) && isItemId(b) && !!itemDef(a).group && itemDef(a).group === itemDef(b).group

/** Why a part's requirements aren't met by these parts, or null when they are */
function partsProblem(id: ItemId, parts: Set<string>): string | null {
  const fit = itemDef(id).fit
  if (fit?.minLength && lengthOf(parts) < fit.minLength)
    return `Needs a ${LENGTH_NAMES.find(([l]) => l <= fit.minLength!)![1]}`
  const missing = fit?.requires?.find((x) => !parts.has(x))
  if (missing) return `Needs the ${itemDef(missing as ItemId).name.toLowerCase()}`
  if (fit?.requiresAny && !fit.requiresAny.some((x) => parts.has(x)))
    return `Needs ${fit.requiresAny.map((x) => `the ${itemDef(x as ItemId).name.toLowerCase()}`).join(' or ')}`
  const clash =
    fit?.excludes?.find((x) => parts.has(x) && !sameGroup(id, x)) ??
    [...parts].find(
      (p) => p !== id && isItemId(p) && (itemDef(p).fit?.excludes ?? []).includes(id) && !sameGroup(id, p)
    )
  if (clash) return `Can't go with the ${itemDef(clash as ItemId).name.toLowerCase()}`
  return null
}

/** Why an item can't be fitted to this boat as it stands (its level, its mounts), or null when it can */
export function fitProblem(id: ItemId, c: VesselConfig): string | null {
  const def = itemDef(id)
  const heritage = isHeritage(c.vesselClass)
  if (id.startsWith('accessory:')) {
    if (!heritage) return 'Fits the heritage boats'
    if (id === 'accessory:burgee' && c.vesselClass !== 'sloop') return 'Needs a mast'
    return null
  }
  if (id.startsWith('stage:')) return heritage ? 'Start building first' : null
  if (!def.category) return null
  if (heritage) return 'Fits the boat you build'
  const stage = stageOf(c)
  if (!def.custom) return STAGES[stage].parts.includes(id) ? null : 'Comes with a vessel upgrade'
  if (def.custom.level > STAGES[stage].level) return `Needs a Level ${def.custom.level} vessel`
  return partsProblem(id, new Set(partsOf(c)))
}

/** Why a member can't have an item yet (the level before, a vessel level reached, a milestone), or null when they can */
export function needsProblem(id: ItemId, stats: Stats, owned: Iterable<string>): string | null {
  const have = new Set(owned)
  if (id.startsWith('stage:')) {
    const from = STAGES[id.slice(6) as StageId].from
    return from && !have.has(stageItem(from as StageId)) ? `Needs the ${STAGES[from as StageId].name} first` : null
  }
  const def = itemDef(id)
  if (def.custom && def.custom.level > maxLevel(have))
    return `Unlocks at Level ${def.custom.level} · ${stagesAtLevel(def.custom.level)
      .map((s) => STAGES[s].name)
      .join(' or ')}`
  const needs = def.needs
  if (!needs) return null
  for (const k of STAT_KEYS) if (needs[k] && stats[k] < needs[k]!) return `After ${statLabel(k, needs[k]!)}`
  const missing = needs.owns?.find((x) => !have.has(x))
  if (missing) return `Needs the ${itemDef(missing as ItemId).name} first`
  return null
}

/** Everything wrong with a boat as configured: anything that doesn't fit, anything stored that isn't an accessory, no room */
export function buildProblems(c: VesselConfig) {
  const problems = equippedItems(c)
    .filter(isItemId)
    .map((id) => ({ id, problem: fitProblem(id, c) }))
    .filter((x): x is { id: ItemId; problem: string } => !!x.problem)
  if (c.vesselClass === 'modular') {
    if (c.details.stage && !isStageId(c.details.stage))
      problems.push({ id: 'class:modular', problem: 'Not a vessel level' })
    for (const id of accessoriesOf(c))
      if (!isAccessory(id)) problems.push({ id: 'class:modular', problem: `${id} isn't an accessory` })
    problems.push(...allocate(stageOf(c), accessoriesOf(c)).problems)
  }
  return problems
}

const withAccessories = (c: VesselConfig, stage: StageId, accessories: Iterable<string>): VesselConfig => {
  const keep = new Set(accessories)
  return { ...c, accessories: [], details: { ...c.details, stage, parts: ACCESSORY_IDS.filter((id) => keep.has(id)) } }
}

/**
 * A boat with anything that no longer fits taken off: accessories above its level, without their mounts, or without
 * room on deck (taking off the mast's pennant line along with the mast). Repeats until it's stable. Returns the names
 * of what came off. Nothing is un-bought: it's still owned, ready to fit again.
 */
export function settle(c: VesselConfig): { config: VesselConfig; removed: string[] } {
  const removed: string[] = []
  if (isHeritage(c.vesselClass)) {
    const accessories = c.accessories.filter((a) => {
      const problem = fitProblem(`accessory:${a}`, c)
      if (problem) removed.push(itemDef(`accessory:${a}`).name)
      return !problem
    })
    return { config: { ...c, accessories }, removed }
  }
  const stage = c.details.stage && isStageId(c.details.stage) ? c.details.stage : 'skiff'
  let keep = accessoriesOf(c).filter(isAccessory)
  for (let pass = 0; pass < 8; pass++) {
    const config = withAccessories(c, stage, keep)
    const off = new Set<string>([
      ...keep.filter((id) => fitProblem(id, config)),
      ...allocate(stage, keep).problems.map((p) => p.id)
    ])
    if (!off.size) break
    for (const id of off) removed.push(itemDef(id as ItemId).name)
    keep = keep.filter((id) => !off.has(id))
  }
  return { config: withAccessories(c, stage, keep), removed }
}

/** Fits an accessory (a sail pattern, a heritage flag), then settles the boat */
export function fitAccessory(c: VesselConfig, id: ItemId) {
  if (id.startsWith('pattern:'))
    return { config: { ...c, sailPattern: id.slice(8) as VesselConfig['sailPattern'] }, removed: [] }
  if (id.startsWith('accessory:'))
    return settle({
      ...c,
      accessories: [...new Set([...c.accessories, id.slice(10) as VesselConfig['accessories'][number]])]
    })
  return settle(withAccessories(c, stageOf(c), [...accessoriesOf(c), id]))
}

/** Takes an accessory off, then settles the boat */
export function removeAccessory(c: VesselConfig, id: ItemId) {
  if (id.startsWith('accessory:'))
    return settle({ ...c, accessories: c.accessories.filter((a) => `accessory:${a}` !== id) })
  return settle(
    withAccessories(
      c,
      stageOf(c),
      accessoriesOf(c).filter((p) => p !== id)
    )
  )
}

/** Sails a vessel level (one the member owns), keeping every accessory that still fits */
export function setStage(c: VesselConfig, stage: StageId) {
  return settle(
    withAccessories({ ...c, vesselClass: 'modular' }, stage, isHeritage(c.vesselClass) ? [] : accessoriesOf(c))
  )
}

/** Structural parts that a level's upgrade can count earlier purchases toward (for the Garage to explain the price) */
export const structuralValue = (id: string) => (STRUCTURAL.has(id) ? creditValue(id) : 0)
export { stageDef }
