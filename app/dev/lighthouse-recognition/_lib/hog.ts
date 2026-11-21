// Histograms of oriented gradients: the picture described by which way its edges run, cell by cell. Edge directions
// survive changes of brightness and colour, which is what makes them good for recognising a shape under different
// lighting. Pure functions over grey pixel arrays.

/** Orientation bins over 0-180° (an edge and its opposite count as the same direction) */
export const BINS = 9

export type Hog = { cols: number; rows: number; data: Float32Array }

/** Brightness of an RGBA picture, 0-255 */
export function grayOf(img: ImageData): Float32Array {
  const out = new Float32Array(img.width * img.height)
  const d = img.data
  for (let i = 0, p = 0; i < out.length; i++, p += 4) out[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]
  return out
}

/** A grey picture scaled to a new size, sampling between pixels */
export function resize(src: Float32Array, w: number, h: number, nw: number, nh: number): Float32Array {
  const out = new Float32Array(nw * nh)
  const sx = w / nw
  const sy = h / nh
  for (let y = 0; y < nh; y++) {
    const fy = Math.min(h - 1, Math.max(0, (y + 0.5) * sy - 0.5))
    const y0 = Math.floor(fy)
    const y1 = Math.min(h - 1, y0 + 1)
    const ty = fy - y0
    for (let x = 0; x < nw; x++) {
      const fx = Math.min(w - 1, Math.max(0, (x + 0.5) * sx - 0.5))
      const x0 = Math.floor(fx)
      const x1 = Math.min(w - 1, x0 + 1)
      const tx = fx - x0
      const a = src[y0 * w + x0] * (1 - tx) + src[y0 * w + x1] * tx
      const b = src[y1 * w + x0] * (1 - tx) + src[y1 * w + x1] * tx
      out[y * nw + x] = a * (1 - ty) + b * ty
    }
  }
  return out
}

/**
 * Cell histograms of edge direction, each weighted by edge strength and shared between the two nearest bins, then each
 * cell divided by the strength of its 3×3 neighbourhood: the same shape gives the same description whether it is lit
 * brightly or dimly, or seen with more or less contrast.
 */
export function hog(g: Float32Array, w: number, h: number, cell: number): Hog {
  const cols = Math.floor(w / cell)
  const rows = Math.floor(h / cell)
  const raw = new Float32Array(cols * rows * BINS)
  for (let y = 1; y < Math.min(h - 1, rows * cell); y++) {
    const cy = Math.floor(y / cell)
    for (let x = 1; x < Math.min(w - 1, cols * cell); x++) {
      const gx = g[y * w + x + 1] - g[y * w + x - 1]
      const gy = g[(y + 1) * w + x] - g[(y - 1) * w + x]
      const mag = Math.sqrt(gx * gx + gy * gy)
      if (mag === 0) continue
      let angle = Math.atan2(gy, gx)
      if (angle < 0) angle += Math.PI
      const f = (angle / Math.PI) * BINS - 0.5
      const b0 = Math.floor(f)
      const frac = f - b0
      const base = (cy * cols + Math.floor(x / cell)) * BINS
      raw[base + ((b0 + BINS) % BINS)] += mag * (1 - frac)
      raw[base + ((b0 + 1) % BINS)] += mag * frac
    }
  }
  const energy = new Float32Array(cols * rows)
  for (let c = 0; c < energy.length; c++) {
    let e = 0
    for (let b = 0; b < BINS; b++) e += raw[c * BINS + b] ** 2
    energy[c] = e
  }
  // a floor under the divisor, so flat areas (a calm patch of sky or sea) stay quiet instead of having noise blown up
  const floor = (cell * cell * 2) ** 2
  const data = new Float32Array(raw.length)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let e = floor
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr
          const cc = c + dc
          if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) e += energy[rr * cols + cc]
        }
      const k = 1 / Math.sqrt(e)
      const i = (r * cols + c) * BINS
      for (let b = 0; b < BINS; b++) data[i + b] = raw[i + b] * k
    }
  }
  return { cols, rows, data }
}
