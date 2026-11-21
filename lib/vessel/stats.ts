import { specOf } from '@/app/dev/checkin-voyage/_lib/vessel/modular'
import { partsOf, stageOf, VesselConfig } from './catalog'
import { abilitiesOf, AbilityId, roomUsed } from './items'

// A boat's gameplay statistics, in the units members read: knots, seconds, metres, deck spots. Every one is read off
// the spec the harbor's controller sails her by (vessel/modular.ts and vessel/motion.ts: top speed and acceleration
// drive the throttle, turn rate and steerage the rudder, roll and damping the way she rides a swell, draft and range
// where her helm can take her), so nothing here is a number for show. It's derived from the boat as configured, on
// the server and in the Garage alike; a client never sends stats, only a boat, which the server validates.

/** One world unit, in metres: the skiff's 1.55 units is a 15-footer */
export const METRES_PER_UNIT = 3
const KNOTS_PER_UNIT_PER_SECOND = METRES_PER_UNIT * 1.94384

export type VesselStats = {
  /** Top speed, knots */
  topSpeed: number
  /** Seconds from a standstill to top speed */
  toTopSpeed: number
  /** Fastest turn under way, degrees a second */
  turnRate: number
  /** Turning circle at top speed, metres across */
  turningCircle: number
  /** Share of her turn she has at a standstill (a bow thruster raises it) */
  lowSpeedTurn: number
  /** How steady she rides a swell, 0 to 100 */
  stability: number
  /** Deck spots for accessories: in use, and in all */
  deckSpace: { used: number; total: number }
  /** How deep she draws, metres: she can't go where it's shallower */
  draft: number
  /** How far from the harbor she can range, metres */
  range: number
  /** What she can do */
  abilities: AbilityId[]
}

export function vesselStats(c: VesselConfig): VesselStats {
  const spec = specOf(c)
  const h = spec.handling
  const modular = c.vesselClass === 'modular'
  const room = modular ? roomUsed(stageOf(c), partsOf(c)) : []
  const stability = 100 * (1 - (spec.ride.roll - 1.2) / 3.4) + (spec.ride.damping - 0.5) * 40
  return {
    topSpeed: h.cruise * KNOTS_PER_UNIT_PER_SECOND,
    toTopSpeed: h.cruise / h.accel,
    turnRate: (h.turn * 180) / Math.PI,
    turningCircle: 2 * (h.cruise / h.turn) * METRES_PER_UNIT,
    lowSpeedTurn: h.steerage,
    stability: Math.round(Math.min(100, Math.max(0, stability))),
    deckSpace: room.reduce((n, z) => ({ used: n.used + z.used, total: n.total + z.total }), { used: 0, total: 0 }),
    draft: spec.draft * METRES_PER_UNIT,
    range: spec.range * METRES_PER_UNIT,
    abilities: modular ? abilitiesOf(partsOf(c)) : []
  }
}

/** The kind of water her range opens up */
export function rangeName(metres: number) {
  return metres < 120 ? 'Harbor' : metres < 150 ? 'Coastal' : metres < 180 ? 'Offshore' : 'The whole chart'
}

/** Each stat, how to show it, and which way is better (so a change can be called an improvement or a trade-off) */
export type StatRow = {
  key: 'topSpeed' | 'toTopSpeed' | 'turningCircle' | 'stability' | 'lowSpeedTurn' | 'draft' | 'range'
  label: string
  unit: string
  digits: number
  better: 'up' | 'down'
  max: number
  /** Shown multiplied by this (a fraction as a percentage) */
  scale?: number
}
export const STAT_ROWS: StatRow[] = [
  { key: 'topSpeed', label: 'Top speed', unit: 'kn', digits: 1, better: 'up', max: 30 },
  { key: 'toTopSpeed', label: 'To top speed', unit: 's', digits: 1, better: 'down', max: 6 },
  { key: 'turningCircle', label: 'Turning circle', unit: 'm', digits: 0, better: 'down', max: 60 },
  { key: 'stability', label: 'Stability', unit: '/100', digits: 0, better: 'up', max: 100 },
  { key: 'lowSpeedTurn', label: 'Turning at rest', unit: '%', digits: 0, better: 'up', max: 1, scale: 100 },
  { key: 'draft', label: 'Draft', unit: 'm', digits: 1, better: 'down', max: 4 },
  { key: 'range', label: 'Range', unit: 'm', digits: 0, better: 'up', max: 220 }
]

/** A stat as members read it */
export const statText = (r: StatRow, v: number) =>
  `${(v * (r.scale ?? 1)).toFixed(r.digits)}${r.unit === '/100' || r.unit === '%' ? '' : ' '}${r.unit}`

/** What changes between two boats, stat by stat, and whether each change is an improvement */
export function statChanges(from: VesselStats, to: VesselStats) {
  return STAT_ROWS.map((r) => {
    const a = from[r.key]
    const b = to[r.key]
    const tiny = (0.5 * Math.pow(10, -r.digits)) / (r.scale ?? 1)
    if (Math.abs(b - a) < tiny) return null
    return { row: r, from: a, to: b, better: r.better === 'up' ? b > a : b < a }
  }).filter((x): x is NonNullable<typeof x> => !!x)
}
