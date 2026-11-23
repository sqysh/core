// A quick picture of a generated harbor without opening the editor: the land's real surfaces (cast onto the models)
// drawn as shaded columns from the approved camera's direction, with every other object as a simple marker of its
// real size. For judging massing, coastline and placement while composing; the editor is the real render.

import sharp from 'sharp'
import { groundAt } from './assets.mjs'

const DEG = Math.PI / 180

const MARK = {
  tree: '#2f6b2a',
  plant: '#7a5cc0',
  structure: '#c8483a',
  prop: '#8a5a33',
  path: '#c9a58a'
}

/**
 * `plan` converts plan coordinates (a: screen right, d: toward the camera) to world (x, z). `items` are the placed
 * objects that aren't land: { kind, a, d, y, w, h, color?, label? } in world units.
 */
export async function drawPreview({ file, land, plan, items, extent = { a: 66, d: 62 }, cell = 0.5, ppu = 10, elevation = 35, labels = [] }) {
  const sin = Math.sin(elevation * DEG)
  const cos = Math.cos(elevation * DEG)
  const cols = Math.round((extent.a * 2) / cell)
  const rows = Math.round((extent.d * 2) / cell)
  const top = Math.ceil(30 * cos * ppu)
  const W = Math.round(extent.a * 2 * ppu)
  const H = Math.round(extent.d * 2 * sin * ppu) + top
  const px = new Uint8Array(W * H * 3)
  // open water, a little lighter toward the camera
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = (y * W + x) * 3
      const t = y / H
      px[k] = 38 + 14 * t
      px[k + 1] = 150 + 22 * t
      px[k + 2] = 172 + 10 * t
    }
  const rect = (x0, y0, x1, y1, r, g, b) => {
    x0 = Math.max(0, Math.round(x0))
    x1 = Math.min(W, Math.round(x1))
    y0 = Math.max(0, Math.round(y0))
    y1 = Math.min(H, Math.round(y1))
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const k = (y * W + x) * 3
        px[k] = r
        px[k + 1] = g
        px[k + 2] = b
      }
  }
  const sx = (a) => (a + extent.a) * ppu
  const sy = (d, h) => top + (d + extent.d) * sin * ppu - h * cos * ppu

  const heights = new Float32Array(cols * rows).fill(-1)
  const slopes = new Float32Array(cols * rows)
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const a = -extent.a + (i + 0.5) * cell
      const d = -extent.d + (j + 0.5) * cell
      const [x, z] = plan(a, d)
      const g = groundAt(land, x, z)
      if (!g || g.y < 0.05) continue
      heights[j * cols + i] = g.y
      slopes[j * cols + i] = g.slope
    }

  const byRow = new Map()
  for (const it of items) {
    const j = Math.floor((it.d + extent.d) / cell)
    if (!byRow.has(j)) byRow.set(j, [])
    byRow.get(j).push(it)
  }
  const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]

  for (let j = 0; j < rows; j++) {
    const d = -extent.d + (j + 0.5) * cell
    for (let i = 0; i < cols; i++) {
      const h = heights[j * cols + i]
      if (h < 0) continue
      const a = -extent.a + i * cell
      const slope = slopes[j * cols + i]
      // lit from the upper left: ground that rises toward the light is brighter
      const hl = i > 0 && j > 0 ? heights[(j - 1) * cols + i - 1] : h
      const shade = Math.max(0.72, Math.min(1.18, 1 + (h - Math.max(0, hl)) * 0.12))
      const rock = [118 * shade, 98 * shade, 112 * shade]
      const flat = slope < 24
      const topColor = !flat ? rock : h < 1.25 ? [214, 190, 140] : [122 * shade, 150 * shade, 62 * shade]
      rect(sx(a), sy(d, h), sx(a + cell), sy(d, 0) + 1, rock[0] * 0.8, rock[1] * 0.8, rock[2] * 0.8)
      rect(sx(a), sy(d - cell / 2, h), sx(a + cell), sy(d + cell / 2, h) + 1, ...topColor)
    }
    for (const it of byRow.get(j) ?? []) {
      const [r, g, b] = hex(it.color ?? MARK[it.kind] ?? '#ffffff')
      const x0 = sx(it.a - it.w / 2)
      const x1 = sx(it.a + it.w / 2)
      const yb = sy(it.d, it.y)
      const yt = sy(it.d, it.y + it.h)
      if (it.kind === 'tree') {
        // a cone, drawn as narrowing bars
        const n = 8
        for (let k = 0; k < n; k++) {
          const t0 = k / n
          const w = (x1 - x0) * (1 - t0 * 0.85)
          const cx = (x0 + x1) / 2
          rect(cx - w / 2, yb + (yt - yb) * ((k + 1) / n), cx + w / 2, yb + (yt - yb) * (k / n), r * (0.8 + 0.3 * t0), g * (0.8 + 0.3 * t0), b)
        }
      } else if (it.kind === 'structure') {
        rect(x0, yb + (yt - yb) * 0.55, x1, yb, 226, 216, 200)
        rect(x0 - 2, yt, x1 + 2, yb + (yt - yb) * 0.55, r, g, b)
      } else rect(x0, yt, x1, yb, r, g, b)
    }
  }

  const text = labels
    .map(({ a, d, h = 0, text }) => `<text x="${sx(a).toFixed(0)}" y="${sy(d, h).toFixed(0)}" font-family="Menlo, monospace" font-size="13" fill="#fff" stroke="#0b1622" stroke-width="3" paint-order="stroke" text-anchor="middle">${text}</text>`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${text}</svg>`
  await sharp(Buffer.from(px), { raw: { width: W, height: H, channels: 3 } })
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toFile(file)
  return { heights, cols, rows, cell, extent }
}
