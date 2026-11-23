// Checks the World Builder's asset library against what is on disk. Read-only: it changes no model, derivative or scene.
//
//   node scripts/environment/validate-assets.mjs            the report; exits 1 if anything is an error
//   node scripts/environment/validate-assets.mjs --table    also each model's size in the world
//
// For every catalog model: the original exists and is a GLB the builder can draw (one mesh, UVs, textures); its size in the
// world is sensible; its Medium and Low LODs exist, are newer than the original, carry the original's bounds (so a LOD
// swap can't shift or resize it), have no textures of their own (they borrow the full model's material) and keep UVs.
// Also: originals on disk that no catalog entry draws, "mislabelled" copies that have since become real assets, and
// scene files that name models the catalog doesn't have (reported only, never edited).

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import { fileOf, lodFileOf, MISLABELLED, MODELS } from '../../app/dev/harbor-builder/_lib/catalog.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PUBLIC = join(ROOT, 'public')
const ORIGINALS = join(PUBLIC, 'models/environment')
const TABLE = process.argv.includes('--table')

await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })

const errors = []
const warnings = []
const err = (m) => errors.push(m)
const warn = (m) => warnings.push(m)

/** What a GLB holds, as the builder reads it: the box of its mesh in world space, triangles, textures and attributes */
async function inspect(path) {
  const bytes = readFileSync(path)
  const doc = await io.readBinary(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.length))
  const root = doc.getRoot()
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  let triangles = 0
  let meshNodes = 0
  const attributes = new Set()
  for (const node of root.listNodes()) {
    const mesh = node.getMesh()
    if (!mesh) continue
    meshNodes++
    const m = node.getWorldMatrix()
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')
      for (const s of prim.listSemantics()) attributes.add(s)
      const index = prim.getIndices()
      triangles += (index ? index.getCount() : pos.getCount()) / 3
      const v = [0, 0, 0]
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v)
        const x = m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12]
        const y = m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13]
        const z = m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]
        if (x < min[0]) min[0] = x
        if (y < min[1]) min[1] = y
        if (z < min[2]) min[2] = z
        if (x > max[0]) max[0] = x
        if (y > max[1]) max[1] = y
        if (z > max[2]) max[2] = z
      }
    }
  }
  // the bounds a derivative carries from its original (loadModel sizes and places a model by these)
  const extras = [root.listScenes()[0]?.getExtras(), ...root.listNodes().map((n) => n.getExtras()), ...root.listMeshes().map((m) => m.getExtras())]
  const source = extras.map((e) => e?.sourceBounds).find(Boolean)
  return {
    bytes: bytes.length,
    triangles,
    meshNodes,
    materials: root.listMaterials().length,
    textures: root.listTextures().length,
    attributes,
    box: { min, max },
    source
  }
}

const sizeOf = (b) => [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]]
const fmt = (v) => v.map((n) => n.toFixed(3)).join(' × ')

// ── the originals on disk and what the catalog does with each ─────────────────────────────────────────────────────────
const onDisk = []
const walk = (d) => {
  for (const n of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, n.name)
    if (n.isDirectory()) walk(p)
    else if (/\.glb$/i.test(n.name)) onDisk.push('/' + relative(PUBLIC, p))
  }
}
walk(ORIGINALS)

const byFile = new Map()
for (const d of MODELS) {
  if (!byFile.has(d.file)) byFile.set(d.file, [])
  byFile.get(d.file).push(d)
}
const ids = new Set()
for (const d of MODELS) {
  if (ids.has(d.id)) err(`duplicate catalog id "${d.id}"`)
  ids.add(d.id)
}
const hash = (p) => createHash('sha1').update(readFileSync(p)).digest('hex')
const mislabelled = new Map(MISLABELLED.map((m) => [`/models/environment/${m.file}`, `/models/environment/${m.copyOf}`]))

for (const url of onDisk) {
  if (byFile.has(url)) continue
  const copyOf = mislabelled.get(url)
  if (!copyOf) {
    err(`original not in the catalog: ${url} (${(statSync(join(PUBLIC, url)).size / 1048576).toFixed(1)} MB)`)
  } else if (!existsSync(join(PUBLIC, copyOf)) || hash(join(PUBLIC, url)) !== hash(join(PUBLIC, copyOf))) {
    err(`${url} is listed as a mislabelled copy of ${copyOf} but is no longer identical to it: it's a real asset now`)
  }
}
for (const url of mislabelled.keys()) if (!onDisk.includes(url)) warn(`mislabelled entry no longer on disk: ${url}`)

// ── each catalog file ────────────────────────────────────────────────────────────────────────────────────────────────
const table = []
let checked = 0
for (const [url, defs] of byFile) {
  const label = defs.map((d) => d.id).join(' / ')
  const path = join(PUBLIC, url)
  if (!existsSync(path)) {
    err(`${label}: original missing on disk: ${url}`)
    continue
  }
  const orig = await inspect(path)
  checked++
  if (orig.meshNodes !== 1) warn(`${label}: ${orig.meshNodes} meshes; the builder draws the first only`)
  if (!orig.attributes.has('TEXCOORD_0')) err(`${label}: no UVs`)
  if (!orig.textures) warn(`${label}: no textures`)
  const size = sizeOf(orig.box)

  for (const d of defs) {
    const measured = d.by === 'height' ? size[1] : Math.max(size[0], size[2])
    const scale = d.size / measured
    const world = size.map((n) => n * scale)
    table.push(`${d.kind.padEnd(9)} ${d.id.padEnd(26)} ${d.size}${d.by === 'height' ? 'h' : 'w'}  →  ${fmt(world)}  ×${scale.toFixed(3)}  ${(orig.triangles / 1e6).toFixed(2)}M tris`)
    if (!(measured > 0)) err(`${d.id}: zero-size model`)
    for (const [axis, n] of [['x', world[0]], ['y', world[1]], ['z', world[2]]])
      if (n > 40) warn(`${d.id}: ${n.toFixed(1)} units along ${axis} at its default size: larger than the harbor's biggest pieces`)
    if (d.size <= 0) err(`${d.id}: size must be positive`)
    // a model whose box is mostly one thin dimension is sized by its width: check the other dimension isn't absurd
    if (world[1] < 0.15 && d.kind !== 'path' && d.kind !== 'islet') warn(`${d.id}: only ${world[1].toFixed(2)} units tall at its default size`)
  }
  // a base off the box's middle (leaning trees): pivot is the box's base middle for every model, fixed so objects stay put
  if (defs.some((d) => d.cleaned)) {
    const cleaned = join(PUBLIC, fileOf(defs.find((d) => d.cleaned), 'cleaned'))
    if (!existsSync(cleaned)) err(`${label}: marked cleaned but its derivative is missing: ${relative(ROOT, cleaned)}`)
  }

  // the LODs
  const lodSource = defs.some((d) => d.cleaned) ? join(PUBLIC, fileOf(defs.find((d) => d.cleaned), 'cleaned')) : path
  const sourceMtime = Math.max(statSync(path).mtimeMs, existsSync(lodSource) ? statSync(lodSource).mtimeMs : 0)
  // what the LODs are made from: the water-removed derivative where there is one (its geometry is smaller than the
  // original's box by the water it lost; it keeps the original's bounds, which is what sizes and places it)
  const from = lodSource === path ? orig : await inspect(lodSource)
  const lods = {}
  for (const level of ['medium', 'low']) {
    const lp = join(PUBLIC, lodFileOf(defs[0], level))
    if (!existsSync(lp)) {
      err(`${label}: no ${level} LOD (${relative(ROOT, lp)}): run scripts/environment/lod-generator.mjs`)
      continue
    }
    const lod = await inspect(lp)
    lods[level] = lod
    if (statSync(lp).mtimeMs < sourceMtime) err(`${label}: ${level} LOD is older than its original: regenerate it`)
    if (!lod.attributes.has('TEXCOORD_0')) err(`${label}: ${level} LOD lost its UVs (it would draw flat)`)
    if (lod.textures) warn(`${label}: ${level} LOD carries ${lod.textures} texture(s); LODs borrow the full model's material`)
    if (!lod.source) err(`${label}: ${level} LOD has no source bounds (it would be sized by its own box and jump on a swap)`)
    else {
      const extent = Math.max(...size)
      const flat = [...lod.source.min, ...lod.source.max]
      const want = [...orig.box.min, ...orig.box.max]
      const off = Math.max(...flat.map((v, i) => Math.abs(v - want[i])))
      if (off > extent * 1e-3) err(`${label}: ${level} LOD's source bounds differ from its original's by ${off.toFixed(4)}: the original changed since it was made; regenerate it`)
    }
    // its own geometry stays inside its original's box (simplifying may pull a thin tip in, never push anything out)
    const ls = sizeOf(lod.box)
    const fs = sizeOf(from.box)
    const extent = Math.max(...size)
    const spill = Math.max(...lod.box.min.map((v, i) => from.box.min[i] - v), ...lod.box.max.map((v, i) => v - from.box.max[i]))
    const shrink = Math.max(...fs.map((v, i) => v - ls[i]))
    if (spill > extent * 0.01) err(`${label}: ${level} LOD pokes ${spill.toFixed(4)} outside the model it was made from`)
    if (shrink > extent * 0.04) warn(`${label}: ${level} LOD is ${shrink.toFixed(3)} smaller than the model it was made from along its worst axis (${((shrink / extent) * 100).toFixed(1)}% of its size)`)
  }
  if (lods.medium && lods.low && !(lods.low.triangles < lods.medium.triangles && lods.medium.triangles < orig.triangles))
    err(`${label}: LOD triangle counts don't fall: ${Math.round(orig.triangles)} → ${Math.round(lods.medium.triangles)} → ${Math.round(lods.low.triangles)}`)
  const draft = join(PUBLIC, fileOf(defs[0], 'draft'))
  if (!existsSync(draft)) warn(`${label}: no draft-quality file (the editor's "Draft quality" source would fail to load it)`)
}

// ── scenes (read only) ───────────────────────────────────────────────────────────────────────────────────────────────
const scenes = []
for (const dir of ['assets/environment/harbor', 'assets/environment/scenes']) {
  const d = join(ROOT, dir)
  if (existsSync(d)) for (const f of readdirSync(d)) if (f.endsWith('.json')) scenes.push(join(dir, f))
}
const sceneReport = []
for (const f of scenes) {
  let s
  try {
    s = JSON.parse(readFileSync(join(ROOT, f), 'utf8'))
  } catch (e) {
    err(`${f}: not valid JSON (${e.message})`)
    continue
  }
  const unknown = new Map()
  for (const o of s.objects ?? []) if (!ids.has(o.model)) unknown.set(o.model, (unknown.get(o.model) ?? 0) + 1)
  sceneReport.push(`${f.padEnd(70)} ${String(s.objects?.length ?? 0).padStart(4)} objects  ${unknown.size ? `${[...unknown.values()].reduce((a, b) => a + b, 0)} objects name ${unknown.size} unknown models` : 'all models known'}`)
  if (unknown.size && !f.includes('archive')) warn(`${f}: unknown model ids (not edited): ${[...unknown.keys()].join(', ')}`)
}

if (TABLE) console.log(table.join('\n') + '\n')
console.log(`catalog: ${MODELS.length} entries, ${byFile.size} files; originals on disk: ${onDisk.length}; checked ${checked}`)
console.log('scenes (read only):\n  ' + sceneReport.join('\n  '))
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`)
for (const e of errors) console.log(`  ERROR   ${e}`)
for (const w of warnings) console.log(`  warning ${w}`)
process.exit(errors.length ? 1 : 0)
