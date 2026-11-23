import { rng } from './random'

// 3D simplex noise (after Stefan Gustavson's reference implementation), seeded, with fractal and ridged variants.
// Values are roughly in [-1, 1]. Each seed gets its own permutation table, built once and kept.

const GRAD = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1])
const F3 = 1 / 3
const G3 = 1 / 6
const tables = new Map<number, Uint8Array>()

function perm(seed: number) {
  let p = tables.get(seed)
  if (p) return p
  const r = rng(seed)
  const base = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[base[i], base[j]] = [base[j], base[i]]
  }
  p = new Uint8Array(512)
  for (let i = 0; i < 512; i++) p[i] = base[i & 255]
  tables.set(seed, p)
  return p
}

export function simplex3(x: number, y: number, z: number, seed = 0) {
  const p = perm(seed)
  const s = (x + y + z) * F3
  const i = Math.floor(x + s)
  const j = Math.floor(y + s)
  const k = Math.floor(z + s)
  const t = (i + j + k) * G3
  const x0 = x - (i - t)
  const y0 = y - (j - t)
  const z0 = z - (k - t)
  let i1, j1, k1, i2, j2, k2
  if (x0 >= y0) {
    if (y0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 1, 0]
    else if (x0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 0, 1]
    else [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 1, 0, 1]
  } else {
    if (y0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 0, 1, 1]
    else if (x0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 0, 1, 1]
    else [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 1, 1, 0]
  }
  const x1 = x0 - i1 + G3
  const y1 = y0 - j1 + G3
  const z1 = z0 - k1 + G3
  const x2 = x0 - i2 + 2 * G3
  const y2 = y0 - j2 + 2 * G3
  const z2 = z0 - k2 + 2 * G3
  const x3 = x0 - 1 + 3 * G3
  const y3 = y0 - 1 + 3 * G3
  const z3 = z0 - 1 + 3 * G3
  const ii = i & 255
  const jj = j & 255
  const kk = k & 255
  let n = 0
  let c = 0.6 - x0 * x0 - y0 * y0 - z0 * z0
  if (c > 0) {
    const g = (p[ii + p[jj + p[kk]]] % 12) * 3
    c *= c
    n += c * c * (GRAD[g] * x0 + GRAD[g + 1] * y0 + GRAD[g + 2] * z0)
  }
  c = 0.6 - x1 * x1 - y1 * y1 - z1 * z1
  if (c > 0) {
    const g = (p[ii + i1 + p[jj + j1 + p[kk + k1]]] % 12) * 3
    c *= c
    n += c * c * (GRAD[g] * x1 + GRAD[g + 1] * y1 + GRAD[g + 2] * z1)
  }
  c = 0.6 - x2 * x2 - y2 * y2 - z2 * z2
  if (c > 0) {
    const g = (p[ii + i2 + p[jj + j2 + p[kk + k2]]] % 12) * 3
    c *= c
    n += c * c * (GRAD[g] * x2 + GRAD[g + 1] * y2 + GRAD[g + 2] * z2)
  }
  c = 0.6 - x3 * x3 - y3 * y3 - z3 * z3
  if (c > 0) {
    const g = (p[ii + 1 + p[jj + 1 + p[kk + 1]]] % 12) * 3
    c *= c
    n += c * c * (GRAD[g] * x3 + GRAD[g + 1] * y3 + GRAD[g + 2] * z3)
  }
  return 32 * n
}

/** Fractal noise: octaves of simplex noise, each twice the frequency and half the strength */
export function fbm3(x: number, y: number, z: number, seed = 0, octaves = 4) {
  let sum = 0
  let amp = 0.5
  let f = 1
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    sum += amp * simplex3(x * f, y * f, z * f, seed + o * 31)
    norm += amp
    amp *= 0.5
    f *= 2.03
  }
  return sum / norm
}

/** Ridged fractal noise in [0, 1]: sharp crests where the noise crosses zero, like eroded ribs and runnels */
export function ridged3(x: number, y: number, z: number, seed = 0, octaves = 3) {
  let sum = 0
  let amp = 0.5
  let f = 1
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    const v = 1 - Math.abs(simplex3(x * f, y * f, z * f, seed + o * 17))
    sum += amp * v * v
    norm += amp
    amp *= 0.5
    f *= 2.1
  }
  return sum / norm
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
