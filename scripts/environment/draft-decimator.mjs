// Generates draft-quality GLBs from the Meshy exports for the harbor builder editor.
// Each model's triangles are reduced to at most DRAFT_MAX_TRIS (originals are never touched).
// Embedded textures are downsampled to DRAFT_MAX_TEX on each axis (keeps colour space and alpha).
// Run: node scripts/environment/draft-decimator.mjs                 every model (replaces existing drafts)
//      node scripts/environment/draft-decimator.mjs --missing       only the models that have no draft yet
//      node scripts/environment/draft-decimator.mjs stone-bridge    only models whose path contains the text (any number)
// Then enable "Draft quality" in the editor to load 3–6× smaller geometry at 60+ fps.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { meshopt, prune, simplify, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = join(root, 'public/models/environment')
const OUT = join(root, 'public/models/environment-derived/draft')

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
})

// Max triangles per model in draft mode; models already below this get compression only
const DRAFT_MAX_TRIS = 20_000
// Max texture dimension: each axis capped at this many pixels (1024×1024 = 4 MB RGBA8 GPU cost per texture)
const DRAFT_MAX_TEX = 1024

await MeshoptEncoder.ready
await MeshoptSimplifier.ready

function findGlbs(dir) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) results.push(...findGlbs(path))
    else if (entry.name.endsWith('.glb')) results.push(path)
  }
  return results
}

function countTris(doc) {
  return doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0)
}

/** Resize all embedded textures to at most DRAFT_MAX_TEX × DRAFT_MAX_TEX, preserving MIME type. */
async function downsizeTextures(doc) {
  const textures = doc.getRoot().listTextures()
  let totalSaved = 0
  for (const tex of textures) {
    const data = tex.getImage()
    if (!data) continue
    const mime = tex.getMimeType()
    // Detect dimensions without full decode when possible; fall back to sharp metadata
    const meta = await sharp(Buffer.from(data)).metadata()
    const { width = 0, height = 0 } = meta
    if (width <= DRAFT_MAX_TEX && height <= DRAFT_MAX_TEX) continue

    const newW = Math.min(width, DRAFT_MAX_TEX)
    const newH = Math.min(height, DRAFT_MAX_TEX)
    let resized
    if (mime === 'image/jpeg' || mime === 'image/jpg') {
      resized = await sharp(Buffer.from(data)).resize(newW, newH, { kernel: 'lanczos3' }).jpeg({ quality: 85 }).toBuffer()
    } else {
      // PNG, WebP, or unknown — keep PNG so alpha is preserved
      resized = await sharp(Buffer.from(data)).resize(newW, newH, { kernel: 'lanczos3' }).png().toBuffer()
      tex.setMimeType('image/png')
    }
    totalSaved += data.byteLength - resized.byteLength
    tex.setImage(new Uint8Array(resized))
  }
  return totalSaved
}

const args = process.argv.slice(2)
const onlyMissing = args.includes('--missing')
const filters = args.filter((a) => !a.startsWith('--'))
const glbs = findGlbs(SRC).filter(
  (p) =>
    (!filters.length || filters.some((f) => p.includes(f))) &&
    (!onlyMissing || !existsSync(join(OUT, relative(SRC, p)))),
)
console.log(`Found ${glbs.length} GLBs to do in ${relative(root, SRC)}\n`)

let totalSrcBytes = 0
let totalOutBytes = 0
let totalSrcTris = 0
let totalOutTris = 0
let totalTexSaved = 0

for (const srcPath of glbs) {
  const rel = relative(SRC, srcPath)
  const outPath = join(OUT, rel)
  mkdirSync(dirname(outPath), { recursive: true })

  const srcBytes = readFileSync(srcPath)
  const doc = await io.readBinary(new Uint8Array(srcBytes.buffer, srcBytes.byteOffset, srcBytes.length))

  const srcTris = countTris(doc)
  const ratio = srcTris > DRAFT_MAX_TRIS ? DRAFT_MAX_TRIS / srcTris : 1

  // Downsize textures first so the meshopt pass compresses smaller data
  const texSaved = await downsizeTextures(doc)
  totalTexSaved += texSaved

  await doc.transform(
    weld({ tolerance: 0.0001 }),
    simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.005 }),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  )

  const glb = await io.writeBinary(doc)
  writeFileSync(outPath, glb)

  const outTris = countTris(doc)
  totalSrcBytes += srcBytes.length
  totalOutBytes += glb.length
  totalSrcTris += srcTris
  totalOutTris += outTris

  const srcMB = (srcBytes.length / 1_048_576).toFixed(2)
  const outMB = (glb.length / 1_048_576).toFixed(2)
  const pct = ratio < 1 ? `${Math.round(ratio * 100)}%` : 'kept'
  const texNote = texSaved > 0 ? `  tex-${(texSaved / 1024).toFixed(0)}KB` : ''
  console.log(
    `  ${rel.padEnd(52)} ${srcTris.toLocaleString().padStart(9)} → ${outTris.toLocaleString().padStart(7)} tris  ${pct.padStart(4)}  ${srcMB} → ${outMB} MB${texNote}`,
  )
}

console.log(
  `\nTotal: ${(totalSrcTris / 1e6).toFixed(2)}M → ${(totalOutTris / 1e6).toFixed(2)}M tris` +
    `  |  ${(totalSrcBytes / 1e6).toFixed(0)} MB → ${(totalOutBytes / 1e6).toFixed(0)} MB` +
    `  |  textures saved ${(totalTexSaved / 1e6).toFixed(0)} MB` +
    `  |  draft in public/models/environment-derived/draft/`,
)
