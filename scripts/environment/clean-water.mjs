// Removes the static water and foam Meshy bakes into its land models, so they can stand in CORE's animated sea:
//   node scripts/environment/clean-water.mjs                 every land model (islands/, terrain/)
//   node scripts/environment/clean-water.mjs terrain/x.glb   just these
//
// Meshy sets each island or cliff on a little plate of painted water: one mesh, one texture atlas, the water fused into
// both. It can't be separated by material or object, but it can by where and what it is: the plate is the model's
// lowest slice, and its triangles are painted water (turquoise to deep blue) or foam (near white). So a triangle goes
// if it's in the lowest BAND of the model's height and its texels are water or foam, or it faces down there (the
// plate's underside). Isolated triangles left inside removed water go too. Everything above the band is kept whatever
// its colour (white flowers, pale granite), and so is everything in the band that isn't water: rock, sand, grass.
//
// The originals are only read. Each cleaned model is written to public/models/environment-derived/cleaned/<folder>/,
// with its textures byte for byte as they were and its geometry meshopt-compressed (EXT_meshopt_compression, 14-bit
// positions: well under a millimetre at world size), with a report of what was removed. The original's bounds are
// stored on the derivative's node (extras.sourceBounds), so it can be sized and set exactly as the original.

import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { meshopt, prune } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import sharp from 'sharp'
import { positionIds } from './bake.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SOURCE = join(root, 'public/models/environment')
const OUT = join(root, 'public/models/environment-derived/cleaned')
const FOLDERS = ['islands', 'terrain']

/** The slice of the model, from its lowest point up, that can be water (share of its height) */
const BAND = 0.12

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder
})

/** What a texel is: painted water (turquoise through deep blue), foam (near white), or anything else */
function classify(r, g, b) {
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const d = mx - mn
  let h = 0
  if (d > 1e-6) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60
  const s = mx ? d / mx : 0
  if (h >= 150 && h <= 235 && s > 0.14 && mx > 0.2) return 'water'
  if (s < 0.16 && mx > 0.8) return 'foam'
  return 'land'
}

async function clean(rel) {
  const src = join(SOURCE, rel)
  const bytes = readFileSync(src)
  const hash = createHash('sha256').update(bytes).digest('hex')
  const doc = await io.readBinary(new Uint8Array(bytes))
  const meshes = doc.getRoot().listMeshes()
  if (meshes.length !== 1 || meshes[0].listPrimitives().length !== 1) throw new Error(`${rel}: expected one mesh with one primitive`)
  const prim = meshes[0].listPrimitives()[0]
  const pos = prim.getAttribute('POSITION').getArray()
  const uv = prim.getAttribute('TEXCOORD_0').getArray()
  const idx = prim.getIndices().getArray()
  const { data, info } = await sharp(prim.getMaterial().getBaseColorTexture().getImage()).raw().toBuffer({ resolveWithObject: true })
  const W = info.width
  const H = info.height
  const C = info.channels
  const texel = (u, v) => {
    const o = (Math.min(H - 1, Math.max(0, Math.floor(v * H))) * W + Math.min(W - 1, Math.max(0, Math.floor(u * W)))) * C
    return classify(data[o] / 255, data[o + 1] / 255, data[o + 2] / 255)
  }

  const lo = [Infinity, Infinity, Infinity]
  const hi = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < pos.length; i += 3)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], pos[i + k])
      hi[k] = Math.max(hi[k], pos[i + k])
    }
  const minY = lo[1]
  const maxY = hi[1]
  const top = minY + (maxY - minY) * BAND
  const tris = idx.length / 3
  const remove = new Uint8Array(tris)
  const inBand = new Uint8Array(tris)
  const counts = { water: 0, foam: 0, underside: 0, specks: 0 }

  for (let t = 0; t < tris; t++) {
    const a = idx[t * 3]
    const b = idx[t * 3 + 1]
    const c = idx[t * 3 + 2]
    const ymax = Math.max(pos[a * 3 + 1], pos[b * 3 + 1], pos[c * 3 + 1])
    if (ymax > top) continue
    inBand[t] = 1
    // the plate's underside: faces looking down
    const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2]
    const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2]
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    const nl = Math.hypot(nx, ny, nz) || 1
    if (ny / nl < -0.5) {
      remove[t] = 1
      counts.underside++
      continue
    }
    // its texels: three corners and the middle, by majority
    const votes = { water: 0, foam: 0, land: 0 }
    votes[texel(uv[a * 2], uv[a * 2 + 1])]++
    votes[texel(uv[b * 2], uv[b * 2 + 1])]++
    votes[texel(uv[c * 2], uv[c * 2 + 1])]++
    votes[texel((uv[a * 2] + uv[b * 2] + uv[c * 2]) / 3, (uv[a * 2 + 1] + uv[b * 2 + 1] + uv[c * 2 + 1]) / 3)] += 2
    const kind = votes.water >= votes.land && votes.water >= votes.foam ? 'water' : votes.foam > votes.land ? 'foam' : 'land'
    if (kind !== 'land') {
      remove[t] = 1
      counts[kind]++
    }
  }

  // specks: a triangle in the band whose every neighbour went is a fleck of painted ripple, not land
  const { ids } = positionIds(pos)
  const edgeKey = (p, q) => (p < q ? p * 67108864 + q : q * 67108864 + p)
  const byEdge = new Map()
  for (let t = 0; t < tris; t++) {
    if (!inBand[t]) continue
    for (let e = 0; e < 3; e++) {
      const k = edgeKey(ids[idx[t * 3 + e]], ids[idx[t * 3 + ((e + 1) % 3)]])
      const list = byEdge.get(k)
      if (list) list.push(t)
      else byEdge.set(k, [t])
    }
  }
  for (let pass = 0; pass < 2; pass++)
    for (let t = 0; t < tris; t++) {
      if (!inBand[t] || remove[t]) continue
      let neighbours = 0
      let gone = 0
      for (let e = 0; e < 3; e++) {
        for (const o of byEdge.get(edgeKey(ids[idx[t * 3 + e]], ids[idx[t * 3 + ((e + 1) % 3)]])) ?? []) {
          if (o === t) continue
          neighbours++
          if (remove[o]) gone++
        }
      }
      if (neighbours && gone === neighbours) {
        remove[t] = 1
        counts.specks++
      }
    }

  // the original's bounds travel with the derivative (node extras → three's userData), so it's sized and set in the
  // world exactly as the original is, though its water plate (often its widest part) has gone
  const node = doc.getRoot().listNodes().find((n) => n.getMesh())
  node.setExtras({ ...node.getExtras(), sourceBounds: { min: lo, max: hi }, cleanedFrom: `models/environment/${rel}` })

  const kept = []
  for (let t = 0; t < tris; t++) if (!remove[t]) kept.push(idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2])
  const buffer = doc.getRoot().listBuffers()[0]
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(kept)).setBuffer(buffer))
  // drop the vertices nothing uses any more, then compress the geometry (the textures go through untouched)
  await doc.transform(prune({ keepAttributes: true }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
  const glb = await io.writeBinary(doc)
  const out = join(OUT, rel)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, glb)
  const removed = tris - kept.length / 3
  return {
    file: rel,
    source: { bytes: bytes.length, sha256: hash, triangles: tris },
    cleaned: { bytes: glb.length, triangles: kept.length / 3 },
    removed: { triangles: removed, share: Number((removed / tris).toFixed(4)), ...counts },
    band: { share: BAND, height: Number(top.toFixed(4)), min: Number(minY.toFixed(4)), max: Number(maxY.toFixed(4)) }
  }
}

const asked = process.argv.slice(2)
const files = asked.length ? asked : FOLDERS.flatMap((f) => readdirSync(join(SOURCE, f)).filter((n) => n.endsWith('.glb')).map((n) => `${f}/${n}`))
const report = []
for (const rel of files) {
  const t0 = performance.now()
  const r = await clean(rel)
  // the original must be exactly as it was
  if (createHash('sha256').update(readFileSync(join(SOURCE, rel))).digest('hex') !== r.source.sha256) throw new Error(`${rel} changed`)
  report.push(r)
  console.log(
    `${rel.padEnd(46)} ${r.source.triangles.toLocaleString().padStart(9)} → ${r.cleaned.triangles.toLocaleString().padStart(9)} tris  ` +
      `−${(r.removed.share * 100).toFixed(1)}% (water ${r.removed.water}, foam ${r.removed.foam}, underside ${r.removed.underside}, specks ${r.removed.specks})  ` +
      `${(r.source.bytes / 1048576).toFixed(1)} → ${(r.cleaned.bytes / 1048576).toFixed(1)} MB  (${((performance.now() - t0) / 1000).toFixed(1)} s)`
  )
}
mkdirSync(OUT, { recursive: true })
const reportPath = join(OUT, 'report.json')
let previous = []
try {
  previous = JSON.parse(readFileSync(reportPath, 'utf8'))
} catch {}
const merged = [...previous.filter((p) => !report.some((r) => r.file === p.file)), ...report].sort((a, b) => a.file.localeCompare(b.file))
writeFileSync(reportPath, JSON.stringify(merged, null, 2) + '\n')
