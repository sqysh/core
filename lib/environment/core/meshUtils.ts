import { BufferAttribute, BufferGeometry } from 'three'

/**
 * Drops every triangle lying wholly below `y` (in the asset's own frame): the buried underside and roots of a rock
 * that no camera can see once it's embedded. Vertices are compacted so nothing unused is uploaded.
 */
export function trimBelow(geometry: BufferGeometry, y: number) {
  const index = geometry.getIndex()
  if (!index) return geometry
  const pos = geometry.getAttribute('position')
  const keep: number[] = []
  for (let t = 0; t < index.count; t += 3) {
    const a = index.getX(t)
    const b = index.getX(t + 1)
    const c = index.getX(t + 2)
    if (pos.getY(a) < y && pos.getY(b) < y && pos.getY(c) < y) continue
    keep.push(a, b, c)
  }
  // compact: renumber the vertices still in use, and copy every attribute across
  const remap = new Int32Array(pos.count).fill(-1)
  let n = 0
  for (const v of keep) if (remap[v] < 0) remap[v] = n++
  const out = new BufferGeometry()
  for (const name of Object.keys(geometry.attributes)) {
    const src = geometry.getAttribute(name) as BufferAttribute
    const dst = new (src.array.constructor as Float32ArrayConstructor)(n * src.itemSize)
    for (let v = 0; v < pos.count; v++) {
      const to = remap[v]
      if (to < 0) continue
      for (let k = 0; k < src.itemSize; k++) dst[to * src.itemSize + k] = src.array[v * src.itemSize + k]
    }
    out.setAttribute(name, new BufferAttribute(dst, src.itemSize, src.normalized))
  }
  const idx = keep.map((v) => remap[v])
  out.setIndex(n > 65535 ? new BufferAttribute(new Uint32Array(idx), 1) : new BufferAttribute(new Uint16Array(idx), 1))
  geometry.dispose()
  return out
}
