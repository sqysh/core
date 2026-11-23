// Re-meshing and texture baking for environment levels of detail.
//
// AI-generated and scanned models carry dense, fragmented UV atlases (the granite headland has 1,247 islands). A
// simplifier that respects those seams can't go below a floor set by the islands, and one that ignores them smears the
// texture. So each level of detail is rebuilt instead:
//
//   1. the master is welded by position (dropping its UV seams) and simplified freely to the level's budget
//   2. the simplified mesh gets a fresh, tightly packed UV atlas (xatlas, via watlas)
//   3. every texel of that atlas is baked from the master: the matching point on the master is found along the level's
//      normal, and the master's colour, roughness and normal detail are sampled there. The normal bake carries the
//      master's surface detail (including geometry the simplification removed) into the level's own tangent frame
//   4. charts are dilated outward, so mipmaps never pull in empty texels at their borders
//
// Tangents follow glTF: bitangent = cross(normal, tangent.xyz) × tangent.w, pointing toward decreasing v (up the image).

import { DoubleSide, Ray, Vector3 } from 'three'
import { MeshoptSimplifier } from 'meshoptimizer'
import * as watlas from 'watlas'

/** One id per distinct position (exact match), for each vertex: UV seams split vertices that share a place */
export function positionIds(positions) {
  const count = positions.length / 3
  const bits = new Uint32Array(positions.buffer, positions.byteOffset, positions.length)
  let size = 1
  while (size < count * 2) size <<= 1
  const table = new Int32Array(size).fill(-1)
  const ids = new Uint32Array(count)
  const first = new Uint32Array(count)
  let unique = 0
  for (let v = 0; v < count; v++) {
    const a = bits[v * 3]
    const b = bits[v * 3 + 1]
    const c = bits[v * 3 + 2]
    let h = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) & (size - 1)
    for (;;) {
      const t = table[h]
      if (t < 0) {
        table[h] = v
        first[unique] = v
        ids[v] = unique++
        break
      }
      if (bits[t * 3] === a && bits[t * 3 + 1] === b && bits[t * 3 + 2] === c) {
        ids[v] = ids[t]
        break
      }
      h = (h + 1) & (size - 1)
    }
  }
  return { ids, unique, first: first.subarray(0, unique) }
}

/** Welds vertices that share a position (UV seams split them), averaging their normals */
export function weldByPosition(positions, normals, indices) {
  const { ids, unique, first } = positionIds(positions)
  const outPos = new Float32Array(unique * 3)
  const outNrm = new Float32Array(unique * 3)
  for (let i = 0; i < unique; i++) outPos.set(positions.subarray(first[i] * 3, first[i] * 3 + 3), i * 3)
  for (let v = 0; v < ids.length; v++) {
    const id = ids[v]
    outNrm[id * 3] += normals[v * 3]
    outNrm[id * 3 + 1] += normals[v * 3 + 1]
    outNrm[id * 3 + 2] += normals[v * 3 + 2]
  }
  for (let i = 0; i < outNrm.length; i += 3) {
    const l = Math.hypot(outNrm[i], outNrm[i + 1], outNrm[i + 2]) || 1
    outNrm[i] /= l
    outNrm[i + 1] /= l
    outNrm[i + 2] /= l
  }
  const outIdx = new Uint32Array(indices.length)
  for (let i = 0; i < indices.length; i++) outIdx[i] = ids[indices[i]]
  return { positions: outPos, normals: outNrm, indices: outIdx }
}

/** Edges used by one triangle (where the surface is open) and by more than two (non-manifold), seams welded */
export function edgeCounts(positions, indices) {
  const { ids } = positionIds(positions)
  // an edge's two ids in one exactly representable number (ids stay well under 2^26)
  const keys = new Float64Array(indices.length)
  for (let t = 0; t < indices.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = ids[indices[t + e]]
      const b = ids[indices[t + ((e + 1) % 3)]]
      keys[t + e] = a < b ? a * 67108864 + b : b * 67108864 + a
    }
  keys.sort()
  let open = 0
  let nonManifold = 0
  for (let i = 0; i < keys.length; ) {
    let k = i
    while (k < keys.length && keys[k] === keys[i]) k++
    if (k - i === 1) open++
    else if (k - i > 2) nonManifold++
    i = k
  }
  return { open, nonManifold }
}

/** Simplifies welded geometry to a triangle budget, moving kept vertices to fit the original surface best */
export async function simplifyWelded(welded, triangles, maxError, normalWeight = 0.5) {
  await MeshoptSimplifier.ready
  const positions = new Float32Array(welded.positions)
  const normals = new Float32Array(welded.normals)
  const indices = new Uint32Array(welded.indices)
  const [count, error] = MeshoptSimplifier.simplifyWithUpdate(
    indices,
    positions,
    3,
    normals,
    3,
    [normalWeight, normalWeight, normalWeight],
    null,
    Math.min(indices.length, triangles * 3),
    maxError,
    []
  )
  // keep only what's used
  const used = indices.subarray(0, count)
  const remap = new Int32Array(positions.length / 3).fill(-1)
  let n = 0
  for (const v of used) if (remap[v] < 0) remap[v] = n++
  const outPos = new Float32Array(n * 3)
  const outNrm = new Float32Array(n * 3)
  for (let v = 0; v < remap.length; v++) {
    const to = remap[v]
    if (to < 0) continue
    outPos.set(positions.subarray(v * 3, v * 3 + 3), to * 3)
    const l = Math.hypot(normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]) || 1
    outNrm.set([normals[v * 3] / l, normals[v * 3 + 1] / l, normals[v * 3 + 2] / l], to * 3)
  }
  const outIdx = new Uint32Array(used.length)
  for (let i = 0; i < used.length; i++) outIdx[i] = remap[used[i]]
  return { positions: outPos, normals: outNrm, indices: outIdx, error }
}

/** A fresh UV atlas for a mesh (xatlas): returns the mesh split at its new seams, with UVs in 0–1 */
export async function unwrap(mesh, resolution, padding) {
  await watlas.Initialize()
  const atlas = new watlas.Atlas()
  atlas.addMesh({
    vertexPositionData: mesh.positions,
    vertexCount: mesh.positions.length / 3,
    vertexPositionStride: 12,
    vertexNormalData: mesh.normals,
    vertexNormalStride: 12,
    indexData: mesh.indices,
    indexCount: mesh.indices.length
  })
  atlas.generate({}, { resolution, padding, bilinear: true, rotateCharts: true, rotateChartsToAxis: true, bruteForce: false })
  const out = atlas.getMesh(0)
  const w = atlas.width
  const h = atlas.height
  const count = out.vertexCount
  const positions = new Float32Array(count * 3)
  const normals = new Float32Array(count * 3)
  const uvs = new Float32Array(count * 2)
  for (let i = 0; i < count; i++) {
    const v = out.getVertex(i)
    positions.set(mesh.positions.subarray(v.xref * 3, v.xref * 3 + 3), i * 3)
    normals.set(mesh.normals.subarray(v.xref * 3, v.xref * 3 + 3), i * 3)
    uvs[i * 2] = v.uv[0] / w
    uvs[i * 2 + 1] = v.uv[1] / h
  }
  const indices = new Uint32Array(out.indexCount)
  out.getIndexArray(indices)
  const charts = atlas.chartCount
  const util = new Float32Array(1)
  atlas.getUtilization(util)
  atlas.delete()
  return { positions, normals, uvs, indices, charts, utilization: util[0] }
}

/** Per-vertex tangents in glTF convention (xyz along increasing u, w so cross(n, t)·w runs toward decreasing v) */
export function gltfTangents(positions, normals, uvs, indices) {
  const count = positions.length / 3
  const tan1 = new Float32Array(count * 3)
  const tan2 = new Float32Array(count * 3)
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t]
    const b = indices[t + 1]
    const c = indices[t + 2]
    const x1 = positions[b * 3] - positions[a * 3], y1 = positions[b * 3 + 1] - positions[a * 3 + 1], z1 = positions[b * 3 + 2] - positions[a * 3 + 2]
    const x2 = positions[c * 3] - positions[a * 3], y2 = positions[c * 3 + 1] - positions[a * 3 + 1], z2 = positions[c * 3 + 2] - positions[a * 3 + 2]
    const s1 = uvs[b * 2] - uvs[a * 2], t1 = uvs[b * 2 + 1] - uvs[a * 2 + 1]
    const s2 = uvs[c * 2] - uvs[a * 2], t2 = uvs[c * 2 + 1] - uvs[a * 2 + 1]
    const det = s1 * t2 - s2 * t1
    if (Math.abs(det) < 1e-20) continue
    const r = 1 / det
    const sx = (t2 * x1 - t1 * x2) * r, sy = (t2 * y1 - t1 * y2) * r, sz = (t2 * z1 - t1 * z2) * r
    const tx = (s1 * x2 - s2 * x1) * r, ty = (s1 * y2 - s2 * y1) * r, tz = (s1 * z2 - s2 * z1) * r
    for (const v of [a, b, c]) {
      tan1[v * 3] += sx
      tan1[v * 3 + 1] += sy
      tan1[v * 3 + 2] += sz
      tan2[v * 3] += tx
      tan2[v * 3 + 1] += ty
      tan2[v * 3 + 2] += tz
    }
  }
  const out = new Float32Array(count * 4)
  for (let v = 0; v < count; v++) {
    const nx = normals[v * 3], ny = normals[v * 3 + 1], nz = normals[v * 3 + 2]
    let x = tan1[v * 3], y = tan1[v * 3 + 1], z = tan1[v * 3 + 2]
    const d = nx * x + ny * y + nz * z
    x -= nx * d
    y -= ny * d
    z -= nz * d
    let l = Math.hypot(x, y, z)
    if (l < 1e-12) {
      // no usable UV gradient here: any direction across the normal
      ;[x, y, z] = Math.abs(nx) < 0.9 ? [0, -nz, ny] : [nz, 0, -nx]
      l = Math.hypot(x, y, z) || 1
    }
    x /= l
    y /= l
    z /= l
    // handedness: glTF's bitangent runs toward decreasing v (v grows down the image)
    const bx = ny * z - nz * y, by = nz * x - nx * z, bz = nx * y - ny * x
    const w = bx * tan2[v * 3] + by * tan2[v * 3 + 1] + bz * tan2[v * 3 + 2] < 0 ? 1 : -1
    out.set([x, y, z, w], v * 4)
  }
  return out
}

/** An RGBA image (Uint8) sampled bilinearly at a UV (glTF: v = 0 at the top row) */
export function sampler(image) {
  const { data, width: w, height: h } = image
  return (u, v, out) => {
    const x = Math.min(w - 1, Math.max(0, u * w - 0.5))
    const y = Math.min(h - 1, Math.max(0, v * h - 0.5))
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const x1 = Math.min(w - 1, x0 + 1)
    const y1 = Math.min(h - 1, y0 + 1)
    const fx = x - x0
    const fy = y - y0
    for (let c = 0; c < 4; c++) {
      const a = data[(y0 * w + x0) * 4 + c]
      const b = data[(y0 * w + x1) * 4 + c]
      const d = data[(y1 * w + x0) * 4 + c]
      const e = data[(y1 * w + x1) * 4 + c]
      out[c] = (a + (b - a) * fx) * (1 - fy) + (d + (e - d) * fx) * fy
    }
    return out
  }
}

/**
 * Bakes a level's maps from the master. `master`: positions, normals, uvs, tangents (glTF), indices, its BVH, and its
 * images ({ baseColor, metallicRoughness?, normal? } as { data, width, height } RGBA). `level`: positions, normals,
 * uvs, tangents (glTF), indices. Returns RGBA images at `size`, and which texels a chart covered.
 */
export function bakeMaps(master, level, size, reach) {
  const px = size * size
  const base = new Uint8ClampedArray(px * 4)
  const mr = new Uint8ClampedArray(px * 4)
  const nrm = new Uint8ClampedArray(px * 4)
  const covered = new Uint8Array(px)
  const sampleBase = sampler(master.images.baseColor)
  const sampleMR = master.images.metallicRoughness ? sampler(master.images.metallicRoughness) : null
  const sampleN = master.images.normal ? sampler(master.images.normal) : null
  const ray = new Ray()
  const p = new Vector3()
  const n = new Vector3()
  const hitPoint = new Vector3()
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const c4 = [0, 0, 0, 0]
  const m = master
  const L = level
  let fallbacks = 0
  let rays = 0

  /** Barycentric coordinates of a point in a master triangle */
  const bary = (face, point) => {
    const i0 = m.indices[face * 3]
    const i1 = m.indices[face * 3 + 1]
    const i2 = m.indices[face * 3 + 2]
    a.fromArray(m.positions, i0 * 3)
    b.fromArray(m.positions, i1 * 3)
    c.fromArray(m.positions, i2 * 3)
    const v0x = b.x - a.x, v0y = b.y - a.y, v0z = b.z - a.z
    const v1x = c.x - a.x, v1y = c.y - a.y, v1z = c.z - a.z
    const v2x = point.x - a.x, v2y = point.y - a.y, v2z = point.z - a.z
    const d00 = v0x * v0x + v0y * v0y + v0z * v0z
    const d01 = v0x * v1x + v0y * v1y + v0z * v1z
    const d11 = v1x * v1x + v1y * v1y + v1z * v1z
    const d20 = v2x * v0x + v2y * v0y + v2z * v0z
    const d21 = v2x * v1x + v2y * v1y + v2z * v1z
    const den = d00 * d11 - d01 * d01 || 1e-12
    let w1 = (d11 * d20 - d01 * d21) / den
    let w2 = (d00 * d21 - d01 * d20) / den
    w1 = Math.min(1, Math.max(0, w1))
    w2 = Math.min(1 - w1, Math.max(0, w2))
    return [i0, i1, i2, 1 - w1 - w2, w1, w2]
  }
  const lerp3 = (arr, stride, i0, i1, i2, w0, w1, w2, k) => arr[i0 * stride + k] * w0 + arr[i1 * stride + k] * w1 + arr[i2 * stride + k] * w2

  const tris = L.indices.length / 3
  for (let t = 0; t < tris; t++) {
    const j0 = L.indices[t * 3]
    const j1 = L.indices[t * 3 + 1]
    const j2 = L.indices[t * 3 + 2]
    // the triangle in texel space
    const ux0 = L.uvs[j0 * 2] * size, uy0 = L.uvs[j0 * 2 + 1] * size
    const ux1 = L.uvs[j1 * 2] * size, uy1 = L.uvs[j1 * 2 + 1] * size
    const ux2 = L.uvs[j2 * 2] * size, uy2 = L.uvs[j2 * 2 + 1] * size
    const den = (uy1 - uy2) * (ux0 - ux2) + (ux2 - ux1) * (uy0 - uy2)
    if (Math.abs(den) < 1e-12) continue
    const minX = Math.max(0, Math.floor(Math.min(ux0, ux1, ux2) - 1))
    const maxX = Math.min(size - 1, Math.ceil(Math.max(ux0, ux1, ux2) + 1))
    const minY = Math.max(0, Math.floor(Math.min(uy0, uy1, uy2) - 1))
    const maxY = Math.min(size - 1, Math.ceil(Math.max(uy0, uy1, uy2) + 1))
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const sx = x + 0.5
        const sy = y + 0.5
        let w0 = ((uy1 - uy2) * (sx - ux2) + (ux2 - ux1) * (sy - uy2)) / den
        let w1 = ((uy2 - uy0) * (sx - ux2) + (ux0 - ux2) * (sy - uy2)) / den
        let w2 = 1 - w0 - w1
        // conservative: texels just outside an edge (within half a texel) still belong, so edges have no gaps
        const edge = -0.5 / Math.max(1, Math.sqrt(Math.abs(den)))
        if (w0 < edge || w1 < edge || w2 < edge) continue
        const texel = y * size + x
        // inside proper beats an edge-straddling claim from a neighbour
        const inside = w0 >= 0 && w1 >= 0 && w2 >= 0
        if (covered[texel] === 2 || (covered[texel] === 1 && !inside)) continue
        w0 = Math.max(0, w0)
        w1 = Math.max(0, w1)
        w2 = Math.max(0, w2)
        const ws = w0 + w1 + w2
        w0 /= ws
        w1 /= ws
        w2 /= ws
        p.set(
          lerp3(L.positions, 3, j0, j1, j2, w0, w1, w2, 0),
          lerp3(L.positions, 3, j0, j1, j2, w0, w1, w2, 1),
          lerp3(L.positions, 3, j0, j1, j2, w0, w1, w2, 2)
        )
        n.set(
          lerp3(L.normals, 3, j0, j1, j2, w0, w1, w2, 0),
          lerp3(L.normals, 3, j0, j1, j2, w0, w1, w2, 1),
          lerp3(L.normals, 3, j0, j1, j2, w0, w1, w2, 2)
        ).normalize()

        // the master's surface along this normal: the crossing nearest the texel, either side; else the closest point
        ray.origin.copy(p).addScaledVector(n, reach)
        ray.direction.copy(n).negate()
        rays++
        let face
        let hit = null
        for (const h of m.bvh.raycast(ray, DoubleSide, 0, reach * 2))
          if (!hit || Math.abs(h.distance - reach) < Math.abs(hit.distance - reach)) hit = h
        if (hit) {
          face = hit.faceIndex
          hitPoint.copy(hit.point)
        } else {
          const cp = m.bvh.closestPointToPoint(p)
          face = cp.faceIndex
          hitPoint.copy(cp.point)
          fallbacks++
        }
        const [i0, i1, i2, b0, b1, b2] = bary(face, hitPoint)
        const mu = lerp3(m.uvs, 2, i0, i1, i2, b0, b1, b2, 0)
        const mv = lerp3(m.uvs, 2, i0, i1, i2, b0, b1, b2, 1)
        const o = texel * 4

        sampleBase(mu, mv, c4)
        base[o] = c4[0]
        base[o + 1] = c4[1]
        base[o + 2] = c4[2]
        base[o + 3] = 255

        if (sampleMR) {
          sampleMR(mu, mv, c4)
          mr[o] = 255
          mr[o + 1] = c4[1]
          mr[o + 2] = c4[2]
          mr[o + 3] = 255
        }

        // the normal: the master's (its map in its own frame, to object space), into this level's frame
        let ox, oy, oz
        const mnx = lerp3(m.normals, 3, i0, i1, i2, b0, b1, b2, 0)
        const mny = lerp3(m.normals, 3, i0, i1, i2, b0, b1, b2, 1)
        const mnz = lerp3(m.normals, 3, i0, i1, i2, b0, b1, b2, 2)
        const ml = Math.hypot(mnx, mny, mnz) || 1
        const Nx = mnx / ml, Ny = mny / ml, Nz = mnz / ml
        if (sampleN) {
          sampleN(mu, mv, c4)
          const tx = (c4[0] / 255) * 2 - 1
          const ty = (c4[1] / 255) * 2 - 1
          const tz = (c4[2] / 255) * 2 - 1
          // the master's tangent frame (Gram-Schmidt against its normal)
          let Tx = lerp3(m.tangents, 4, i0, i1, i2, b0, b1, b2, 0)
          let Ty = lerp3(m.tangents, 4, i0, i1, i2, b0, b1, b2, 1)
          let Tz = lerp3(m.tangents, 4, i0, i1, i2, b0, b1, b2, 2)
          const d = Tx * Nx + Ty * Ny + Tz * Nz
          Tx -= Nx * d
          Ty -= Ny * d
          Tz -= Nz * d
          const tl = Math.hypot(Tx, Ty, Tz) || 1
          Tx /= tl
          Ty /= tl
          Tz /= tl
          const sw = m.tangents[i0 * 4 + 3] < 0 ? -1 : 1
          const Bx = (Ny * Tz - Nz * Ty) * sw
          const By = (Nz * Tx - Nx * Tz) * sw
          const Bz = (Nx * Ty - Ny * Tx) * sw
          ox = Tx * tx + Bx * ty + Nx * tz
          oy = Ty * tx + By * ty + Ny * tz
          oz = Tz * tx + Bz * ty + Nz * tz
        } else {
          ox = Nx
          oy = Ny
          oz = Nz
        }
        // this level's frame at the texel
        let Lx = lerp3(L.tangents, 4, j0, j1, j2, w0, w1, w2, 0)
        let Ly = lerp3(L.tangents, 4, j0, j1, j2, w0, w1, w2, 1)
        let Lz = lerp3(L.tangents, 4, j0, j1, j2, w0, w1, w2, 2)
        const ld = Lx * n.x + Ly * n.y + Lz * n.z
        Lx -= n.x * ld
        Ly -= n.y * ld
        Lz -= n.z * ld
        const ll = Math.hypot(Lx, Ly, Lz) || 1
        Lx /= ll
        Ly /= ll
        Lz /= ll
        const lw = L.tangents[j0 * 4 + 3] < 0 ? -1 : 1
        const LBx = (n.y * Lz - n.z * Ly) * lw
        const LBy = (n.z * Lx - n.x * Lz) * lw
        const LBz = (n.x * Ly - n.y * Lx) * lw
        let ex = ox * Lx + oy * Ly + oz * Lz
        let ey = ox * LBx + oy * LBy + oz * LBz
        let ez = ox * n.x + oy * n.y + oz * n.z
        if (ez < 0.05) ez = 0.05
        const el = Math.hypot(ex, ey, ez)
        ex /= el
        ey /= el
        ez /= el
        nrm[o] = (ex * 0.5 + 0.5) * 255
        nrm[o + 1] = (ey * 0.5 + 0.5) * 255
        nrm[o + 2] = (ez * 0.5 + 0.5) * 255
        nrm[o + 3] = 255
        covered[texel] = inside ? 2 : 1
      }
  }
  return { base, mr, nrm, covered, stats: { rays, fallbacks } }
}

/** Grows charts outward into empty texels, so filtering and mipmaps never pull in background */
export function dilate(images, covered, size, passes) {
  let mask = Uint8Array.from(covered, (v) => (v ? 1 : 0))
  for (let pass = 0; pass < passes; pass++) {
    const next = mask.slice()
    let grew = 0
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = y * size + x
        if (mask[i]) continue
        const sums = images.map(() => [0, 0, 0, 0])
        let k = 0
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
            const j = ny * size + nx
            if (!mask[j]) continue
            images.forEach((img, m) => {
              for (let c = 0; c < 4; c++) sums[m][c] += img[j * 4 + c]
            })
            k++
          }
        if (!k) continue
        images.forEach((img, m) => {
          for (let c = 0; c < 4; c++) img[i * 4 + c] = sums[m][c] / k
        })
        next[i] = 1
        grew++
      }
    mask = next
    if (!grew) break
  }
  // anything still empty (whole unused regions of the atlas) takes the average of what was baked
  images.forEach((img) => {
    const avg = [0, 0, 0, 0]
    let k = 0
    for (let i = 0; i < size * size; i++)
      if (mask[i]) {
        for (let c = 0; c < 4; c++) avg[c] += img[i * 4 + c]
        k++
      }
    for (let i = 0; i < size * size; i++) if (!mask[i]) for (let c = 0; c < 4; c++) img[i * 4 + c] = avg[c] / Math.max(1, k)
  })
}
