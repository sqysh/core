// The authored sandstone formations of the harbor's mainland and islet, in the diorama's screen-aligned (u, v) frame.
// The terrain (./terrain) grows from these, and the stones emerge from it.

export type Slab = { u: number; v: number; y: number; h: number; w: number; d: number; rot?: number; seed: number; grass?: boolean | number }

/** The mainland: three terraces climbing from the sandy cove by the neck up toward the back-left corner */
export const SLABS: Slab[] = [
  // the cove's shelf, grass on top
  { u: -11, v: -7, y: 0.12, h: 1.0, w: 4.2, d: 3.2, rot: 0.2, seed: 301, grass: true },
  { u: -11.4, v: -7.4, y: 1.1, h: 0.8, w: 3.0, d: 2.3, rot: -0.15, seed: 302, grass: true },
  { u: -15, v: -6, y: 0.12, h: 1.3, w: 3.6, d: 2.8, rot: 0.4, seed: 303 },
  { u: -15.3, v: -6.3, y: 1.4, h: 0.9, w: 2.4, d: 1.9, rot: 0.1, seed: 304, grass: true },
  { u: -15.5, v: -2.5, y: 0.12, h: 0.8, w: 2.6, d: 1.8, rot: -0.3, seed: 320, grass: true },
  { u: -7, v: -9.5, y: 0.12, h: 0.7, w: 2.4, d: 1.8, rot: 0.2, seed: 319 },
  // the middle rise
  { u: -18.5, v: -9.5, y: 0.12, h: 1.8, w: 4.8, d: 3.6, rot: -0.1, seed: 305 },
  { u: -18.8, v: -9.9, y: 1.9, h: 1.1, w: 3.4, d: 2.6, rot: 0.25, seed: 306 },
  { u: -19.1, v: -10.2, y: 3.0, h: 0.7, w: 2.2, d: 1.7, rot: -0.3, seed: 307, grass: true },
  { u: -13, v: -12, y: 0.12, h: 1.5, w: 4.0, d: 3.4, rot: 0.6, seed: 308 },
  { u: -13.2, v: -12.4, y: 1.6, h: 1.0, w: 3.0, d: 2.4, rot: 0.2, seed: 309, grass: true },
  { u: -8.6, v: -13.5, y: 0.12, h: 1.1, w: 3.2, d: 2.6, rot: -0.4, seed: 310 },
  { u: -8.8, v: -13.9, y: 1.2, h: 0.6, w: 2.0, d: 1.6, rot: 0.3, seed: 311, grass: true },
  { u: -18.5, v: -5, y: 0.12, h: 1.0, w: 3.4, d: 2.6, rot: 0.5, seed: 312 },
  { u: -18.8, v: -5.3, y: 1.1, h: 0.7, w: 2.2, d: 1.8, rot: 0, seed: 313, grass: true },
  // the high ground at the back
  { u: -19.5, v: -12, y: 0.12, h: 2.0, w: 5.0, d: 4.0, rot: 0.2, seed: 314 },
  { u: -20.0, v: -13.2, y: 2.1, h: 1.2, w: 3.6, d: 2.8, rot: -0.2, seed: 315 },
  { u: -20.4, v: -13.9, y: 3.3, h: 0.8, w: 2.4, d: 1.8, rot: 0.4, seed: 316, grass: true },
  { u: -21.5, v: -18, y: 0.12, h: 2.4, w: 5.5, d: 4.5, rot: 0.1, seed: 317 },
  { u: -21.9, v: -18.4, y: 2.5, h: 1.5, w: 4.0, d: 3.2, rot: 0.3, seed: 318, grass: true },
  { u: -16, v: -16, y: 0.12, h: 1.6, w: 3.6, d: 3.0, rot: -0.5, seed: 321 },
  { u: -16.3, v: -16.3, y: 1.7, h: 0.9, w: 2.6, d: 2.0, rot: 0.1, seed: 322, grass: true },
  // the islet behind the harbor
  { u: 13.5, v: -11.5, y: 0.12, h: 1.1, w: 3.0, d: 2.3, rot: 0.3, seed: 331 },
  { u: 13.3, v: -11.8, y: 1.2, h: 0.8, w: 2.0, d: 1.5, rot: -0.2, seed: 332, grass: true },
  { u: 14.6, v: -10.6, y: 0.12, h: 0.5, w: 1.2, d: 0.9, rot: 0.6, seed: 333 }
]

/** Stone steps from the cove up onto the first terrace, stacked slabs like the island's own stairs */
export const STEPS: Slab[] = [
  { u: -9.3, v: -4.5, y: 0.12, h: 0.5, w: 1.05, d: 0.55, rot: 0.15, seed: 341 },
  { u: -9.6, v: -5.0, y: 0.12, h: 0.85, w: 1.0, d: 0.55, rot: 0.1, seed: 342 },
  { u: -9.9, v: -5.5, y: 0.12, h: 1.2, w: 1.0, d: 0.55, rot: 0.05, seed: 343 },
  { u: -13.9, v: -9.6, y: 1.1, h: 0.45, w: 0.95, d: 0.5, rot: 0.4, seed: 344 },
  { u: -14.3, v: -10.1, y: 1.1, h: 0.85, w: 0.95, d: 0.5, rot: 0.4, seed: 345 },
  { u: -14.7, v: -10.6, y: 1.1, h: 1.25, w: 0.95, d: 0.5, rot: 0.4, seed: 346 }
]

