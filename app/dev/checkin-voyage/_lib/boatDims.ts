import { VESSEL_CLASS_SPECS } from './vessel/classes'
import { BoatClass } from './identity'

/** Each class's size (world units): hull length and beam, and the masthead/roof height the nameplate ties to */
export const BOAT_DIMS = Object.fromEntries(
  Object.entries(VESSEL_CLASS_SPECS).map(([k, v]) => [k, v.dims])
) as Record<BoatClass, { length: number; beam: number; top: number }>
