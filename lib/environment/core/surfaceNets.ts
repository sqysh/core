import { BufferAttribute, BufferGeometry } from 'three'

// Surface Nets: turns a signed distance field into a smooth, watertight-looking triangle mesh. The field is sampled on
// a regular grid; every cell the surface passes through gets one vertex (the average of where the surface crosses the
// cell's edges), and every grid edge the surface crosses becomes a quad joining the four cells around it.
//
// Sampling is narrow-band: a cheap coarse version of the field (given, or the full field on a coarser grid) is checked
// first, and the full field is only evaluated where that is within `band` of the surface. Elsewhere the coarse value is
// used, which has the right sign, so the mesh is the same but far cheaper to build.

export type Bounds = { min: [number, number, number]; max: [number, number, number] }

export type FieldSampler = {
  full: (x: number, y: number, z: number) => number
  /**
   * A cheap bound of the full field, within `band` of it. Leave it out to have one made automatically: the full
   * field sampled on a grid `coarseScale` times coarser and interpolated (its error grows with the field's slope, so
   * `band` should allow for that).
   */
  coarse?: (x: number, y: number, z: number) => number
  /** How far the full field can stray from the coarse one */
  band: number
  coarseScale?: number
}

const CORNERS = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1]
]
// the cube's 12 edges as pairs of corner indices
const EDGES: [number, number][] = []
for (let i = 0; i < 8; i++)
  for (let j = i + 1; j < 8; j++) {
    const a = CORNERS[i]
    const b = CORNERS[j]
    if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) === 1) EDGES.push([i, j])
  }

/**
 * `refine`: settle each vertex onto the exact surface (one step along the field's gradient) and take its normal from
 * the gradient rather than from the mesh. Flat and sloping planes then shade truly flat, with none of the faint
 * stepping a grid leaves on them. Costs a few extra samples of the full field per vertex.
 */
export function surfaceNets(field: FieldSampler, bounds: Bounds, cell: number, refine = false) {
  const nx = Math.ceil((bounds.max[0] - bounds.min[0]) / cell) + 1
  const ny = Math.ceil((bounds.max[1] - bounds.min[1]) / cell) + 1
  const nz = Math.ceil((bounds.max[2] - bounds.min[2]) / cell) + 1
  const [ox, oy, oz] = bounds.min
  const coarse = field.coarse ?? coarseGrid(field.full, bounds, cell * (field.coarseScale ?? 3))
  const values = new Float32Array(nx * ny * nz)
  const at = (i: number, j: number, k: number) => i + nx * (j + ny * k)
  let fullSamples = 0
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const x = ox + i * cell
        const y = oy + j * cell
        const z = oz + k * cell
        const c = coarse(x, y, z)
        let v = c
        if (Math.abs(c) < field.band) {
          v = field.full(x, y, z)
          fullSamples++
        }
        // keep the grid's outer shell outside, so the mesh closes over the bounds
        if (i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1) v = Math.max(v, 1e-3)
        values[at(i, j, k)] = v
      }

  const cx = nx - 1
  const cy = ny - 1
  const cz = nz - 1
  const cellVertex = new Int32Array(cx * cy * cz).fill(-1)
  const cellAt = (i: number, j: number, k: number) => i + cx * (j + cy * k)
  const positions: number[] = []
  const corner = new Float32Array(8)
  for (let k = 0; k < cz; k++)
    for (let j = 0; j < cy; j++)
      for (let i = 0; i < cx; i++) {
        let mask = 0
        for (let c = 0; c < 8; c++) {
          const [a, b, d] = CORNERS[c]
          const v = values[at(i + a, j + b, k + d)]
          corner[c] = v
          if (v < 0) mask |= 1 << c
        }
        if (mask === 0 || mask === 255) continue
        let sx = 0
        let sy = 0
        let sz = 0
        let n = 0
        for (const [e0, e1] of EDGES) {
          const v0 = corner[e0]
          const v1 = corner[e1]
          if (v0 < 0 === v1 < 0) continue
          const t = v0 / (v0 - v1)
          const a = CORNERS[e0]
          const b = CORNERS[e1]
          sx += a[0] + (b[0] - a[0]) * t
          sy += a[1] + (b[1] - a[1]) * t
          sz += a[2] + (b[2] - a[2]) * t
          n++
        }
        cellVertex[cellAt(i, j, k)] = positions.length / 3
        positions.push(ox + (i + sx / n) * cell, oy + (j + sy / n) * cell, oz + (k + sz / n) * cell)
      }

  // a quad for every grid edge the surface crosses, joining the four cells that share that edge
  const indices: number[] = []
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return
    if (flip) indices.push(a, c, b, a, d, c)
    else indices.push(a, b, c, a, c, d)
  }
  for (let k = 0; k < cz; k++)
    for (let j = 0; j < cy; j++)
      for (let i = 0; i < cx; i++) {
        const v0 = values[at(i, j, k)]
        const inside = v0 < 0
        // edge along x from (i,j,k): cells around it differ in j and k
        if (j > 0 && k > 0 && inside !== values[at(i + 1, j, k)] < 0)
          quad(cellVertex[cellAt(i, j, k)], cellVertex[cellAt(i, j - 1, k)], cellVertex[cellAt(i, j - 1, k - 1)], cellVertex[cellAt(i, j, k - 1)], inside)
        // along y: cells differ in i and k
        if (i > 0 && k > 0 && inside !== values[at(i, j + 1, k)] < 0)
          quad(cellVertex[cellAt(i, j, k)], cellVertex[cellAt(i, j, k - 1)], cellVertex[cellAt(i - 1, j, k - 1)], cellVertex[cellAt(i - 1, j, k)], inside)
        // along z: cells differ in i and j
        if (i > 0 && j > 0 && inside !== values[at(i, j, k + 1)] < 0)
          quad(cellVertex[cellAt(i, j, k)], cellVertex[cellAt(i - 1, j, k)], cellVertex[cellAt(i - 1, j - 1, k)], cellVertex[cellAt(i, j - 1, k)], inside)
      }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(positions.length / 3 > 65535 ? new BufferAttribute(new Uint32Array(indices), 1) : new BufferAttribute(new Uint16Array(indices), 1))
  geometry.computeVertexNormals()
  orientOutward(geometry, field.full)
  if (refine) refineOnSurface(geometry, field.full, cell)
  return { geometry, samples: values.length, fullSamples }
}

/** The full field on a coarser grid, trilinearly interpolated */
function coarseGrid(full: (x: number, y: number, z: number) => number, bounds: Bounds, cell: number) {
  const [ox, oy, oz] = bounds.min
  const nx = Math.ceil((bounds.max[0] - ox) / cell) + 2
  const ny = Math.ceil((bounds.max[1] - oy) / cell) + 2
  const nz = Math.ceil((bounds.max[2] - oz) / cell) + 2
  const g = new Float32Array(nx * ny * nz)
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) g[i + nx * (j + ny * k)] = full(ox + i * cell, oy + j * cell, oz + k * cell)
  return (x: number, y: number, z: number) => {
    const fx = Math.min(nx - 1.001, Math.max(0, (x - ox) / cell))
    const fy = Math.min(ny - 1.001, Math.max(0, (y - oy) / cell))
    const fz = Math.min(nz - 1.001, Math.max(0, (z - oz) / cell))
    const i = Math.floor(fx)
    const j = Math.floor(fy)
    const k = Math.floor(fz)
    const tx = fx - i
    const ty = fy - j
    const tz = fz - k
    const at = (a: number, b: number, c: number) => g[i + a + nx * (j + b + ny * (k + c))]
    const x00 = at(0, 0, 0) + (at(1, 0, 0) - at(0, 0, 0)) * tx
    const x10 = at(0, 1, 0) + (at(1, 1, 0) - at(0, 1, 0)) * tx
    const x01 = at(0, 0, 1) + (at(1, 0, 1) - at(0, 0, 1)) * tx
    const x11 = at(0, 1, 1) + (at(1, 1, 1) - at(0, 1, 1)) * tx
    const y0 = x00 + (x10 - x00) * ty
    const y1 = x01 + (x11 - x01) * ty
    return y0 + (y1 - y0) * tz
  }
}

function refineOnSurface(geometry: BufferGeometry, full: (x: number, y: number, z: number) => number, cell: number) {
  const pos = geometry.getAttribute('position')
  const nrm = geometry.getAttribute('normal')
  const e = cell * 0.35
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i)
    let y = pos.getY(i)
    let z = pos.getZ(i)
    const gx = full(x + e, y, z) - full(x - e, y, z)
    const gy = full(x, y + e, z) - full(x, y - e, z)
    const gz = full(x, y, z + e) - full(x, y, z - e)
    const l = Math.hypot(gx, gy, gz)
    if (l < 1e-9) continue
    const nx = gx / l
    const ny = gy / l
    const nz = gz / l
    // one Newton step onto the surface (the field need not be an exact distance: divide by its slope), never further
    // than half a cell, so thin features can't fold over
    const slope = l / (2 * e)
    const d = Math.max(-cell * 0.5, Math.min(cell * 0.5, full(x, y, z) / slope))
    x -= nx * d
    y -= ny * d
    z -= nz * d
    pos.setXYZ(i, x, y, z)
    nrm.setXYZ(i, nx, ny, nz)
  }
  pos.needsUpdate = true
  nrm.needsUpdate = true
}

/** Makes the triangles face out of the shape (the field rises outward), whichever way the quads were wound */
function orientOutward(geometry: BufferGeometry, field: (x: number, y: number, z: number) => number) {
  const pos = geometry.getAttribute('position')
  const nrm = geometry.getAttribute('normal')
  let agree = 0
  const step = Math.max(1, Math.floor(pos.count / 400))
  for (let i = 0; i < pos.count; i += step) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const e = 0.02
    const out = field(x + nrm.getX(i) * e, y + nrm.getY(i) * e, z + nrm.getZ(i) * e) > field(x - nrm.getX(i) * e, y - nrm.getY(i) * e, z - nrm.getZ(i) * e)
    agree += out ? 1 : -1
  }
  if (agree >= 0) return
  const index = geometry.getIndex()!
  for (let t = 0; t < index.count; t += 3) {
    const b = index.getX(t + 1)
    index.setX(t + 1, index.getX(t + 2))
    index.setX(t + 2, b)
  }
  geometry.computeVertexNormals()
}
