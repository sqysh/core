// Deterministic noise for sculpting geometry: the same seed gives the same rock, tree or shoreline every render.

function hash(x: number, y: number, z: number, seed: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(seed, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

const fade = (t: number) => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Smooth value noise in [-1, 1] */
export function noise3(x: number, y: number, z: number, seed = 0) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const u = fade(x - xi)
  const v = fade(y - yi)
  const w = fade(z - zi)
  const x00 = lerp(hash(xi, yi, zi, seed), hash(xi + 1, yi, zi, seed), u)
  const x10 = lerp(hash(xi, yi + 1, zi, seed), hash(xi + 1, yi + 1, zi, seed), u)
  const x01 = lerp(hash(xi, yi, zi + 1, seed), hash(xi + 1, yi, zi + 1, seed), u)
  const x11 = lerp(hash(xi, yi + 1, zi + 1, seed), hash(xi + 1, yi + 1, zi + 1, seed), u)
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w) * 2 - 1
}

export function fbm3(x: number, y: number, z: number, seed = 0, octaves = 3) {
  let sum = 0
  let amp = 0.5
  let f = 1
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3(x * f, y * f, z * f, seed + i * 17)
    amp *= 0.5
    f *= 2.03
  }
  return sum
}

/** Seeded random in [0, 1) */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
