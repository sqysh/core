// A hull's lines as plain numbers: its stations (half-beam, sheer and keel along its length). No 3D library here, so
// anything that only needs a boat's proportions (the class specs, the Garage's class cards) can use them without
// loading three. The lofted geometry built from these lives in hull.ts.

export type HullSpec = {
  length: number
  beam: number
  /** Keel depth below the stern's sheer */
  depth: number
  /** Sheer height at the stern and how far it climbs at the bow */
  sheer: number
  sheerRise: number
  /** Width of the transom as a fraction of the beam */
  transom: number
  /** How far the stem rakes aft at the waterline, as a fraction of length */
  rake: number
  /** Section shape: lower is boxier, higher is rounder */
  fullness: number
  /** Waterline height (local y) */
  waterline: number
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function hullStations(spec: HullSpec) {
  const halfBeam = (s: number) => {
    const aft = spec.transom + (1 - spec.transom) * Math.pow(smooth(0, 0.5, s), 0.55)
    const bow = s < 0.5 ? 1 : Math.pow(Math.max(0, 1 - Math.pow((s - 0.5) / 0.5, 2.1)), 0.62)
    return (spec.beam / 2) * Math.min(aft, bow)
  }
  const sheer = (s: number) => spec.sheer + spec.sheerRise * Math.pow(s, 2.3)
  const keel = (s: number) => spec.depth * (1 - 0.82 * Math.pow(smooth(0.55, 1, s), 1.3))
  return { halfBeam, sheer, keel }
}
