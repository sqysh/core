import { BufferAttribute, Color, IcosahedronGeometry, MeshStandardMaterial, Vector3 } from 'three'
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { fbm3, noise3, rng, smoothstep } from '@/app/dev/lighthouse/_lib/noise'

// North Shore granite, as a miniature: a weathered mass of rock like the ledges along Marblehead, Gloucester and
// Rockport. A lumpy body is cut across by a few fracture planes (mostly the near-horizontal sheeting and near-vertical
// joints granite splits along), leaving broad flat broken faces whose edges stay softly rounded. Warm gray with brown
// and muted pink in it, feldspar speckle, darker joints, sun-bleached tops, and moss settling on the upward faces.

const GRAY = new Color('#bcae9f')
const BROWN = new Color('#a68d75')
const PINK = new Color('#cba795')
const SPECK_DARK = new Color('#655d57')
const SPECK_LIGHT = new Color('#d7cec4')
const BLEACHED = new Color('#e2d7c8')
const SHADE = new Color('#625548')
const MOSS = new Color('#6e8b3d')
const MOSS_LIT = new Color('#93a94c')

let material: MeshStandardMaterial | null = null
export const graniteMaterial = () => (material ??= new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }))

/**
 * A granite mass w × h × d, centred on the origin. `moss` (0–1) is how much of its upward faces is mossed over.
 * The same seed always gives the same rock.
 */
export function graniteMass({ w, h, d, seed, moss = 0.5 }: { w: number; h: number; d: number; seed: number; moss?: number }) {
  const r = rng(seed)
  const base = new IcosahedronGeometry(1, 3)
  base.deleteAttribute('uv')
  base.deleteAttribute('normal')
  const geo = mergeVertices(base)
  const pos = geo.getAttribute('position')

  // fracture planes: sheeting (up / down, a little off level) and joints (round the sides), each cutting off a cap
  const cuts: { n: Vector3; at: number }[] = []
  cuts.push({ n: new Vector3((r() - 0.5) * 0.3, 1, (r() - 0.5) * 0.3).normalize(), at: 0.58 + r() * 0.1 })
  cuts.push({ n: new Vector3((r() - 0.5) * 0.2, -1, (r() - 0.5) * 0.2).normalize(), at: 0.5 + r() * 0.08 })
  const joints = 5 + Math.floor(r() * 3)
  for (let i = 0; i < joints; i++) {
    const a = (i / joints) * Math.PI * 2 + (r() - 0.5) * 0.8
    cuts.push({ n: new Vector3(Math.cos(a), (r() - 0.5) * 0.6, Math.sin(a)).normalize(), at: 0.55 + r() * 0.17 })
  }
  // a couple of oblique breaks across the corners
  for (let i = 0; i < 2; i++) {
    const a = r() * Math.PI * 2
    cuts.push({ n: new Vector3(Math.cos(a), r() > 0.5 ? 0.8 : -0.5, Math.sin(a)).normalize(), at: 0.6 + r() * 0.12 })
  }

  const p = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    p.set(pos.getX(i), pos.getY(i), pos.getZ(i))
    // a lumpy, weathered body
    p.multiplyScalar(1 + 0.13 * fbm3(p.x * 1.6, p.y * 1.6, p.z * 1.6, seed))
    // broken faces: whatever lies beyond a fracture plane is pressed back onto it, leaving a slight belly
    for (const c of cuts) {
      const over = p.dot(c.n) - c.at
      if (over > 0) p.addScaledVector(c.n, -over * 0.97)
    }
    pos.setXYZ(i, p.x * (w / 2), p.y * (h / 2), p.z * (d / 2))
  }
  // each broken face shades as one plane; the weathered parts between stay rounded
  const rock = toCreasedNormals(geo, 0.6)

  const rpos = rock.getAttribute('position')
  const nrm = rock.getAttribute('normal')
  const col = new Float32Array(rpos.count * 3)
  const c = new Color()
  for (let i = 0; i < rpos.count; i++) {
    const x = rpos.getX(i)
    const y = rpos.getY(i)
    const z = rpos.getZ(i)
    const ny = nrm.getY(i)
    // broad drifts of gray, brown and pink through the stone
    const drift = fbm3(x * 0.9, y * 0.9, z * 0.9, seed + 7)
    c.copy(GRAY).lerp(BROWN, smoothstep(0.05, 0.45, drift)).lerp(PINK, smoothstep(-0.05, -0.45, drift) * 0.8)
    // feldspar and mica speckle
    const speck = noise3(x * 22, y * 22, z * 22, seed + 3)
    if (speck > 0.55) c.lerp(SPECK_DARK, 0.45)
    else if (speck < -0.6) c.lerp(SPECK_LIGHT, 0.4)
    // dark joint lines across the faces (the sheeting the rock splits along)
    const joint = Math.abs(Math.sin(y * 9 + fbm3(x * 2, y * 2, z * 2, seed + 5) * 2.2))
    c.lerp(SHADE, smoothstep(0.12, 0.02, joint) * 0.5)
    // tops bleached by sun and salt, undersides in shade
    c.lerp(BLEACHED, smoothstep(0.35, 0.95, ny) * 0.4).lerp(SHADE, smoothstep(-0.1, -0.8, ny) * 0.55)
    // moss on the upward faces, in patches
    const patch = fbm3(x * 2.4, y * 2.4, z * 2.4, seed + 11)
    const mossy = smoothstep(0.45, 0.85, ny) * smoothstep(0.25 - moss * 0.5, 0.45 - moss * 0.5, patch) * moss
    c.lerp(MOSS, mossy * 0.85).lerp(MOSS_LIT, mossy * smoothstep(0.7, 1, ny) * 0.35)
    col.set([c.r, c.g, c.b], i * 3)
  }
  rock.setAttribute('color', new BufferAttribute(col, 3))
  return rock
}
