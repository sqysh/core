// Image preparation for reading faint QR codes: pulls a code that is only slightly different from its surroundings
// out of the picture. Pure functions over pixel arrays (no DOM), so they run anywhere and can be reused by any scanner.

/** One grey byte per pixel */
export type Gray = { data: Uint8Array; width: number; height: number }
/** RGBA bytes, as a decoder wants them */
export type Rgba = { data: Uint8ClampedArray; width: number; height: number }

export type Channel = 'luma' | 'r' | 'g' | 'b'

/** One colour channel (or the brightness) of an RGBA picture, as grey */
export function toGray(src: ImageData | Rgba, channel: Channel): Gray {
  const { data, width, height } = src
  const out = new Uint8Array(width * height)
  const o = channel === 'r' ? 0 : channel === 'g' ? 1 : 2
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] = channel === 'luma' ? (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29) >> 8 : data[p + o]
  }
  return { data: out, width, height }
}

/**
 * Blue minus green, on a mid-grey base (128 + blue - green). Brightness that moves red, green and blue together (the sea's
 * light and shade) mostly cancels, and a change made to the blue alone stays at full size.
 */
export function blueMinusGreen(src: ImageData | Rgba): Gray {
  const { data, width, height } = src
  const out = new Uint8Array(width * height)
  for (let i = 0, p = 0; i < out.length; i++, p += 4)
    out[i] = Math.max(0, Math.min(255, 128 + data[p + 2] - data[p + 1]))
  return { data: out, width, height }
}

/**
 * Blue as a share of blue plus green, scaled to 0-255 (255 * b / (b + g)). Light and shade multiply every channel by about
 * the same amount, which cancels in a ratio, and a code made by scaling the blue shows up as a change of that same
 * proportion wherever it falls, bright water or dark.
 */
export function blueGreenRatio(src: ImageData | Rgba): Gray {
  const { data, width, height } = src
  const out = new Uint8Array(width * height)
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    const b = data[p + 2]
    const g = data[p + 1]
    out[i] = (255 * b) / (b + g + 1)
  }
  return { data: out, width, height }
}

/** Spreads the picture's own range across black to white, ignoring the extreme 1% each way (so one speck can't fix the range) */
export function stretch(g: Gray): Gray {
  const hist = new Uint32Array(256)
  for (let i = 0; i < g.data.length; i++) hist[g.data[i]]++
  const cut = g.data.length * 0.01
  let lo = 0
  let hi = 255
  for (let n = 0; lo < 255 && (n += hist[lo]) < cut; lo++);
  for (let n = 0; hi > 0 && (n += hist[hi]) < cut; hi--);
  if (hi - lo < 2) return g
  const scale = 255 / (hi - lo)
  const out = new Uint8Array(g.data.length)
  for (let i = 0; i < out.length; i++) out[i] = Math.max(0, Math.min(255, (g.data[i] - lo) * scale))
  return { data: out, width: g.width, height: g.height }
}

/**
 * Adaptive contrast: each pixel is compared with the average of the area around it, and the difference is amplified.
 * That takes out slow changes (the sea's light and dark patches) and keeps small, sharp ones, which is what a faint
 * code is. The area is wide (an eighth of the picture) so it is wider than the code's big corner squares, and the pixel is
 * lightly smoothed first. The gain is chosen from how weak the differences are, so a plain picture isn't over-driven.
 * Averages come from an integral image, so the cost is a few passes over the pixels whatever the window.
 */
export function localContrast(
  g: Gray,
  window = Math.max(16, Math.round(g.width / 8)),
  smooth = Math.max(1, Math.round(g.width / 400))
): Gray {
  const { width: w, height: h, data } = g
  // integral image: sum of everything above and to the left
  const stride = w + 1
  const sum = new Uint32Array(stride * (h + 1))
  for (let y = 0; y < h; y++) {
    let row = 0
    for (let x = 0; x < w; x++) {
      row += data[y * w + x]
      sum[(y + 1) * stride + x + 1] = sum[y * stride + x + 1] + row
    }
  }
  /** Average of the square around (x, y), `r` pixels each way */
  const mean = (x: number, y: number, r: number) => {
    const x0 = Math.max(0, x - r)
    const x1 = Math.min(w, x + r + 1)
    const y0 = Math.max(0, y - r)
    const y1 = Math.min(h, y + r + 1)
    return (
      (sum[y1 * stride + x1] - sum[y0 * stride + x1] - sum[y1 * stride + x0] + sum[y0 * stride + x0]) /
      ((x1 - x0) * (y1 - y0))
    )
  }
  // a pixel (lightly smoothed, so sensor noise doesn't ride along) against the wide area around it
  const diff = new Float32Array(w * h)
  let energy = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = mean(x, y, smooth) - mean(x, y, window)
      diff[y * w + x] = d
      energy += d * d
    }
  }
  const spread = Math.sqrt(energy / (w * h)) || 1
  const gain = Math.max(1, Math.min(40, 48 / spread))
  const out = new Uint8Array(w * h)
  for (let i = 0; i < out.length; i++) out[i] = Math.max(0, Math.min(255, 128 + diff[i] * gain))
  return { data: out, width: w, height: h }
}

/** Grey bytes as the RGBA picture a decoder takes */
export function toRgba(g: Gray): Rgba {
  const out = new Uint8ClampedArray(g.data.length * 4)
  for (let i = 0, p = 0; i < g.data.length; i++, p += 4) {
    out[p] = out[p + 1] = out[p + 2] = g.data[i]
    out[p + 3] = 255
  }
  return { data: out, width: g.width, height: g.height }
}

/**
 * The preparations to try when the picture as it is won't read, cheapest and most likely first. Each takes the camera's
 * picture and returns one to decode. The colour channels are there because a code coloured differently from the sea
 * can be much stronger in one of them than in the brightness as a whole.
 */
export const PREPARATIONS: { name: string; run: (src: ImageData) => Rgba }[] = [
  { name: 'brightness, stretched', run: (s) => toRgba(stretch(toGray(s, 'luma'))) },
  { name: 'brightness, adaptive', run: (s) => toRgba(localContrast(toGray(s, 'luma'))) },
  { name: 'red, adaptive', run: (s) => toRgba(localContrast(toGray(s, 'r'))) },
  { name: 'green, adaptive', run: (s) => toRgba(localContrast(toGray(s, 'g'))) },
  { name: 'blue, adaptive', run: (s) => toRgba(localContrast(toGray(s, 'b'))) },
  { name: 'red, stretched', run: (s) => toRgba(stretch(toGray(s, 'r'))) },
  { name: 'green, stretched', run: (s) => toRgba(stretch(toGray(s, 'g'))) },
  { name: 'blue, stretched', run: (s) => toRgba(stretch(toGray(s, 'b'))) }
]
