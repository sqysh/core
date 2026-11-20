import { PALETTES } from '@/app/(authenticated)/(active)/attendance/_lib/boats'
import { hashString } from '@/app/(authenticated)/(active)/attendance/_lib/random'

// What a member's boat can be: the vessel classes, sail patterns and accessories, which cosmetics are free and which
// must be earned, and the default boat for a member who hasn't customised theirs. Shared by the harbor scenes (which
// draw it), the server (which validates every save against it) and, later, the customisation screen.
//
// Every id here is stored in the database (MemberVessel, VesselUnlock), so ids are only ever added, never renamed or
// reused. A new class or cosmetic is a new entry here plus its model in the harbor; nothing else changes.

export const VESSEL_CLASSES = ['runabout', 'lobster', 'sloop'] as const
export type VesselClassId = (typeof VESSEL_CLASSES)[number]

export const SAIL_PATTERNS = ['plain', 'band', 'stripes'] as const
export type SailPattern = (typeof SAIL_PATTERNS)[number]

export const ACCESSORIES = ['ensign', 'burgee'] as const
export type AccessoryId = (typeof ACCESSORIES)[number]

/** Which classes each accessory can be fitted to (a burgee flies from a masthead, so only boats with a mast) */
export const ACCESSORY_FITS: Record<AccessoryId, readonly VesselClassId[]> = {
  ensign: VESSEL_CLASSES,
  burgee: ['sloop']
}

/** Every cosmetic by its unlock id. Free ones are open to everyone; the rest need a VesselUnlock row before they can be equipped. */
export const COSMETICS = {
  'class:runabout': { free: true },
  'class:lobster': { free: true },
  'class:sloop': { free: true },
  'pattern:plain': { free: true },
  'pattern:band': { free: true },
  'pattern:stripes': { free: true },
  'accessory:ensign': { free: true },
  'accessory:burgee': { free: false }
} as const satisfies Record<string, { free: boolean }>
export type CosmeticId = keyof typeof COSMETICS

export const isCosmeticId = (id: string): id is CosmeticId => id in COSMETICS
export const FREE_COSMETICS = (Object.keys(COSMETICS) as CosmeticId[]).filter((id) => COSMETICS[id].free)

/** Colours only some classes show: the cabin and roof of a wheelhouse or coachroof, and the antifouling below the waterline */
export type VesselDetails = { cabinColor?: string; roofColor?: string; bottomColor?: string }

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

/** The cosmetics a configuration equips, by unlock id, so the server can check each is free or earned */
export const equippedCosmetics = (c: VesselConfig): CosmeticId[] => [
  `class:${c.vesselClass}`,
  `pattern:${c.sailPattern}`,
  ...c.accessories.map((a) => `accessory:${a}` as const)
]

/**
 * The classes a member's default boat is drawn from. Frozen at the original three, so adding a class to
 * VESSEL_CLASSES never reshuffles the boat of anyone who hasn't saved one.
 */
const DEFAULT_CLASSES: readonly VesselClassId[] = ['runabout', 'lobster', 'sloop']

/**
 * The boat a member sails until they customise it: the class and colours their id has always given them (the same
 * hash and palettes as the 2D harbor board), so it's identical on every screen, device and visit.
 */
export function defaultVesselConfig(memberId: string): VesselConfig {
  const h = hashString(memberId)
  const p = PALETTES[Math.floor(h / DEFAULT_CLASSES.length) % PALETTES.length]
  return {
    vesselClass: DEFAULT_CLASSES[h % DEFAULT_CLASSES.length],
    hullColor: p.hull,
    trimColor: p.trim,
    accentColor: p.accent,
    sailColor: p.sail,
    sailPattern: 'plain',
    accessories: ['ensign'],
    details: { cabinColor: p.cabin, roofColor: p.roof }
  }
}
