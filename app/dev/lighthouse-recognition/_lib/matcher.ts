import { BINS, grayOf, hog, resize } from './hog'

// Finds the lighthouse in a camera frame: its edge description (hog.ts) is compared with the frame's at every place
// and at a range of sizes, by zero-mean normalised correlation, so the score (-1 to 1) doesn't depend on how bright or
// contrasty the picture is. Sizes are covered by shrinking the frame, from the lighthouse being as small as the
// template (far away) to filling most of the frame (close up).

/** Pixels per cell, and the template's height in cells */
export const CELL = 4
export const TEMPLATE_ROWS = 10
/** Each size tried is this much bigger than the last */
const SCALE_STEP = 1.25

export type Template = {
  cols: number
  rows: number
  /** The description less its mean */
  t: Float32Array
  /** Length of `t` */
  norm: number
}

export type Match = {
  score: number
  /** Where, in the frame's pixels */
  x: number
  y: number
  w: number
  h: number
}

/** The template's size in cells for a reference picture of this shape */
export function templateCells(width: number, height: number) {
  return { rows: TEMPLATE_ROWS, cols: Math.max(2, Math.round((TEMPLATE_ROWS * width) / height)) }
}

/** A template from a reference picture already drawn at the template's size in pixels */
export function makeTemplate(img: ImageData): Template {
  const h = hog(grayOf(img), img.width, img.height, CELL)
  const t = new Float32Array(h.data.length)
  let mean = 0
  for (let i = 0; i < h.data.length; i++) mean += h.data[i]
  mean /= h.data.length
  let norm = 0
  for (let i = 0; i < t.length; i++) {
    t[i] = h.data[i] - mean
    norm += t[i] * t[i]
  }
  return { cols: h.cols, rows: h.rows, t, norm: Math.sqrt(norm) || 1 }
}

/** The best match for the template anywhere in the frame, at any size from the template's own up to most of the frame */
export function findBest(frame: ImageData, tpl: Template): Match | null {
  const W = frame.width
  const H = frame.height
  const gray = grayOf(frame)
  const tplH = tpl.rows * CELL
  const n = tpl.cols * tpl.rows * BINS
  let best: Match | null = null

  for (let height = tplH; height <= H * 0.9; height *= SCALE_STEP) {
    const s = tplH / height
    const lw = Math.round(W * s)
    const lh = Math.round(H * s)
    const level = hog(s === 1 ? gray : resize(gray, W, H, lw, lh), lw, lh, CELL)
    const { cols, rows, data } = level
    if (cols < tpl.cols || rows < tpl.rows) break

    // running sums of each cell's values and squares, so a window's mean and spread cost four lookups
    const stride = cols + 1
    const sum = new Float64Array(stride * (rows + 1))
    const sq = new Float64Array(stride * (rows + 1))
    for (let r = 0; r < rows; r++) {
      let rs = 0
      let rq = 0
      for (let c = 0; c < cols; c++) {
        for (let b = 0; b < BINS; b++) {
          const v = data[(r * cols + c) * BINS + b]
          rs += v
          rq += v * v
        }
        sum[(r + 1) * stride + c + 1] = sum[r * stride + c + 1] + rs
        sq[(r + 1) * stride + c + 1] = sq[r * stride + c + 1] + rq
      }
    }
    const box = (a: Float64Array, r: number, c: number) =>
      a[(r + tpl.rows) * stride + c + tpl.cols] -
      a[r * stride + c + tpl.cols] -
      a[(r + tpl.rows) * stride + c] +
      a[r * stride + c]

    const scoreAt = (r: number, c: number) => {
      const S = box(sum, r, c)
      const spread = box(sq, r, c) - (S * S) / n
      if (spread <= 1e-6) return -1
      let dot = 0
      let k = 0
      for (let tr = 0; tr < tpl.rows; tr++) {
        let i = ((r + tr) * cols + c) * BINS
        for (let j = 0; j < tpl.cols * BINS; j++) dot += tpl.t[k++] * data[i++]
      }
      return dot / (tpl.norm * Math.sqrt(spread))
    }

    // coarse to fine: every other cell first (a match is never narrower than that), then the cells around the best
    let lr = -1
    let lc = -1
    let ls = -Infinity
    for (let r = 0; r + tpl.rows <= rows; r += 2)
      for (let c = 0; c + tpl.cols <= cols; c += 2) {
        const v = scoreAt(r, c)
        if (v > ls) [ls, lr, lc] = [v, r, c]
      }
    if (lr < 0) continue
    for (let r = Math.max(0, lr - 1); r <= Math.min(rows - tpl.rows, lr + 1); r++)
      for (let c = Math.max(0, lc - 1); c <= Math.min(cols - tpl.cols, lc + 1); c++) {
        const v = scoreAt(r, c)
        if (v > ls) [ls, lr, lc] = [v, r, c]
      }
    if (!best || ls > best.score)
      best = { score: ls, x: (lc * CELL) / s, y: (lr * CELL) / s, w: (tpl.cols * CELL) / s, h: (tpl.rows * CELL) / s }
  }
  return best
}
