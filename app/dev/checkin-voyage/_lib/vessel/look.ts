import {
  AccessoryId,
  accessoriesOf,
  Finish,
  partsOf,
  SailPattern,
  StageId,
  stageOf,
  VesselConfig
} from '@/lib/vessel/catalog'
import { specOf } from './modular'

// A saved vessel configuration resolved into everything the models paint with: every colour, the finish, the sail
// pattern and the flags, and for the modular boat the parts fitted to it.

export type VesselLook = {
  hull: string
  trim: string
  accent: string
  cabin: string
  roof: string
  sail: string
  bottom: string
  /** Cushions (the runabout's seats): the cabin colour unless chosen */
  seats: string
  /** A painted deck, or null for bare teak (or the class's own deck paint) */
  deck: string | null
  /** Painted fittings (rails, mast, outboard, radar), or null for the original chrome and steel */
  equipment: string | null
  finish: Finish
  sailPattern: SailPattern
  accessories: AccessoryId[]
  /** The modular boat's fitted parts, structure and accessories (null for a heritage class) */
  parts: string[] | null
  /** Its vessel level, and the accessories its member chose (packed into the level's deck zones) */
  stage: StageId
  chosen: string[]
}

export function lookOf(c: VesselConfig): VesselLook {
  return {
    hull: c.hullColor,
    trim: c.trimColor,
    accent: c.accentColor,
    // a custom boat that never chose a cabin gets a white house with a roof in its hull colour
    cabin: c.details.cabinColor ?? '#fbf6ec',
    roof: c.details.roofColor ?? c.hullColor,
    sail: c.sailColor,
    bottom: c.details.bottomColor ?? specOf(c).bottom,
    seats: c.details.seatsColor ?? c.details.cabinColor ?? '#fbf6ec',
    deck: c.details.deckColor ?? null,
    equipment: c.details.equipmentColor ?? null,
    finish: c.details.finish ?? 'gloss',
    sailPattern: c.sailPattern,
    accessories: c.accessories,
    parts: c.vesselClass === 'modular' ? partsOf(c) : null,
    stage: stageOf(c),
    chosen: c.vesselClass === 'modular' ? accessoriesOf(c) : []
  }
}
