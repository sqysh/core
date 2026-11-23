import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat, UnsignedByteType } from 'three'
import { hash3 } from '../core/random'

// Tileable granite grain, painted procedurally: a mosaic of interlocking crystals like a cut through Cape Ann granite.
// Pink-buff feldspar, glassy gray quartz and black biotite / hornblende flecks, each crystal its own shade, with a
// finer mottling inside them and fine grooves where crystals meet. Two textures come out, both seamless:
//
//   albedo  rgb: how each crystal tints the rock (a multiplier, stored ÷ 1.6), a: relative roughness (quartz glossy)
//   normal  rgb: tangent-space normal of the crystal relief, a: the relief itself
//   weather rgb: tangent-space normal of smooth weathering relief (pits, swells, runnels), a: that relief, as soft noise

const SIZE = 256

type Grain = { albedo: DataTexture; normal: DataTexture; weather: DataTexture }
let cached: Grain | null = null

/** Nearest and second-nearest jittered points on a periodic grid of g×g cells, and the nearest one's id */
function voronoi(u: number, v: number, g: number, seed: number) {
  const x = u * g
  const y = v * g
  const ci = Math.floor(x)
  const cj = Math.floor(y)
  let f1 = 1e9
  let f2 = 1e9
  let id = 0
  for (let dj = -1; dj <= 1; dj++)
    for (let di = -1; di <= 1; di++) {
      const i = ci + di
      const j = cj + dj
      const wi = ((i % g) + g) % g
      const wj = ((j % g) + g) % g
      const px = i + 0.1 + 0.8 * hash3(wi, wj, 1, seed)
      const py = j + 0.1 + 0.8 * hash3(wi, wj, 2, seed)
      const d = Math.hypot(x - px, y - py)
      if (d < f1) {
        f2 = f1
        f1 = d
        id = wi + wj * g
      } else if (d < f2) f2 = d
    }
  return { f1, f2, id }
}

export function grainTextures(seed = 11): Grain {
  if (cached) return cached
  const height = new Float32Array(SIZE * SIZE)
  const albedo = new Uint8Array(SIZE * SIZE * 4)
  for (let py = 0; py < SIZE; py++)
    for (let px = 0; px < SIZE; px++) {
      const u = px / SIZE
      const v = py / SIZE
      const big = voronoi(u, v, 26, seed)
      const fine = voronoi(u, v, 71, seed + 9)
      const pick = hash3(big.id, 3, 7, seed)
      const shade = hash3(big.id, 5, 9, seed)
      let r: number, g: number, b: number, rough: number, lift: number
      if (pick < 0.52) {
        // feldspar: pink to buff
        const pink = hash3(big.id, 6, 1, seed)
        r = 1.06 + 0.12 * pink + 0.08 * shade
        g = 0.97 + 0.06 * shade - 0.04 * pink
        b = 0.9 + 0.05 * shade - 0.06 * pink
        rough = 0.68
        lift = 0.55
      } else if (pick < 0.8) {
        // quartz: glassy, pale smoky gray
        r = g = 1.1 + 0.12 * shade
        b = r + 0.03
        rough = 0.28
        lift = 0.8
      } else if (pick < 0.97) {
        // biotite and hornblende: near black flecks
        r = g = b = 0.32 + 0.18 * shade
        rough = 0.5
        lift = 0.35
      } else {
        // the odd rusty grain where iron has weathered out
        r = 1.05
        g = 0.72
        b = 0.5
        rough = 0.8
        lift = 0.4
      }
      const mottle = 0.94 + 0.12 * hash3(fine.id, 1, 1, seed)
      const edge = Math.min(1, (big.f2 - big.f1) * 3.2)
      const i = (py * SIZE + px) * 4
      albedo[i] = Math.min(255, ((r * mottle) / 1.6) * 255)
      albedo[i + 1] = Math.min(255, ((g * mottle) / 1.6) * 255)
      albedo[i + 2] = Math.min(255, ((b * mottle) / 1.6) * 255)
      albedo[i + 3] = rough * 255
      // relief: crystals stand proud, grooved where they meet, a fine roughness within
      height[py * SIZE + px] = lift * (0.4 + 0.6 * edge) + 0.15 * (fine.f1 - 0.5) + 0.1 * shade
    }

  const normal = new Uint8Array(SIZE * SIZE * 4)
  const at = (x: number, y: number) => height[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)]
  const strength = 2.2
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      const l = Math.hypot(dx, dy, 1)
      const i = (y * SIZE + x) * 4
      normal[i] = (-dx / l) * 127.5 + 127.5
      normal[i + 1] = (-dy / l) * 127.5 + 127.5
      normal[i + 2] = (1 / l) * 127.5 + 127.5
      normal[i + 3] = Math.min(255, Math.max(0, at(x, y) * 255))
    }

  // weathering: smooth periodic value noise over several octaves, so it tiles without seams
  const weatherH = new Float32Array(SIZE * SIZE)
  const lattice = (ix: number, iy: number, period: number, oct: number) =>
    hash3(((ix % period) + period) % period, ((iy % period) + period) % period, oct, seed + 40)
  const smooth = (t: number) => t * t * (3 - 2 * t)
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      let h = 0
      let amp = 1
      let norm = 0
      for (let oct = 0; oct < 5; oct++) {
        const period = 4 << oct
        const fx = (x / SIZE) * period
        const fy = (y / SIZE) * period
        const ix = Math.floor(fx)
        const iy = Math.floor(fy)
        const tx = smooth(fx - ix)
        const ty = smooth(fy - iy)
        const a = lattice(ix, iy, period, oct)
        const b = lattice(ix + 1, iy, period, oct)
        const c2 = lattice(ix, iy + 1, period, oct)
        const d = lattice(ix + 1, iy + 1, period, oct)
        h += amp * (a + (b - a) * tx + (c2 - a) * ty + (a - b - c2 + d) * tx * ty)
        norm += amp
        amp *= 0.55
      }
      weatherH[y * SIZE + x] = h / norm
    }
  const weather = new Uint8Array(SIZE * SIZE * 4)
  const wAt = (x: number, y: number) => weatherH[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)]
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const dx = (wAt(x + 1, y) - wAt(x - 1, y)) * 9
      const dy = (wAt(x, y + 1) - wAt(x, y - 1)) * 9
      const l = Math.hypot(dx, dy, 1)
      const i = (y * SIZE + x) * 4
      weather[i] = (-dx / l) * 127.5 + 127.5
      weather[i + 1] = (-dy / l) * 127.5 + 127.5
      weather[i + 2] = (1 / l) * 127.5 + 127.5
      weather[i + 3] = Math.min(255, Math.max(0, wAt(x, y) * 255))
    }

  const make = (data: Uint8Array) => {
    const t = new DataTexture(data, SIZE, SIZE, RGBAFormat, UnsignedByteType)
    t.wrapS = t.wrapT = RepeatWrapping
    t.generateMipmaps = true
    t.minFilter = LinearMipmapLinearFilter
    t.magFilter = LinearFilter
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }
  cached = { albedo: make(albedo), normal: make(normal), weather: make(weather) }
  return cached
}
