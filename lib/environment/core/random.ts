// Seeded randomness for procedural assets: the same seed always builds the same variation.

/** A deterministic random stream in [0, 1) (mulberry32) */
export function rng(seed: number) {
  let a = (seed | 0) ^ 0x9e3779b9
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A number in [lo, hi) from a random stream */
export const range = (r: () => number, lo: number, hi: number) => lo + (hi - lo) * r()

/** A stable integer hash of several integers, for per-cell or per-crystal randomness */
export function hash3(x: number, y: number, z: number, seed = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2147483647) + Math.imul(seed | 0, 144665)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
