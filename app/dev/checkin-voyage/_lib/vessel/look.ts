import { AccessoryId, SailPattern, VesselClassId, VesselConfig } from '@/lib/vessel/catalog'
import { VESSEL_CLASS_SPECS } from './classes'

// A saved vessel configuration resolved into everything the models paint with. Customisation never touches geometry:
// the models take a look, and every colour, pattern and accessory comes from it.

export type VesselLook = {
  hull: string
  trim: string
  accent: string
  cabin: string
  roof: string
  sail: string
  bottom: string
  sailPattern: SailPattern
  accessories: AccessoryId[]
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
    bottom: c.details.bottomColor ?? VESSEL_CLASS_SPECS[c.vesselClass as VesselClassId].bottom,
    sailPattern: c.sailPattern,
    accessories: c.accessories
  }
}
