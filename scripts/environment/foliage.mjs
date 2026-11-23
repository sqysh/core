// Foliage for vegetation levels of detail, as a billboard cloud.
//
// Meshy's trees and shrubs model every leaf and needle as sculpted geometry on one closed surface. Simplifying that
// surface to a game budget collapses the tufts into flat shreds, thinning the crown and breaking its silhouette. So the
// master is split by colour into its solid parts (trunk, branches, roots, stones), which simplify well and are re-baked
// like the granite (bake.mjs), and its foliage, which becomes cards:
//
//   1. foliage triangles are clustered into clumps (k-means over their positions, by area)
//   2. each clump gets a card fitted to it: the plane through its centre across its thinnest direction, turned to face
//      out of the crown, and a second card crossing it when the clump is round rather than flat
//   3. each card is captured from the master, looking at its clump straight on: colour, roughness and the master's
//      normal (into the card's own frame, so the tufts keep their volume under light) where the clump is, and nothing
//      (alpha 0) where it isn't. Cards are drawn alpha-tested and double-sided
//
// All coordinates are the master's, normalised (optimize-glb.mjs). Tangent frames follow glTF, as in bake.mjs.

import { BufferAttribute, BufferGeometry, DoubleSide, Ray, Vector3 } from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import { positionIds, sampler } from './bake.mjs'

/** Colour of the master's base colour map at a triangle's centre, as hue (degrees), saturation and value */
function triangleHsv(master, t, sample, out) {
  const { uvs, indices } = master
  const a = indices[t * 3]
  const b = indices[t * 3 + 1]
  const c = indices[t * 3 + 2]
  sample((uvs[a * 2] + uvs[b * 2] + uvs[c * 2]) / 3, (uvs[a * 2 + 1] + uvs[b * 2 + 1] + uvs[c * 2 + 1]) / 3, out)
  const r = out[0] / 255
  const g = out[1] / 255
  const bl = out[2] / 255
  const max = Math.max(r, g, bl)
  const min = Math.min(r, g, bl)
  const d = max - min
  let h = 0
  if (d > 1e-6) h = max === r ? ((g - bl) / d + 6) % 6 : max === g ? (bl - r) / d + 2 : (r - g) / d + 4
  return [h * 60, max ? d / max : 0, max]
}

/** Bark, wood, stone and soil: browns, dull reds and greys, never bright. Leaves, needles, grass and blooms are the rest */
const isSolidColour = ([h, s, v]) => (v < 0.62 && (h < 50 || h >= 340) && s > 0.12) || (s < 0.15 && v < 0.6)

/** Triangle areas */
function areasOf(positions, indices) {
  const areas = new Float32Array(indices.length / 3)
  for (let t = 0; t < areas.length; t++) {
    const a = indices[t * 3] * 3
    const b = indices[t * 3 + 1] * 3
    const c = indices[t * 3 + 2] * 3
    const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2]
    const vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2]
    areas[t] = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2
  }
  return areas
}

/**
 * Splits the master's triangles into solid (1) and foliage (0) by colour, then tidies the split: a patch of one
 * surrounded by the other (moss on bark, a dark fleck among needles) joins its surroundings if it's small.
 */
export function classify(master, minPatch = 0.0004) {
  const tris = master.indices.length / 3
  const sample = sampler(master.images.baseColor)
  const rgba = [0, 0, 0, 0]
  const solid = new Uint8Array(tris)
  for (let t = 0; t < tris; t++) solid[t] = isSolidColour(triangleHsv(master, t, sample, rgba)) ? 1 : 0
  const areas = areasOf(master.positions, master.indices)
  const { ids, unique } = positionIds(master.positions)

  // patches: triangles of one kind joined by shared positions
  for (const kind of [1, 0]) {
    const parent = new Int32Array(unique)
    for (let i = 0; i < unique; i++) parent[i] = i
    const find = (x) => {
      while (parent[x] !== x) x = parent[x] = parent[parent[x]]
      return x
    }
    for (let t = 0; t < tris; t++) {
      if (solid[t] !== kind) continue
      const a = find(ids[master.indices[t * 3]])
      const b = find(ids[master.indices[t * 3 + 1]])
      const c = find(ids[master.indices[t * 3 + 2]])
      parent[b] = a
      parent[find(c)] = a
    }
    const patchArea = new Map()
    let total = 0
    for (let t = 0; t < tris; t++) {
      if (solid[t] !== kind) continue
      const r = find(ids[master.indices[t * 3]])
      patchArea.set(r, (patchArea.get(r) ?? 0) + areas[t])
      total += areas[t]
    }
    for (let t = 0; t < tris; t++)
      if (solid[t] === kind && patchArea.get(find(ids[master.indices[t * 3]])) < total * minPatch) solid[t] = 1 - kind
  }
  let solidArea = 0
  let foliageArea = 0
  for (let t = 0; t < tris; t++) (solid[t] ? (solidArea += areas[t]) : (foliageArea += areas[t]))
  return { solid, areas, solidShare: solidArea / (solidArea + foliageArea) }
}

/** The triangles of one kind, as an index list into the master's vertices */
export function subset(indices, mask, kind) {
  let n = 0
  for (let t = 0; t < mask.length; t++) if (mask[t] === kind) n++
  const out = new Uint32Array(n * 3)
  let o = 0
  for (let t = 0; t < mask.length; t++) if (mask[t] === kind) out.set(indices.subarray(t * 3, t * 3 + 3), (o++) * 3)
  return out
}

/** Eigen-decomposition of a symmetric 3×3 matrix (Jacobi): values descending, with their unit vectors */
function eigen3(m) {
  const a = [m[0].slice(), m[1].slice(), m[2].slice()]
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ]
  for (let sweep = 0; sweep < 24; sweep++) {
    const off = Math.abs(a[0][1]) + Math.abs(a[0][2]) + Math.abs(a[1][2])
    if (off < 1e-14) break
    for (const [p, q] of [
      [0, 1],
      [0, 2],
      [1, 2]
    ]) {
      if (Math.abs(a[p][q]) < 1e-18) continue
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q])
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
      const c = 1 / Math.sqrt(t * t + 1)
      const s = t * c
      for (let k = 0; k < 3; k++) {
        const akp = a[k][p]
        const akq = a[k][q]
        a[k][p] = c * akp - s * akq
        a[k][q] = s * akp + c * akq
      }
      for (let k = 0; k < 3; k++) {
        const apk = a[p][k]
        const aqk = a[q][k]
        a[p][k] = c * apk - s * aqk
        a[q][k] = s * apk + c * aqk
      }
      for (let k = 0; k < 3; k++) {
        const vkp = v[k][p]
        const vkq = v[k][q]
        v[k][p] = c * vkp - s * vkq
        v[k][q] = s * vkp + c * vkq
      }
    }
  }
  return [0, 1, 2]
    .map((i) => ({ value: a[i][i], vector: [v[0][i], v[1][i], v[2][i]] }))
    .sort((x, y) => y.value - x.value)
}

/** k-means clumps of foliage triangles (by centre, weighted by area): each triangle's clump */
export function clump(positions, indices, areas, k, seed = 7) {
  const tris = indices.length / 3
  const cx = new Float32Array(tris)
  const cy = new Float32Array(tris)
  const cz = new Float32Array(tris)
  let total = 0
  const cum = new Float64Array(tris)
  for (let t = 0; t < tris; t++) {
    const a = indices[t * 3] * 3
    const b = indices[t * 3 + 1] * 3
    const c = indices[t * 3 + 2] * 3
    cx[t] = (positions[a] + positions[b] + positions[c]) / 3
    cy[t] = (positions[a + 1] + positions[b + 1] + positions[c + 1]) / 3
    cz[t] = (positions[a + 2] + positions[b + 2] + positions[c + 2]) / 3
    total += areas[t]
    cum[t] = total
  }
  let s = seed
  const rand = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
  const pick = () => {
    const target = rand() * total
    let lo = 0
    let hi = tris - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cum[mid] < target) lo = mid + 1
      else hi = mid
    }
    return lo
  }
  // fit on a sample spread by area, then give every triangle its nearest centre
  const n = Math.min(tris, Math.max(k * 60, 60000))
  const sx = new Float32Array(n)
  const sy = new Float32Array(n)
  const sz = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = pick()
    sx[i] = cx[t]
    sy[i] = cy[t]
    sz[i] = cz[t]
  }
  const kx = new Float32Array(k)
  const ky = new Float32Array(k)
  const kz = new Float32Array(k)
  for (let j = 0; j < k; j++) {
    const i = Math.floor(rand() * n)
    kx[j] = sx[i]
    ky[j] = sy[i]
    kz[j] = sz[i]
  }
  const nearest = (x, y, z) => {
    let best = 0
    let bd = Infinity
    for (let j = 0; j < k; j++) {
      const d = (x - kx[j]) ** 2 + (y - ky[j]) ** 2 + (z - kz[j]) ** 2
      if (d < bd) {
        bd = d
        best = j
      }
    }
    return best
  }
  const label = new Int32Array(n)
  for (let iter = 0; iter < 14; iter++) {
    const ax = new Float64Array(k)
    const ay = new Float64Array(k)
    const az = new Float64Array(k)
    const an = new Uint32Array(k)
    for (let i = 0; i < n; i++) {
      const j = (label[i] = nearest(sx[i], sy[i], sz[i]))
      ax[j] += sx[i]
      ay[j] += sy[i]
      az[j] += sz[i]
      an[j]++
    }
    for (let j = 0; j < k; j++) {
      if (an[j]) {
        kx[j] = ax[j] / an[j]
        ky[j] = ay[j] / an[j]
        kz[j] = az[j] / an[j]
      } else {
        // an empty centre restarts on a random sample
        const i = Math.floor(rand() * n)
        kx[j] = sx[i]
        ky[j] = sy[i]
        kz[j] = sz[i]
      }
    }
  }
  // every triangle to its nearest centre, through a grid of centres so it stays quick
  let span = 0
  for (let j = 0; j < k; j++) span = Math.max(span, Math.abs(kx[j]), Math.abs(ky[j]), Math.abs(kz[j]))
  const cell = Math.max(1e-3, (2 * span) / Math.cbrt(k)) // about one centre per cell
  const grid = new Map()
  const keyOf = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`
  for (let j = 0; j < k; j++) {
    const key = keyOf(kx[j], ky[j], kz[j])
    if (!grid.has(key)) grid.set(key, [])
    grid.get(key).push(j)
  }
  const assignment = new Int32Array(tris)
  for (let t = 0; t < tris; t++) {
    const gx = Math.floor(cx[t] / cell)
    const gy = Math.floor(cy[t] / cell)
    const gz = Math.floor(cz[t] / cell)
    let best = -1
    let bd = Infinity
    for (let r = 1; r <= 3 && best < 0; r++)
      for (let dx = -r; dx <= r; dx++)
        for (let dy = -r; dy <= r; dy++)
          for (let dz = -r; dz <= r; dz++) {
            const list = grid.get(`${gx + dx},${gy + dy},${gz + dz}`)
            if (!list) continue
            for (const j of list) {
              const d = (cx[t] - kx[j]) ** 2 + (cy[t] - ky[j]) ** 2 + (cz[t] - kz[j]) ** 2
              if (d < bd) {
                bd = d
                best = j
              }
            }
          }
    assignment[t] = best >= 0 ? best : nearest(cx[t], cy[t], cz[t])
  }
  return assignment
}

/**
 * Cards for clumps of foliage. `foliage` indexes the master's vertices; `assignment` gives each of its triangles a
 * clump. A clump gets a second, crossing card when it's round rather than flat (its two smaller spreads within
 * `crossBelow` of each other).
 */
export function fitCards(master, foliage, areas, assignment, k, { crossBelow = 2.2, margin = 0.04 } = {}) {
  const P = master.positions
  const groups = Array.from({ length: k }, () => [])
  for (let t = 0; t < assignment.length; t++) groups[assignment[t]].push(t)
  const cards = []
  for (const tris of groups) {
    if (!tris.length) continue
    // spread of the clump, by area
    let w = 0
    const m = [0, 0, 0]
    for (const t of tris)
      for (let e = 0; e < 3; e++) {
        const v = foliage[t * 3 + e] * 3
        for (let c = 0; c < 3; c++) m[c] += P[v + c] * areas[t]
        w += areas[t]
      }
    for (let c = 0; c < 3; c++) m[c] /= w
    const cov = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]
    for (const t of tris)
      for (let e = 0; e < 3; e++) {
        const v = foliage[t * 3 + e] * 3
        const d = [P[v] - m[0], P[v + 1] - m[1], P[v + 2] - m[2]]
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cov[r][c] += d[r] * d[c] * areas[t]
      }
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cov[r][c] /= w
    const [e1, e2, e3] = eigen3(cov)
    const indices = new Uint32Array(tris.length * 3)
    tris.forEach((t, i) => indices.set(foliage.subarray(t * 3, t * 3 + 3), i * 3))
    const planes = [{ normal: e3.vector, along: e1.vector }]
    if (e2.value < e3.value * crossBelow) planes.push({ normal: e2.vector, along: e1.vector })
    for (const plane of planes) cards.push(cardFor(P, indices, m, plane, margin))
  }
  return cards
}

/** A card across a clump: facing out of the crown, sized to the clump's extent across it */
function cardFor(P, indices, center, { normal, along }, margin) {
  let n = new Vector3().fromArray(normal).normalize()
  // out of the crown: away from the trunk's axis, or up where the card lies flat
  const out = new Vector3(center[0], 0, center[2])
  if (Math.abs(n.y) > 0.8 || out.lengthSq() < 1e-6) {
    if (n.y < 0) n.negate()
  } else if (n.dot(out) < 0) n.negate()
  let u = new Vector3().fromArray(along)
  u.addScaledVector(n, -u.dot(n)).normalize()
  // (u, v, n) right-handed, so the glTF tangent frame is (u, v, n) with w = 1
  const v = new Vector3().crossVectors(n, u)
  let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity, dmin = Infinity, dmax = -Infinity
  const p = new Vector3()
  for (let i = 0; i < indices.length; i++) {
    p.fromArray(P, indices[i] * 3).sub(new Vector3(...center))
    const pu = p.dot(u)
    const pv = p.dot(v)
    const pd = p.dot(n)
    if (pu < umin) umin = pu
    if (pu > umax) umax = pu
    if (pv < vmin) vmin = pv
    if (pv > vmax) vmax = pv
    if (pd < dmin) dmin = pd
    if (pd > dmax) dmax = pd
  }
  const mu = (umax - umin) * margin
  const mv = (vmax - vmin) * margin
  return {
    center: new Vector3(...center),
    u,
    v,
    n,
    umin: umin - mu,
    umax: umax + mu,
    vmin: vmin - mv,
    vmax: vmax + mv,
    dmin,
    dmax,
    indices
  }
}

/** Shelf-packs cards into a square atlas at one texel density, as dense as fits: each card's pixel rectangle */
export function packCards(cards, size, padding) {
  const area = cards.reduce((s, c) => s + (c.umax - c.umin) * (c.vmax - c.vmin), 0)
  let density = Math.sqrt((size * size * 0.8) / area)
  for (;;) {
    const rects = cards.map((c, i) => ({
      i,
      w: Math.max(4, Math.ceil((c.umax - c.umin) * density)),
      h: Math.max(4, Math.ceil((c.vmax - c.vmin) * density))
    }))
    const order = [...rects].sort((a, b) => b.h - a.h)
    let x = padding
    let y = padding
    let shelf = 0
    let fits = true
    for (const r of order) {
      if (x + r.w + padding > size) {
        x = padding
        y += shelf + padding
        shelf = 0
      }
      if (y + r.h + padding > size) {
        fits = false
        break
      }
      r.x = x
      r.y = y
      x += r.w + padding
      shelf = Math.max(shelf, r.h)
    }
    if (fits) return { rects, density }
    density *= 0.96
  }
}

/**
 * Captures every card from the master into one atlas (`size` square): base colour with coverage in alpha, roughness
 * and metal, and normals in the card's frame. Returns the images, which texels were covered, and the cards' geometry.
 */
export function captureCards(master, cards, size, padding) {
  const { rects, density } = packCards(cards, size, padding)
  const base = new Uint8ClampedArray(size * size * 4)
  const mr = new Uint8ClampedArray(size * size * 4)
  const nrm = new Uint8ClampedArray(size * size * 4)
  const covered = new Uint8Array(size * size)
  const sampleBase = sampler(master.images.baseColor)
  const sampleMR = master.images.metallicRoughness ? sampler(master.images.metallicRoughness) : null
  const sampleN = master.images.normal ? sampler(master.images.normal) : null
  const c4 = [0, 0, 0, 0]
  const ray = new Ray()
  const geometryPositions = new BufferAttribute(master.positions, 3)
  const M = master
  let texels = 0
  let hits = 0

  // the cards' geometry: a quad each
  const count = cards.length
  const positions = new Float32Array(count * 12)
  const normals = new Float32Array(count * 12)
  const tangents = new Float32Array(count * 16)
  const uvs = new Float32Array(count * 8)
  const indices = new Uint32Array(count * 6)

  for (const r of rects) {
    const card = cards[r.i]
    const g = new BufferGeometry()
    g.setAttribute('position', geometryPositions)
    g.setIndex(new BufferAttribute(card.indices, 1))
    const bvh = new MeshBVH(g)
    const depth = card.dmax - card.dmin
    for (let py = 0; py < r.h; py++)
      for (let px = 0; px < r.w; px++) {
        // texel → card: x runs along u, rows run down v (glTF: v grows down the image)
        const su = card.umin + ((px + 0.5) / r.w) * (card.umax - card.umin)
        const sv = card.vmax - ((py + 0.5) / r.h) * (card.vmax - card.vmin)
        ray.origin.copy(card.center).addScaledVector(card.u, su).addScaledVector(card.v, sv).addScaledVector(card.n, card.dmax + 1e-4)
        ray.direction.copy(card.n).negate()
        texels++
        const hit = bvh.raycastFirst(ray, DoubleSide, 0, depth + 2e-4)
        if (!hit) continue
        hits++
        const { a, b, c } = hit.face
        const w0 = hit.barycoord.x
        const w1 = hit.barycoord.y
        const w2 = hit.barycoord.z
        const lerp = (arr, stride, k) => arr[a * stride + k] * w0 + arr[b * stride + k] * w1 + arr[c * stride + k] * w2
        const mu = lerp(M.uvs, 2, 0)
        const mv = lerp(M.uvs, 2, 1)
        const o = ((r.y + py) * size + r.x + px) * 4
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
        // the master's normal in object space (its map through its own frame), then into the card's frame
        let Nx = lerp(M.normals, 3, 0)
        let Ny = lerp(M.normals, 3, 1)
        let Nz = lerp(M.normals, 3, 2)
        const nl = Math.hypot(Nx, Ny, Nz) || 1
        Nx /= nl
        Ny /= nl
        Nz /= nl
        let ox = Nx
        let oy = Ny
        let oz = Nz
        if (sampleN) {
          sampleN(mu, mv, c4)
          const tx = (c4[0] / 255) * 2 - 1
          const ty = (c4[1] / 255) * 2 - 1
          const tz = (c4[2] / 255) * 2 - 1
          let Tx = lerp(M.tangents, 4, 0)
          let Ty = lerp(M.tangents, 4, 1)
          let Tz = lerp(M.tangents, 4, 2)
          const d = Tx * Nx + Ty * Ny + Tz * Nz
          Tx -= Nx * d
          Ty -= Ny * d
          Tz -= Nz * d
          const tl = Math.hypot(Tx, Ty, Tz) || 1
          Tx /= tl
          Ty /= tl
          Tz /= tl
          const sw = M.tangents[a * 4 + 3] < 0 ? -1 : 1
          const Bx = (Ny * Tz - Nz * Ty) * sw
          const By = (Nz * Tx - Nx * Tz) * sw
          const Bz = (Nx * Ty - Ny * Tx) * sw
          ox = Tx * tx + Bx * ty + Nx * tz
          oy = Ty * tx + By * ty + Ny * tz
          oz = Tz * tx + Bz * ty + Nz * tz
        }
        // the side of the clump the card sees faces it; a surface seen from behind shows its front
        let ex = ox * card.u.x + oy * card.u.y + oz * card.u.z
        let ey = ox * card.v.x + oy * card.v.y + oz * card.v.z
        let ez = ox * card.n.x + oy * card.n.y + oz * card.n.z
        if (ez < 0) ez = -ez
        if (ez < 0.08) ez = 0.08
        const el = Math.hypot(ex, ey, ez)
        nrm[o] = ((ex / el) * 0.5 + 0.5) * 255
        nrm[o + 1] = ((ey / el) * 0.5 + 0.5) * 255
        nrm[o + 2] = ((ez / el) * 0.5 + 0.5) * 255
        nrm[o + 3] = 255
        covered[(r.y + py) * size + r.x + px] = 1
      }

    // the quad: corners at the edges of its texels, UVs at the same edges
    const q = r.i
    const corners = [
      [card.umin, card.vmax, r.x, r.y],
      [card.umax, card.vmax, r.x + r.w, r.y],
      [card.umax, card.vmin, r.x + r.w, r.y + r.h],
      [card.umin, card.vmin, r.x, r.y + r.h]
    ]
    corners.forEach(([su, sv, tx, ty], i) => {
      const p = card.center.clone().addScaledVector(card.u, su).addScaledVector(card.v, sv)
      positions.set([p.x, p.y, p.z], q * 12 + i * 3)
      normals.set([card.n.x, card.n.y, card.n.z], q * 12 + i * 3)
      tangents.set([card.u.x, card.u.y, card.u.z, 1], q * 16 + i * 4)
      uvs.set([tx / size, ty / size], q * 8 + i * 2)
    })
    // wound to face along n
    indices.set([q * 4, q * 4 + 3, q * 4 + 2, q * 4, q * 4 + 2, q * 4 + 1], q * 6)
  }
  return {
    images: { base, mr, nrm },
    covered,
    geometry: { positions, normals, tangents, uvs, indices },
    stats: { cards: cards.length, texelsPerUnit: Math.round(density), coverage: hits / texels }
  }
}
