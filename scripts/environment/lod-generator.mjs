// Generates Medium and Low LOD geometry for every model in the harbor's catalog.
// A model with a water-removed derivative (environment-derived/cleaned) is reduced from that, so its LODs match
// what the editor draws at full detail.
// Textures are stripped so the High model's material can be shared at runtime.
// UVs and vertex layout are preserved; meshopt-compressed output.
// Run: node scripts/environment/lod-generator.mjs

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dequantize, meshopt, prune, simplify, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = join(root, 'public/models/environment')
const CLEANED = join(root, 'public/models/environment-derived/cleaned')
const OUT = join(root, 'public/models/environment-derived/lod')
const only = process.argv.slice(2)

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
})

await MeshoptEncoder.ready
await MeshoptSimplifier.ready

// Per-asset triangle budgets — hero structures keep more detail, organic shapes simplify well
const LOD_TARGETS = [
  // Terrain (land) — large composition-defining landforms
  { file: 'terrain/03-cliff-plateau.glb', medium: 80_000, low: 15_000 },
  { file: 'terrain/07-cliff-concave.glb', medium: 80_000, low: 15_000 },
  { file: 'terrain/12-mountain-rounded.glb', medium: 100_000, low: 20_000 },
  { file: 'terrain/13-ridge-long.glb', medium: 50_000, low: 10_000 },
  { file: 'terrain/15-shore-rock-islet.glb', medium: 60_000, low: 12_000 },
  { file: 'terrain/18-rock-steps.glb', medium: 80_000, low: 15_000 },
  { file: 'terrain/19-cliff-arch.glb', medium: 80_000, low: 15_000 },
  { file: 'terrain/grassy-cliff-overhang-01.glb', medium: 80_000, low: 15_000 },
  { file: 'terrain/jetti-connector-cliff-01.glb', medium: 80_000, low: 15_000 },
  { file: 'terrain/sandy-jetti-connector-01.glb', medium: 80_000, low: 15_000 },

  // Islets and rocks
  { file: 'islands/granite-rock-islet-bare-01.glb', medium: 30_000, low: 6_000 },
  { file: 'islands/mixed-trees-islet-01.glb', medium: 60_000, low: 12_000 },
  { file: 'islands/wooded-granite-islet-01.glb', medium: 60_000, low: 12_000 },
  { file: 'islands/pine-flower-islet-01.glb', medium: 50_000, low: 10_000 },
  { file: 'islands/low-shrub-islet-01.glb', medium: 50_000, low: 10_000 },
  { file: 'islands/wooded-coastal-islet-01.glb', medium: 70_000, low: 14_000 },
  { file: 'islands/sandy-jetti.glb', medium: 30_000, low: 6_000 },

  // Structures
  { file: 'structures/lighthouse-tall-01.glb', medium: 80_000, low: 15_000 },
  { file: 'structures/keepers-cottage-red-roof-01.glb', medium: 80_000, low: 15_000 },
  { file: 'structures/small-stone-cabin-blue-roof.glb', medium: 100_000, low: 20_000 },
  { file: 'structures/small-stone-house-blue-roof.glb', medium: 80_000, low: 15_000 },
  { file: 'structures/stone-bridge.glb', medium: 80_000, low: 15_000 },
  { file: 'structures/wood-fence-straight-01.glb', medium: 30_000, low: 6_000 },
  { file: 'structures/wood-fence-stone-corner-01.glb', medium: 40_000, low: 8_000 },
  { file: 'structures/stone-retaining-wall-01.glb', medium: 30_000, low: 6_000 },

  // Paths
  { file: 'paths/stone-stairs-wide-01.glb', medium: 50_000, low: 10_000 },
  { file: 'paths/s-path-left.glb', medium: 60_000, low: 12_000 },
  { file: 'paths/long-path-straight-01.glb', medium: 40_000, low: 8_000 },
  { file: 'paths/curved-path-left.glb', medium: 40_000, low: 8_000 },
  { file: 'paths/curved-path-right.glb', medium: 40_000, low: 8_000 },

  // Trees — organic shapes simplify well
  { file: 'trees/pine-tall-bright-01.glb', medium: 50_000, low: 10_000 },
  { file: 'trees/pine-medium-rounded-01.glb', medium: 40_000, low: 8_000 },
  { file: 'trees/pine-sapling-01.glb', medium: 35_000, low: 7_000 },
  { file: 'trees/ornamental-compact-01.glb', medium: 80_000, low: 15_000 },
  { file: 'trees/oak-leaning-01.glb', medium: 80_000, low: 15_000 },
  { file: 'trees/oak-twin-trunk-01.glb', medium: 80_000, low: 15_000 },
  { file: 'trees/pine-narrow-spire-01.glb', medium: 40_000, low: 8_000 },
  { file: 'trees/pine-windswept-01.glb', medium: 50_000, low: 10_000 },

  // Plants — distant from camera, very organic
  { file: 'plants/purple-coastal-flowers-01.glb', medium: 50_000, low: 10_000 },
  { file: 'plants/beach-grass-plumes-01.glb', medium: 30_000, low: 6_000 },
  { file: 'plants/beach-grass-green-01.glb', medium: 30_000, low: 6_000 },
  { file: 'plants/hanging-moss-rock-edge-01.glb', medium: 30_000, low: 6_000 },
]

const LEVELS = [
  { name: 'medium', error: 0.005 },
  { name: 'low', error: 0.02 },
]

function countTris(doc) {
  return doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0)
}

function getBounds(doc) {
  const prim = doc.getRoot().listMeshes()[0]?.listPrimitives()[0]
  if (!prim) return null
  const pos = prim.getAttribute('POSITION')
  if (!pos) return null
  const arr = pos.getArray()
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < arr.length; i += 3) {
    for (let j = 0; j < 3; j++) {
      if (arr[i + j] < min[j]) min[j] = arr[i + j]
      if (arr[i + j] > max[j]) max[j] = arr[i + j]
    }
  }
  return { min, max }
}

console.log(`LOD generator — ${LOD_TARGETS.length} models × ${LEVELS.length} levels\n`)

for (const target of LOD_TARGETS) {
  if (only.length && !only.some((o) => target.file.includes(o))) continue
  const cleaned = existsSync(join(CLEANED, target.file))
  const srcPath = join(cleaned ? CLEANED : SRC, target.file)
  if (!existsSync(srcPath)) {
    console.log(`  ${target.file.padEnd(48)} not on disk: skipped`)
    continue
  }
  const srcBytes = readFileSync(srcPath)

  for (const level of LEVELS) {
    const triTarget = target[level.name]
    const doc = await io.readBinary(new Uint8Array(srcBytes.buffer, srcBytes.byteOffset, srcBytes.length))
    const srcTris = countTris(doc)
    const ratio = Math.min(1, triTarget / srcTris)

    // Embed original bounds so loadModel sizes LOD meshes identically to the original (a cleaned derivative already
    // carries its original's bounds on its node, and they pass through)
    if (!cleaned) {
      const bounds = getBounds(doc)
      if (bounds) {
        const scene = doc.getRoot().listScenes()[0]
        if (scene) scene.setExtras({ ...scene.getExtras(), sourceBounds: bounds })
      }
    }

    await doc.transform(
      dequantize(),
      weld({ tolerance: 0.0001 }),
      simplify({ simplifier: MeshoptSimplifier, ratio, error: level.error }),
      prune({ keepAttributes: true }),
    )

    // Strip textures AFTER prune so TEXCOORD_0 survives (the High model's material provides textures at runtime)
    for (const tex of doc.getRoot().listTextures()) {
      tex.dispose()
    }
    await doc.transform(
      meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    )

    const outTris = countTris(doc)
    const outPath = join(OUT, level.name, target.file)
    mkdirSync(dirname(outPath), { recursive: true })
    const glb = await io.writeBinary(doc)
    writeFileSync(outPath, glb)

    console.log(
      `  ${target.file.padEnd(48)} ${level.name.padEnd(8)} ${srcTris.toLocaleString().padStart(10)} → ${outTris.toLocaleString().padStart(8)} tris  ${(glb.length / 1024).toFixed(0).padStart(5)} KB`
    )
  }
}

console.log('\nDone. LOD files in public/models/environment-derived/lod/{medium,low}/')
