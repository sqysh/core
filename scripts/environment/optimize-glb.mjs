// Optimises master environment models (Meshy GLBs) into the levels of detail the CORE world ships:
//   npm run env:optimize                                   every asset below
//   npm run env:optimize eastern-white-pine coastal-oak    just these
//
// Every level is built from the master, never from another level:
//
//  1. the master is welded and simplified freely to the level's triangle budget (the masters are closed, manifold
//     surfaces, so simplification can't open holes or leave foliage floating)
//  2. the simplified mesh gets a fresh UV atlas, and the master's colour, roughness and normal detail are baked onto it
//     (see bake.mjs). The normal map keeps the surface detail the simplification removed: the grain of the granite,
//     each leaf and needle of the foliage, the bark
//  3. it's anchored and normalised by one transform worked out from the master, so every level lines up exactly:
//     - rocks: bottom-centre of their bounds, footprint 1 unit across
//     - trees: the centre of the trunk where it meets the ground, 1 unit tall
//     - shrubs: bottom-centre of their bounds, 1 unit tall
//     Scenes scale it to their own world size
//  4. textures are encoded as WebP (EXT_texture_webp: three.js and iOS WebKit decode it natively); where a level drops
//     its roughness map the material takes the map's mean. Geometry is quantised and compressed
//     (EXT_meshopt_compression, decoded by three.js's bundled decoder)
//  5. each level's deviation from the master is measured both ways (master → level and level → master)
//
// It writes the levels and a manifest (what each level costs, how far it strays from the master, where its base is)
// next to them. Masters are only ever read, and stay out of Git (assets/environment/masters/README.md). Node 22+.

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Document, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions'
import { meshopt, prune } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'
import { BufferAttribute, BufferGeometry, Vector3 } from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import { bakeMaps, dilate, edgeCounts, gltfTangents, simplifyWelded, unwrap, weldByPosition } from './bake.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const MAPS = (base, normal, roughness) => ({ baseColor: base, normal, metallicRoughness: roughness })

/**
 * The assets to optimise, and what each level of detail may spend. `high` is for hero close-ups and the TV, `medium`
 * is what phones draw in the main view, `low` is for distant or many-at-once.
 *   kind: 'rock' | 'tree' | 'shrub' (how it's anchored and normalised, above)
 */
const ASSETS = [
  {
    id: 'granite-headland',
    kind: 'rock',
    master: 'assets/environment/masters/granite/granite-headland.glb',
    out: 'public/models/environment/granite',
    lods: {
      high: { triangles: 15000, textures: MAPS(2048, 2048, 1024) },
      medium: { triangles: 7500, textures: MAPS(1024, 1024, 512) },
      low: { triangles: 2500, textures: MAPS(512, 512, null) }
    }
  },
  {
    id: 'eastern-white-pine',
    kind: 'tree',
    master: 'assets/environment/masters/trees/eastern-white-pine.glb',
    out: 'public/models/environment/trees',
    lods: {
      high: { triangles: 15000, textures: MAPS(2048, 2048, 1024) },
      medium: { triangles: 6000, textures: MAPS(1024, 1024, 512) },
      low: { triangles: 2000, textures: MAPS(512, 512, null) }
    }
  },
  {
    id: 'coastal-oak',
    kind: 'tree',
    master: 'assets/environment/masters/trees/coastal-oak.glb',
    out: 'public/models/environment/trees',
    lods: {
      high: { triangles: 15000, textures: MAPS(2048, 2048, 1024) },
      medium: { triangles: 7500, textures: MAPS(1024, 1024, 512) },
      low: { triangles: 2500, textures: MAPS(512, 512, null) }
    }
  },
  {
    id: 'beach-rose',
    kind: 'shrub',
    master: 'assets/environment/masters/shrubs/beach-rose.glb',
    out: 'public/models/environment/shrubs',
    lods: {
      // a knee-high shrub: it never fills the screen the way a tree or headland can
      high: { triangles: 8000, textures: MAPS(1024, 1024, 512) },
      medium: { triangles: 3000, textures: MAPS(512, 512, 256) },
      low: { triangles: 1000, textures: MAPS(256, 256, null) }
    }
  }
]

/** WebP quality per texture slot: colour tolerates the most, normals the least */
const WEBP_QUALITY = { baseColor: 88, normal: 94, metallicRoughness: 86 }
/** Points sampled over each surface when measuring deviation */
const SAMPLES = 40000
/** Texels of padding round each chart, by bake size */
const BAKE_PADDING = { 2048: 6, 1024: 4, 512: 3, 256: 2 }
/** How far (normalised units) a level's texels look for the master: past the level's own largest deviation, within limits */
const BAKE_REACH = { min: 0.02, max: 0.12, overDeviation: 1.3 }
/** The slice of the model, from its lowest point up (fraction of its height), that counts as where it meets the ground */
const BASE_SLICE = 0.025

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder
})

const kb = (n) => `${(n / 1024).toFixed(0)} KB`
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`
const round = (v, d = 5) => Number(v.toFixed(d))
const log = (...a) => console.log(...a)

/** The single mesh primitive of a document (masters from Meshy are one mesh, one primitive, one material) */
function onlyPrimitive(doc) {
  const prims = doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
  if (prims.length !== 1) throw new Error(`expected one primitive, found ${prims.length}`)
  return prims[0]
}

/** Bounds of a position array */
function boundsOf(positions) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3)
    for (let k = 0; k < 3; k++) {
      if (positions[i + k] < min[k]) min[k] = positions[i + k]
      if (positions[i + k] > max[k]) max[k] = positions[i + k]
    }
  return { min, max, size: max.map((v, k) => v - min[k]) }
}

/** Where a model meets the ground: the centre and reach (x, z) of its lowest slice */
function baseOf(positions, bounds) {
  const top = bounds.min[1] + bounds.size[1] * BASE_SLICE
  let n = 0
  let cx = 0
  let cz = 0
  for (let i = 0; i < positions.length; i += 3)
    if (positions[i + 1] <= top) {
      cx += positions[i]
      cz += positions[i + 2]
      n++
    }
  cx /= n
  cz /= n
  // its reach from that centre: the 90th percentile, so a stray root tip doesn't set it
  const dx = []
  const dz = []
  for (let i = 0; i < positions.length; i += 3)
    if (positions[i + 1] <= top) {
      dx.push(Math.abs(positions[i] - cx))
      dz.push(Math.abs(positions[i + 2] - cz))
    }
  const p90 = (a) => a.sort((x, y) => x - y)[Math.floor(a.length * 0.9)]
  return { center: [cx, cz], reach: [p90(dx), p90(dz)] }
}

/** A three.js geometry for measuring (positions and indices only); MeshBVH reorders its index in place */
function measureGeometry(positions, indices) {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(positions, 3))
  g.setIndex(new BufferAttribute(indices instanceof Uint32Array ? indices : new Uint32Array(indices), 1))
  return g
}

/** Points spread over a surface, by area */
function samplePoints(positions, indices, n) {
  const tris = indices.length / 3
  const cum = new Float64Array(tris)
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  let total = 0
  for (let t = 0; t < tris; t++) {
    a.fromArray(positions, indices[t * 3] * 3)
    b.fromArray(positions, indices[t * 3 + 1] * 3)
    c.fromArray(positions, indices[t * 3 + 2] * 3)
    total += b.sub(a).cross(c.sub(a)).length() / 2
    cum[t] = total
  }
  // a fixed stream, so the measurement is the same every run
  let s = 12345
  const rand = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
  const points = []
  for (let i = 0; i < n; i++) {
    const target = rand() * total
    let lo = 0
    let hi = tris - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cum[mid] < target) lo = mid + 1
      else hi = mid
    }
    let u = rand()
    let v = rand()
    if (u + v > 1) {
      u = 1 - u
      v = 1 - v
    }
    a.fromArray(positions, indices[lo * 3] * 3)
    b.fromArray(positions, indices[lo * 3 + 1] * 3)
    c.fromArray(positions, indices[lo * 3 + 2] * 3)
    points.push(new Vector3().copy(a).addScaledVector(b.sub(a), u).addScaledVector(c.sub(a), v))
  }
  return points
}

/** Distances from points to a surface: mean, 95th and 99th percentile, and maximum */
function distances(points, bvh) {
  const d = points.map((p) => bvh.closestPointToPoint(p).distance).sort((x, y) => x - y)
  return { mean: d.reduce((s, x) => s + x, 0) / d.length, p95: d[Math.floor(d.length * 0.95)], p99: d[Math.floor(d.length * 0.99)], max: d[d.length - 1] }
}

/** An image's pixels as RGBA */
async function pixels(image) {
  const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

/** Baked RGBA pixels as WebP at `size` */
async function encodeBaked(data, bakeSize, size, quality) {
  const webp = await sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), {
    raw: { width: bakeSize, height: bakeSize, channels: 4 }
  })
    .removeAlpha()
    .resize(size, size, { kernel: 'lanczos3' })
    .webp({ quality, effort: 6 })
    .toBuffer()
  return new Uint8Array(webp)
}

/** One level as a glTF document: its mesh and baked maps, under the master's material settings */
function levelDocument(name, masterMaterial, geometry, maps, meanRoughness) {
  const doc = new Document()
  doc.createExtension(EXTTextureWebP).setRequired(true)
  const buffer = doc.createBuffer()
  const accessor = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer)
  const texture = (slot) => doc.createTexture(`${name}-${slot}`).setImage(maps[slot]).setMimeType('image/webp')

  const material = doc
    .createMaterial(name)
    .setBaseColorFactor(masterMaterial.getBaseColorFactor())
    .setDoubleSided(masterMaterial.getDoubleSided())
    .setAlphaMode(masterMaterial.getAlphaMode())
    .setBaseColorTexture(texture('baseColor'))
  if (maps.normal) material.setNormalTexture(texture('normal')).setNormalScale(masterMaterial.getNormalScale())
  if (maps.metallicRoughness)
    material
      .setMetallicRoughnessTexture(texture('metallicRoughness'))
      .setMetallicFactor(masterMaterial.getMetallicFactor())
      .setRoughnessFactor(masterMaterial.getRoughnessFactor())
  // without its roughness map: the map's mean roughness, and no metal (the masters' metal channel is ~0)
  else material.setMetallicFactor(0).setRoughnessFactor(round(meanRoughness, 3))

  const prim = doc
    .createPrimitive()
    .setMaterial(material)
    .setIndices(accessor('SCALAR', geometry.indices))
    .setAttribute('POSITION', accessor('VEC3', geometry.positions))
    .setAttribute('NORMAL', accessor('VEC3', geometry.normals))
    .setAttribute('TEXCOORD_0', accessor('VEC2', geometry.uvs))
    .setAttribute('TANGENT', accessor('VEC4', geometry.tangents))
  const node = doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim))
  doc.createScene(name).addChild(node)
  doc.getRoot().setDefaultScene(doc.getRoot().listScenes()[0])
  return doc
}

async function optimise(asset) {
  const started = performance.now()
  const masterPath = join(root, asset.master)
  const masterBytes = readFileSync(masterPath)
  const masterHash = createHash('sha256').update(masterBytes).digest('hex')
  log(`\n${asset.id} (${asset.kind})\n  master ${asset.master} (${mb(masterBytes.length)}, sha256 ${masterHash.slice(0, 12)}…)`)

  // the master, as authored
  const masterDoc = await io.readBinary(new Uint8Array(masterBytes.buffer, masterBytes.byteOffset, masterBytes.length))
  const masterPrim = onlyPrimitive(masterDoc)
  const mPos = masterPrim.getAttribute('POSITION').getArray()
  const mNrm = masterPrim.getAttribute('NORMAL').getArray()
  const mUV = masterPrim.getAttribute('TEXCOORD_0').getArray()
  const mIdx = Uint32Array.from(masterPrim.getIndices().getArray())
  const mBounds = boundsOf(mPos)
  const material = masterPrim.getMaterial()
  const slots = { baseColor: material.getBaseColorTexture(), metallicRoughness: material.getMetallicRoughnessTexture(), normal: material.getNormalTexture() }
  const masterTextures = []
  for (const [slot, tex] of Object.entries(slots)) {
    if (!tex) continue
    const m = await sharp(tex.getImage()).metadata()
    masterTextures.push({ slot, width: m.width, height: m.height, format: tex.getMimeType(), bytes: tex.getImage().length })
  }
  const edges = edgeCounts(mPos, mIdx)
  log(`  ${(mIdx.length / 3).toLocaleString()} triangles, ${(mPos.length / 3).toLocaleString()} vertices; size ${mBounds.size.map((v) => v.toFixed(3)).join(' × ')}`)
  log(`  open edges ${edges.open}, non-manifold edges ${edges.nonManifold}`)

  // the one transform every level shares
  const base = baseOf(mPos, mBounds)
  const scale = 1 / (asset.kind === 'rock' ? Math.max(mBounds.size[0], mBounds.size[2]) : mBounds.size[1])
  const [cx, cz] = asset.kind === 'tree' ? base.center : [(mBounds.min[0] + mBounds.max[0]) / 2, (mBounds.min[2] + mBounds.max[2]) / 2]
  const offset = [-cx, -mBounds.min[1], -cz]
  const masterNorm = new Float32Array(mPos.length)
  for (let i = 0; i < mPos.length; i += 3) for (let k = 0; k < 3; k++) masterNorm[i + k] = (mPos[i + k] + offset[k]) * scale
  const nBounds = boundsOf(masterNorm)

  // the master, normalised: what every level is measured against and baked from
  log('  preparing the master…')
  const masterBVH = new MeshBVH(measureGeometry(masterNorm, mIdx))
  const masterSamples = samplePoints(masterNorm, mIdx, SAMPLES)
  const bakeSource = {
    positions: masterNorm,
    normals: mNrm,
    uvs: mUV,
    tangents: gltfTangents(masterNorm, mNrm, mUV, mIdx),
    indices: mIdx,
    bvh: masterBVH,
    images: {
      baseColor: await pixels(slots.baseColor.getImage()),
      metallicRoughness: slots.metallicRoughness ? await pixels(slots.metallicRoughness.getImage()) : null,
      normal: slots.normal ? await pixels(slots.normal.getImage()) : null
    }
  }
  const welded = weldByPosition(masterNorm, mNrm, mIdx)
  let meanRoughness = material.getRoughnessFactor()
  if (slots.metallicRoughness) meanRoughness *= (await sharp(slots.metallicRoughness.getImage()).stats()).channels[1].mean / 255
  log(`  ready in ${((performance.now() - started) / 1000).toFixed(1)} s`)

  await MeshoptEncoder.ready
  await MeshoptSimplifier.ready
  const outDir = join(root, asset.out)
  mkdirSync(outDir, { recursive: true })
  const manifest = {
    id: asset.id,
    kind: asset.kind,
    generatedAt: new Date().toISOString(),
    master: {
      file: asset.master,
      bytes: masterBytes.length,
      sha256: masterHash,
      triangles: mIdx.length / 3,
      vertices: mPos.length / 3,
      textures: masterTextures,
      openEdges: edges.open,
      nonManifoldEdges: edges.nonManifold,
      meanRoughness: round(meanRoughness, 3)
    },
    normalisation: {
      note:
        asset.kind === 'rock'
          ? 'Every level: positions (master + offset) × scale: the base sits on y = 0, centred on x and z, its footprint 1 unit across'
          : asset.kind === 'tree'
            ? 'Every level: positions (master + offset) × scale: the trunk meets y = 0 at the origin, and it stands 1 unit tall'
            : 'Every level: positions (master + offset) × scale: the base sits on y = 0, centred on x and z, and it stands 1 unit tall',
      scale,
      offset,
      masterSize: mBounds.size,
      size: nBounds.size,
      bounds: { min: nBounds.min.map((v) => round(v)), max: nBounds.max.map((v) => round(v)) },
      // where it meets the ground, from the origin (x, z): its anchor's footprint
      base: { center: [round((base.center[0] - cx) * scale), round((base.center[1] - cz) * scale)], reach: base.reach.map((v) => round(v * scale)) }
    },
    lods: {}
  }

  for (const [lod, spec] of Object.entries(asset.lods)) {
    const t0 = performance.now()
    // free simplification, a fresh atlas, and the master's detail baked onto it
    const simplified = await simplifyWelded(welded, spec.triangles, 1)
    // how far it strays decides how far its texels look for the master
    const simplifiedBVH = new MeshBVH(measureGeometry(simplified.positions, new Uint32Array(simplified.indices)))
    const fromMaster = distances(masterSamples, simplifiedBVH)
    const reach = Math.min(BAKE_REACH.max, Math.max(BAKE_REACH.min, fromMaster.max * BAKE_REACH.overDeviation))
    const bakeSize = Math.max(...Object.values(spec.textures).filter(Boolean))
    const unwrapped = await unwrap(simplified, bakeSize, BAKE_PADDING[bakeSize] ?? 4)
    const tangents = gltfTangents(unwrapped.positions, unwrapped.normals, unwrapped.uvs, unwrapped.indices)
    const baked = bakeMaps(bakeSource, { ...unwrapped, tangents }, bakeSize, reach)
    dilate([baked.base, baked.mr, baked.nrm], baked.covered, bakeSize, 24)

    const images = { baseColor: baked.base, normal: baked.nrm, metallicRoughness: baked.mr }
    const maps = {}
    const textures = []
    for (const [slot, size] of Object.entries(spec.textures)) {
      if (!slots[slot]) continue
      if (size === null) {
        textures.push({ slot, dropped: true, roughness: round(meanRoughness, 3) })
        continue
      }
      maps[slot] = await encodeBaked(images[slot], bakeSize, size, WEBP_QUALITY[slot])
      textures.push({ slot, format: 'image/webp', width: size, height: size, bytes: maps[slot].length })
    }
    const pos = unwrapped.positions
    const indices = pos.length / 3 > 65535 ? unwrapped.indices : Uint16Array.from(unwrapped.indices)
    const doc = levelDocument(`${asset.id}-${lod}`, material, { indices, positions: pos, normals: unwrapped.normals, uvs: unwrapped.uvs, tangents }, maps, meanRoughness)
    await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
    const glb = await io.writeBinary(doc)
    const file = `${asset.id}-${lod}.glb`
    writeFileSync(join(outDir, file), glb)

    // and how far the finished level strays from the master, both ways
    const toMaster = distances(samplePoints(pos, indices, SAMPLES), masterBVH)
    const gpuBytes = textures.filter((t) => !t.dropped).reduce((n, t) => n + t.width * t.height * 4 * (4 / 3), 0)
    manifest.lods[lod] = {
      file,
      bytes: glb.length,
      triangles: indices.length / 3,
      vertices: pos.length / 3,
      textures,
      gpuTextureBytes: Math.round(gpuBytes),
      simplifierError: simplified.error,
      bake: {
        charts: unwrapped.charts,
        atlasUtilisation: round(unwrapped.utilization, 3),
        bakeSize,
        reach: round(reach, 4),
        texels: baked.stats.rays,
        texelsMissedMaster: baked.stats.fallbacks
      },
      deviation: {
        note: 'distance between surfaces, in normalised units (see normalisation)',
        lodToMaster: toMaster,
        masterToLod: fromMaster
      }
    }
    log(
      `  ${lod.padEnd(6)} ${(indices.length / 3).toLocaleString().padStart(7)} tris  ${(pos.length / 3).toLocaleString().padStart(6)} verts  ${kb(glb.length).padStart(8)}  ` +
        `textures ${textures.map((t) => (t.dropped ? `${t.slot}: mean` : `${t.slot} ${t.width}`)).join(', ')}  ` +
        `deviation mean ${(fromMaster.mean * 100).toFixed(3)}% p99 ${(fromMaster.p99 * 100).toFixed(2)}% max ${(Math.max(fromMaster.max, toMaster.max) * 100).toFixed(2)}%  ` +
        `reach ${(reach * 100).toFixed(1)}%, ${baked.stats.fallbacks} texels missed  (${((performance.now() - t0) / 1000).toFixed(1)} s)`
    )
  }

  writeFileSync(join(outDir, `${asset.id}.json`), JSON.stringify(manifest, null, 2) + '\n')

  // the master is never written: make sure
  const after = createHash('sha256').update(readFileSync(masterPath)).digest('hex')
  if (after !== masterHash) throw new Error('the master changed while optimising')
  log(`  master unchanged (sha256 ${after.slice(0, 12)}…, ${mb(statSync(masterPath).size)})`)
  log(`  wrote ${Object.keys(asset.lods).length} levels and ${asset.id}.json to ${asset.out} in ${((performance.now() - started) / 1000).toFixed(0)} s`)
}

const asked = process.argv.slice(2)
const unknown = asked.filter((id) => !ASSETS.some((a) => a.id === id))
if (unknown.length) {
  console.error(`No asset ${unknown.map((u) => `"${u}"`).join(', ')}. Known: ${ASSETS.map((a) => a.id).join(', ')}`)
  process.exit(1)
}
for (const asset of ASSETS) if (!asked.length || asked.includes(asset.id)) await optimise(asset)
