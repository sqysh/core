import { BoatClass } from './identity'

/** Each class's size (world units): hull length and beam, and the masthead/roof height the nameplate ties to */
export const BOAT_DIMS: Record<BoatClass, { length: number; beam: number; top: number }> = {
  runabout: { length: 1.9, beam: 0.76, top: 0.6 },
  lobster: { length: 2.5, beam: 0.94, top: 1.35 },
  sloop: { length: 2.25, beam: 0.8, top: 3.25 }
}
