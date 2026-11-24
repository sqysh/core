import { HeritageClassId } from '@/lib/vessel/catalog'
import { HullSpec, hullStations } from '../hullLines'

// Each hand-built (heritage) class as data: its hull lines, size, how it handles, how it rides the water, and the points where
// fittings and accessories attach. The simulation, the anchor, the wakes and the models all read from here, so a new
// class is one entry here, its model in Boats.tsx, and its id in the shared catalog — nothing in the movement or
// animation code changes. The modular boat members build gets the same kind of spec from its build (modular.ts).

export type Vec3 = [number, number, number]

export type VesselClassSpec = {
  hull: HullSpec
  /** Hull length and beam, and the masthead/roof height the nameplate ties to (above the waterline) */
  dims: { length: number; beam: number; top: number }
  /** How high it floats: lifts the painted waterline to the water */
  lift: number
  /** Default antifouling colour below the waterline */
  bottom: string
  handling: {
    /** Speed it comes into the harbor at, and its top speed under a player */
    cruise: number
    /** Fraction of top speed it can make astern */
    reverse: number
    /** How quickly it gathers way and sheds it (units/s²) */
    accel: number
    brake: number
    /** Fastest it can turn (rad/s), once it has steerage way */
    turn: number
    /** How hard it heels into a turn, the most it will heel (rad), and how much it lifts its bow with speed */
    lean: number
    heel: number
    planing: number
    /** How much rudder she has at a standstill, as a fraction of her full turn (a bow thruster gives her plenty) */
    steerage: number
  }
  /** Natural frequencies (rad/s) of heave, pitch and roll, and their damping: lighter boats are quicker and livelier */
  ride: { heave: number; pitch: number; roll: number; damping: number }
  /** Anchor size (shank length) */
  anchor: number
  /** How deep she reaches below the waterline: at the helm she can't go where the water's shallower than this */
  draft: number
  /** How far from the harbor's middle she can take herself out into open water */
  range: number
  /** Fitting points in the hull's frame: bow along +x, waterline near y = 0 (before `lift`) */
  mounts: {
    /** The bow roller the anchor stows in and its rode runs over */
    roller: Vec3
    ensign: { at: Vec3; size: number }
    masthead?: Vec3
  }
}

/** Sheer height at a point along a hull */
const sheerAt = (spec: HullSpec, x: number) => hullStations(spec).sheer(Math.min(1, Math.max(0, x / spec.length + 0.5)))

const RUNABOUT: HullSpec = {
  length: 1.9,
  beam: 0.76,
  depth: 0.3,
  sheer: 0.12,
  sheerRise: 0.1,
  transom: 0.86,
  rake: 0.16,
  fullness: 0.42,
  waterline: -0.047
}
const LOBSTER: HullSpec = {
  length: 2.5,
  beam: 0.94,
  depth: 0.42,
  sheer: 0.2,
  sheerRise: 0.2,
  transom: 0.84,
  rake: 0.07,
  fullness: 0.48,
  waterline: -0.062
}
const SLOOP: HullSpec = {
  length: 2.25,
  beam: 0.8,
  depth: 0.36,
  sheer: 0.14,
  sheerRise: 0.09,
  transom: 0.68,
  rake: 0.18,
  fullness: 0.58,
  waterline: -0.057
}

/** The sloop's mast: where it steps, and its height above the deck */
export const SLOOP_MAST = { x: 0.3, h: 3.05 }

export const VESSEL_CLASS_SPECS: Record<HeritageClassId, VesselClassSpec> = {
  runabout: {
    hull: RUNABOUT,
    dims: { length: 1.9, beam: 0.76, top: 0.6 },
    lift: 0.08,
    bottom: '#e8e2d6',
    handling: {
      cruise: 3.9,
      reverse: 0.35,
      accel: 1.7,
      brake: 1.6,
      turn: 0.95,
      lean: 0.5,
      heel: 0.2,
      planing: 0.07,
      steerage: 0.12
    },
    ride: { heave: 5.2, pitch: 4.4, roll: 3.8, damping: 0.5 },
    anchor: 0.12,
    draft: 0.32,
    range: 37,
    mounts: {
      roller: [0.84, sheerAt(RUNABOUT, 0.84) + 0.015, 0],
      ensign: { at: [-0.92, 0.42, 0.24], size: 0.13 }
    }
  },
  lobster: {
    hull: LOBSTER,
    dims: { length: 2.5, beam: 0.94, top: 1.35 },
    lift: 0.095,
    bottom: '#a33c2e',
    handling: {
      cruise: 3.0,
      reverse: 0.35,
      accel: 1.0,
      brake: 1.1,
      turn: 0.62,
      lean: 0.3,
      heel: 0.1,
      planing: 0.025,
      steerage: 0.12
    },
    ride: { heave: 3.8, pitch: 3.1, roll: 2.7, damping: 0.55 },
    anchor: 0.16,
    draft: 0.55,
    range: 47,
    mounts: {
      roller: [1.15, sheerAt(LOBSTER, 1.15) + 0.015, 0],
      ensign: { at: [-1.05, sheerAt(LOBSTER, -1.05) + 0.88, 0], size: 0.12 }
    }
  },
  sloop: {
    hull: SLOOP,
    dims: { length: 2.25, beam: 0.8, top: 3.25 },
    lift: 0.09,
    bottom: '#2a3646',
    handling: {
      cruise: 2.7,
      reverse: 0.3,
      accel: 0.8,
      brake: 0.9,
      turn: 0.55,
      lean: 0.3,
      heel: 0.12,
      planing: 0.025,
      steerage: 0.12
    },
    // the keel makes it stiff and slow in roll
    ride: { heave: 4.2, pitch: 3.4, roll: 2.3, damping: 0.45 },
    anchor: 0.14,
    draft: 0.95,
    range: 50,
    mounts: {
      roller: [1.06, sheerAt(SLOOP, 1.06) + 0.015, 0],
      ensign: { at: [-1.12, sheerAt(SLOOP, -1.12) + 0.3, 0.1], size: 0.12 },
      masthead: [SLOOP_MAST.x, sheerAt(SLOOP, SLOOP_MAST.x) - 0.02 + SLOOP_MAST.h, 0]
    }
  }
}
