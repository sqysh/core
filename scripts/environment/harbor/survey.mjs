// What the harbor generator has to build with: every catalog model's size in the world, its cost, and (for land) the
// shape of its top surface: how much of it is flat enough to stand things on and at what heights.
//   node scripts/environment/harbor/survey.mjs            the table
//   node scripts/environment/harbor/survey.mjs cliff-arch  plus a height map of that model (world units, north up)

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { baseScale, groundAt, landPiece, loadModel, lodFileOf, MODELS, ROOT, worldSize } from './assets.mjs'

const detail = process.argv.slice(2)
const detail0 = process.argv.slice(2)
const isLand = (d) => d.kind === "land" || d.kind === "islet" || d.kind === "path" || detail0.includes(d.id)
const seen = new Map()

console.log('id                         kind       w × h × d (world)      tris      LOD  flat%  flat heights (share of flat area)')
for (const def of MODELS) {
  const model = await loadModel(def.id, isLand(def) ? 'full' : existsSync(join(ROOT, 'public', lodFileOf(def, 'medium'))) ? 'medium' : 'full')
  const s = worldSize(model)
  const hasLod = existsSync(join(ROOT, 'public', lodFileOf(def, 'medium')))
  let flat = ''
  if (isLand(def)) {
    const piece = landPiece({ position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, model)
    const N = 48
    const bands = new Map()
    let land = 0
    let level = 0
    const grid = []
    for (let j = 0; j < N; j++) {
      const row = []
      for (let i = 0; i < N; i++) {
        const x = (i + 0.5) / N * s.x - s.x / 2
        const z = (j + 0.5) / N * s.z - s.z / 2
        const g = groundAt([piece], x, z)
        row.push(g)
        if (!g) continue
        land++
        if (g.slope < 18 && g.y > 0.25) {
          level++
          const band = Math.round(g.y * 2) / 2
          bands.set(band, (bands.get(band) ?? 0) + 1)
        }
      }
      grid.push(row)
    }
    const top = [...bands].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([h, n]) => `${h.toFixed(1)}:${Math.round(n / level * 100)}%`)
    flat = `${String(Math.round(level / Math.max(1, land) * 100)).padStart(4)}%  ${top.join(' ')}  (covers ${Math.round(land / (N * N) * 100)}% of its box)`
    if (detail.includes(def.id)) seen.set(def.id, { grid, s })
  }
  console.log(
    `${def.id.padEnd(26)} ${def.kind.padEnd(10)} ${s.x.toFixed(1).padStart(5)} × ${s.y.toFixed(1).padStart(4)} × ${s.z.toFixed(1).padStart(4)}   ${String(Math.round(model.triangles)).padStart(9)}  ${hasLod ? ' yes' : '  no'} ${flat}`
  )
}

// a height map: each cell the height of the top surface, to one decimal over two characters; steep ground in brackets
for (const [id, { grid, s }] of seen) {
  console.log(`\n${id}: ${s.x.toFixed(1)} wide (x, left to right) × ${s.z.toFixed(1)} deep (z, top to bottom), heights in world units; * = steeper than 30°`)
  for (let j = 0; j < grid.length; j += 2) {
    let line = ''
    for (let i = 0; i < grid.length; i += 1) {
      const g = grid[j][i]
      line += !g ? ' . ' : `${g.y < 9.95 ? g.y.toFixed(0).padStart(2) : Math.round(g.y).toString().padStart(2)}${g.slope > 30 ? '*' : ' '}`
    }
    console.log(line)
  }
}
