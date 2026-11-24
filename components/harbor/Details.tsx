'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import { BufferGeometry, Color, CylinderGeometry, IcosahedronGeometry, InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry } from 'three'
import { shrub } from '../../lib/lighthouse/geometry'
import { materials } from '../../lib/lighthouse/materials'
import { rng } from '../../lib/lighthouse/noise'
import { at } from '../../lib/lighthouse/world'
import { coastShore } from '../../lib/harbor/coast'
import { SLABS } from '../../lib/harbor/formations'
import { groundHeight } from '../../lib/harbor/terrain'
import { SIGN_AT, TRAIL } from '../../lib/harbor/trailSign'
import { DuneGrass, GrassSpot } from './Landscape'

// A little more life on the land, added with restraint: scattered stones of a few shapes, moss on bare rock, low
// grass tufts and small shrubs where the sand meets the green, and tiny shoreline things — driftwood, pebble drifts,
// seaweed, two crabs. Everything is seeded, instanced and placed on the real ground, and keeps clear of the lighthouse
// tile, the trail sign and its trail, and the stone formations themselves.

type P = { x: number; y: number; z: number; s: number; rot: number; k: number }

const nearSign = (u: number, v: number) => Math.hypot(u - SIGN_AT.u, v - SIGN_AT.v) < 3.4
const nearTrail = (u: number, v: number, pad = 0.7) => {
  for (let i = 0; i < TRAIL.length - 1; i++) {
    const [ax, ay] = TRAIL[i]
    const [bx, by] = TRAIL[i + 1]
    const t = Math.max(0, Math.min(1, ((u - ax) * (bx - ax) + (v - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)))
    if (Math.hypot(u - (ax + (bx - ax) * t), v - (ay + (by - ay) * t)) < pad) return true
  }
  return false
}
const inRock = (u: number, v: number, pad = 0.4) => SLABS.some((s) => Math.hypot(u - s.u, v - s.v) < Math.max(s.w, s.d) * 0.55 + pad)
const onTile = (x: number, z: number) => Math.max(Math.abs(x), Math.abs(z)) < 5.4

/** Sample land points in a band of shore distance d, kept clear of everything above */
function scatter(seed: number, count: number, dMin: number, dMax: number, region = { u0: -21, u1: 19, v0: -15, v1: 13 }, minGap = 0.45): { x: number; z: number; u: number; v: number; d: number }[] {
  const r = rng(seed)
  const out: { x: number; z: number; u: number; v: number; d: number }[] = []
  for (let k = 0; k < 6000 && out.length < count; k++) {
    const u = region.u0 + r() * (region.u1 - region.u0)
    const v = region.v0 + r() * (region.v1 - region.v0)
    const [x, z] = at(u, v)
    const d = coastShore(x, z)
    if (d < dMin || d > dMax || onTile(x, z) || nearSign(u, v) || nearTrail(u, v) || inRock(u, v)) continue
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < minGap)) continue
    out.push({ x, z, u, v, d })
  }
  return out
}

function Instances({ geo, mat, list, shadow = false, tint }: { geo: BufferGeometry; mat: MeshStandardMaterial; list: P[]; shadow?: boolean; tint?: (i: number) => Color }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    list.forEach((p, i) => {
      o.position.set(p.x, p.y, p.z)
      o.rotation.set(0, p.rot, 0)
      o.scale.set(p.s, p.s * (p.k > 0 ? p.k : 1), p.s * (0.8 + (i % 3) * 0.15))
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      if (tint) m.setColorAt(i, tint(i))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [list, tint])
  if (!list.length) return null
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} castShadow={shadow} receiveShadow />
}

export function Details() {
  const m = materials()
  const data = useMemo(() => {
    const r = rng(7001)
    const ground = (x: number, z: number) => groundHeight(x, z)

    // small stones: three shapes, a handful in loose pairs and trios, more near rock and the shore
    const stones: P[] = []
    for (const s of scatter(7002, 46, -2.2, -0.25, undefined, 0.9)) {
      const n = r() < 0.4 ? 2 : 1
      for (let i = 0; i < n; i++) {
        const x = s.x + (r() - 0.5) * 0.35
        const z = s.z + (r() - 0.5) * 0.35
        const sz = 0.07 + r() * 0.13 * (i === 0 ? 1 : 0.6)
        stones.push({ x, y: ground(x, z) - sz * 0.25, z, s: sz, rot: r() * 6.28, k: 0.55 + r() * 0.3 })
      }
    }

    // moss: soft green caps on the bare rock's upper faces (grass-topped slabs already read green)
    const moss: P[] = []
    for (const s of SLABS) {
      if (s.grass || s.y < 0.5 || s.u > 0) continue
      const [x0, z0] = at(s.u, s.v)
      for (let i = 0; i < 2; i++) {
        const a = r() * 6.28
        const rad = Math.min(s.w, s.d) * (0.1 + r() * 0.22)
        moss.push({ x: x0 + Math.cos(a) * rad, y: s.y + s.h - 0.02, z: z0 + Math.sin(a) * rad, s: 0.22 + r() * 0.3, rot: r() * 6.28, k: 0.18 })
      }
    }
    for (const s of SLABS) {
      // and a skirt of it round the foot of a few low stones
      if (s.y > 0.5 || s.u > 0 || r() > 0.4) continue
      const [x0, z0] = at(s.u, s.v)
      const a = r() * 6.28
      const x = x0 + Math.cos(a) * s.w * 0.45
      const z = z0 + Math.sin(a) * s.d * 0.45
      if (coastShore(x, z) > -0.3) continue
      moss.push({ x, y: ground(x, z) + 0.02, z, s: 0.3 + r() * 0.25, rot: r() * 6.28, k: 0.3 })
    }

    // low grass tufts where the sand gives way to green, and a few small shrubs
    const tufts: GrassSpot[] = scatter(7003, 40, -3.2, -0.5, undefined, 0.8).map((s) => ({ x: s.x, y: ground(s.x, s.z) - 0.02, z: s.z, s: 0.55 + r() * 0.5, rot: r() * 6.28 }))
    const shrubs = scatter(7004, 7, -3.5, -1.0, undefined, 2.2).map((s, i) => ({ x: s.x, y: ground(s.x, s.z) - 0.05, z: s.z, s: 0.55 + r() * 0.5, k: i % 2 }))

    // shoreline: driftwood on the dry edge, seaweed on the wet line
    const wood: P[] = scatter(7005, 5, -0.4, -0.12, undefined, 3).map((s) => ({ x: s.x, y: ground(s.x, s.z) + 0.035, z: s.z, s: 0.5 + r() * 0.5, rot: r() * 3.1, k: 0 }))
    const weed: P[] = scatter(7006, 9, -0.2, 0.0, undefined, 1.6).map((s) => ({ x: s.x, y: ground(s.x, s.z) + 0.01, z: s.z, s: 0.14 + r() * 0.1, rot: r() * 6.28, k: 0.35 }))
    // a few drifts of small pebbles right at the water's edge
    const drift: P[] = []
    for (const c of scatter(7007, 6, -0.45, -0.1, undefined, 2.5))
      for (let i = 0; i < 6; i++) {
        const x = c.x + (r() - 0.5) * 0.7
        const z = c.z + (r() - 0.5) * 0.5
        drift.push({ x, y: ground(x, z) - 0.01, z, s: 0.03 + r() * 0.04, rot: r() * 6.28, k: 0.6 })
      }
    // crabs: two, on open sand at the water's edge
    const crabs = scatter(7008, 2, -0.45, -0.2, { u0: -20, u1: -8, v0: -4, v1: 11 }, 6).map((s) => ({ x: s.x, y: ground(s.x, s.z), z: s.z, rot: r() * 6.28 }))
    return { stones, moss, tufts, shrubs, wood, weed, drift, crabs }
  }, [])

  const stoneGeo = useMemo(() => new IcosahedronGeometry(1, 1), [])
  const stoneMat = useMemo(() => new MeshStandardMaterial({ color: '#b8a98f', roughness: 0.92, flatShading: true }), [])
  const stoneTint = useMemo(() => (i: number) => new Color().setRGB(0.88 + (i % 5) * 0.05, 0.86 + (i % 4) * 0.05, 0.82 + (i % 3) * 0.06), [])
  const mossMat = useMemo(() => new MeshStandardMaterial({ color: '#6f9a45', roughness: 1, flatShading: true }), [])
  const mossTint = useMemo(() => (i: number) => new Color().setRGB(0.85 + (i % 4) * 0.07, 0.9 + (i % 3) * 0.06, 0.75 + (i % 5) * 0.05), [])
  const woodGeo = useMemo(() => {
    const g = new CylinderGeometry(0.045, 0.06, 0.9, 6)
    g.rotateZ(Math.PI / 2)
    return g
  }, [])
  const woodMat = useMemo(() => new MeshStandardMaterial({ color: '#b3a58d', roughness: 0.95, flatShading: true }), [])
  const weedMat = useMemo(() => new MeshStandardMaterial({ color: '#4e6b3a', roughness: 0.9, flatShading: true }), [])
  const shrubGeos = useMemo(() => [shrub({ r: 0.28, seed: 7101, blobs: 3 }), shrub({ r: 0.22, seed: 7102, blobs: 2 })], [])
  const crabGeo = useMemo(() => new SphereGeometry(0.5, 8, 6), [])
  const crabMat = useMemo(() => new MeshStandardMaterial({ color: '#e06a4e', roughness: 0.6 }), [])
  const eyeMat = useMemo(() => new MeshStandardMaterial({ color: '#222222', roughness: 0.4 }), [])

  return (
    <group>
      <Instances geo={stoneGeo} mat={stoneMat} list={data.stones} shadow tint={stoneTint} />
      <Instances geo={stoneGeo} mat={mossMat} list={data.moss} tint={mossTint} />
      <Instances geo={woodGeo} mat={woodMat} list={data.wood} shadow />
      <Instances geo={stoneGeo} mat={weedMat} list={data.weed} />
      <Instances geo={stoneGeo} mat={stoneMat} list={data.drift} tint={stoneTint} />
      <DuneGrass spots={data.tufts} seed={5} />
      {data.shrubs.map((s, i) => (
        <mesh key={i} geometry={shrubGeos[s.k]} material={m.foliage} position={[s.x, s.y, s.z]} scale={s.s} castShadow receiveShadow />
      ))}
      {data.crabs.map((c, i) => (
        <group key={i} position={[c.x, c.y + 0.045, c.z]} rotation={[0, c.rot, 0]} scale={0.17}>
          <mesh geometry={crabGeo} material={crabMat} scale={[1, 0.5, 0.75]} castShadow />
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh geometry={crabGeo} material={crabMat} position={[0.62, 0.02, s * 0.5]} scale={[0.42, 0.3, 0.32]} />
              <mesh geometry={crabGeo} material={eyeMat} position={[0.34, 0.26, s * 0.22]} scale={[0.14, 0.14, 0.14]} />
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}
