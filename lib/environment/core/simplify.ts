import { BufferAttribute, BufferGeometry } from 'three'
import { MeshoptSimplifier } from 'meshoptimizer'

// Mesh simplification for the asset library (meshoptimizer's quadric simplifier). A dense, carefully modelled source
// mesh is reduced to a triangle budget while keeping its silhouette, planes and bevels: flat areas collapse to a few
// large triangles, curvature keeps its density. Kept vertices are moved to where they best fit the original surface,
// and their normals, colours and other attributes are carried along, so shading barely changes. Fine surface detail
// is left to the material's maps rather than spent on triangles.

export type SimplifyOptions = {
  /** Most triangles to keep */
  triangles: number
  /** Largest allowed deviation from the source, relative to the mesh's size (0.01 = 1%) */
  maxError: number
  /** Attributes to carry and how much each one's change counts against a simplification */
  attributes: { name: string; weight: number }[]
}

export async function simplifyToBudget(source: BufferGeometry, o: SimplifyOptions) {
  await MeshoptSimplifier.ready
  const pos = source.getAttribute('position')
  const index = source.getIndex()!
  const positions = new Float32Array(pos.array as ArrayLike<number>)
  const indices = new Uint32Array(index.array as ArrayLike<number>)

  // pack the carried attributes into one interleaved array, as the simplifier expects
  const attrs = o.attributes.map((a) => ({ ...a, src: source.getAttribute(a.name) as BufferAttribute }))
  const stride = attrs.reduce((n, a) => n + a.src.itemSize, 0)
  const packed = new Float32Array(pos.count * stride)
  for (let v = 0; v < pos.count; v++) {
    let k = 0
    for (const a of attrs) for (let c = 0; c < a.src.itemSize; c++) packed[v * stride + k++] = a.src.array[v * a.src.itemSize + c]
  }
  const weights = attrs.flatMap((a) => Array(a.src.itemSize).fill(a.weight))

  const [count, error] = MeshoptSimplifier.simplifyWithUpdate(
    indices,
    positions,
    3,
    packed,
    stride,
    weights,
    null,
    Math.min(indices.length, o.triangles * 3),
    o.maxError,
    ['LockBorder']
  )

  // keep only the vertices still in use, with their updated positions and attributes
  const used = indices.subarray(0, count)
  const remap = new Int32Array(pos.count).fill(-1)
  let n = 0
  for (const v of used) if (remap[v] < 0) remap[v] = n++
  const out = new BufferGeometry()
  const outPos = new Float32Array(n * 3)
  const outAttrs = attrs.map((a) => new Float32Array(n * a.src.itemSize))
  for (let v = 0; v < pos.count; v++) {
    const to = remap[v]
    if (to < 0) continue
    outPos.set(positions.subarray(v * 3, v * 3 + 3), to * 3)
    let k = 0
    attrs.forEach((a, ai) => {
      for (let c = 0; c < a.src.itemSize; c++) outAttrs[ai][to * a.src.itemSize + c] = packed[v * stride + k++]
    })
  }
  out.setAttribute('position', new BufferAttribute(outPos, 3))
  attrs.forEach((a, ai) => out.setAttribute(a.name, new BufferAttribute(outAttrs[ai], a.src.itemSize)))
  const idx = Array.from(used, (v) => remap[v])
  out.setIndex(n > 65535 ? new BufferAttribute(new Uint32Array(idx), 1) : new BufferAttribute(new Uint16Array(idx), 1))
  // interpolated normals come back slightly short: make them unit length again
  const nrm = out.getAttribute('normal')
  if (nrm) {
    for (let v = 0; v < nrm.count; v++) {
      const x = nrm.getX(v)
      const y = nrm.getY(v)
      const z = nrm.getZ(v)
      const l = Math.hypot(x, y, z) || 1
      nrm.setXYZ(v, x / l, y / l, z / l)
    }
  }
  out.computeBoundingSphere()
  return { geometry: out, error: error * MeshoptSimplifier.getScale(positions, 3) }
}
