'use client'

import { useMemo } from 'react'
import { CylinderGeometry, MeshStandardMaterial } from 'three'
import { boulder, cypress, rockSlab, shrub } from '../../lib/lighthouse/geometry'
import { sculptSlab, settle } from '../../lib/harbor/rockKit'
import { duneGrass, duneGrassMaterial, swayMaterial, windsweptPine } from '../../lib/harbor/vegetationKit'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh, Object3D } from 'three'
import { useLayoutEffect, useRef } from 'react'
import { materials } from '../../lib/lighthouse/materials'
import { rng } from '../../lib/lighthouse/noise'
import { at } from '../../lib/lighthouse/world'
import { coastShore, seabed } from '../../lib/harbor/coast'
import { Slab, SLABS, STEPS } from '../../lib/harbor/formations'
import { SEA_LOOK } from '../../lib/harbor/seaLook'
import { NOISE } from '../../lib/harbor/seaSurface'
import { groundHeight, groundSlope, shelter, terrainNoise } from '../../lib/harbor/terrain'

import { BufferAttribute, Color, IcosahedronGeometry, PlaneGeometry } from 'three'
import { grainBump } from '../../lib/lighthouse/textures'
import { noise3, smoothstep } from '../../lib/lighthouse/noise'
import { PALETTE } from '../../lib/lighthouse/materials'
import { COTTAGE } from '../../lib/lighthouse/lighthouseTile'
import { hydrangea } from '../../lib/harbor/landscapeKit'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

// The land around the lighthouse island, built exactly as the island itself was (Terrain.tsx, Vegetation.tsx,
// Props.tsx in the diorama): individual chiselled sandstone slabs stacked into irregular shelves, some capped with
// grass, with stone steps, stepping-stone paths, boulders on the sand and in the shallows, and cypresses and shrubs
// placed one by one. Everything is authored in the diorama's screen-aligned (u, v) frame.

/** Stepping-stone paths winding across the grass terraces */
const WALKS: { from: [number, number]; to: [number, number]; y: number; seed: number }[] = [
  { from: [-10.1, -6.1], to: [-13.4, -8.9], y: 1.92, seed: 3 },
  { from: [-15.2, -11.2], to: [-18.3, -11.8], y: 2.6, seed: 5 },
  { from: [-18.8, -12.2], to: [-18.8, -13.6], y: 3.7, seed: 7 }
]

const BOULDERS = [
  // on the sand
  { u: -6.4, v: -3.4, r: 0.32, seed: 351 },
  { u: -8.2, v: -2.6, r: 0.22, seed: 352 },
  { u: -16.8, v: -2.2, r: 0.38, seed: 353 },
  { u: -4.2, v: -6.6, r: 0.24, seed: 354 },
  { u: -9.4, v: 10.2, r: 0.3, seed: 355 },
  { u: 7.5, v: 5.5, r: 0.55, seed: 356 },
  { u: 8.0, v: 5.9, r: 0.26, seed: 357 },
  { u: 12.2, v: -10.2, r: 0.26, seed: 358 },
  // lying in the shallows, seen through the water
  { u: -7.4, v: -1.2, r: 0.42, seed: 361, sunk: 0.3 },
  { u: -5.0, v: -4.6, r: 0.3, seed: 362, sunk: 0.22 },
  { u: -17.9, v: -0.6, r: 0.5, seed: 363, sunk: 0.35 },
  { u: 6.4, v: 6.6, r: 0.36, seed: 364, sunk: 0.28 },
  { u: 15.4, v: -9.6, r: 0.34, seed: 365, sunk: 0.25 },
  { u: -10.6, v: 11.8, r: 0.4, seed: 366, sunk: 0.3 },
  { u: 4.2, v: 7.4, r: 0.44, seed: 367, sunk: 0.34 },
  // and further out, fading into the deeper water
  { u: -3.2, v: 8.6, r: 0.6, seed: 368, sunk: 0.9 },
  { u: 10.4, v: 2.4, r: 0.7, seed: 369, sunk: 1.1 },
  { u: -13.6, v: 2.2, r: 0.55, seed: 370, sunk: 0.7 },
  { u: 17.2, v: -8.2, r: 0.5, seed: 371, sunk: 0.8 },
  { u: 1.6, v: 9.8, r: 0.36, seed: 372, sunk: 0.5 }
]

const CYPRESSES = [
  { u: -11.9, v: -8.3, y: 1.92, h: 2.6, r: 0.3, seed: 371 },
  { u: -12.4, v: -7.7, y: 1.92, h: 2.1, r: 0.27, seed: 372 },
  { u: -10.6, v: -7.9, y: 1.92, h: 1.7, r: 0.24, seed: 373 },
  { u: -19.4, v: -10.6, y: 3.7, h: 2.9, r: 0.32, seed: 374 },
  { u: -18.6, v: -11.0, y: 3.7, h: 2.3, r: 0.28, seed: 375 },
  { u: -20.4, v: -13.3, y: 4.1, h: 3.0, r: 0.33, seed: 376 },
  { u: -19.7, v: -12.4, y: 4.1, h: 2.4, r: 0.28, seed: 377 },
  { u: -13.6, v: -13.0, y: 2.6, h: 2.6, r: 0.3, seed: 378 },
  { u: -22.3, v: -18.9, y: 4.0, h: 3.2, r: 0.34, seed: 379 },
  { u: -21.5, v: -17.8, y: 4.0, h: 2.5, r: 0.29, seed: 380 },
  { u: -16.6, v: -16.7, y: 2.6, h: 2.3, r: 0.28, seed: 381 },
  { u: -19.1, v: -5.6, y: 1.8, h: 2.2, r: 0.27, seed: 382 },
  { u: 13.1, v: -12.1, y: 2.0, h: 2.3, r: 0.28, seed: 383 },
  { u: 13.8, v: -11.4, y: 2.0, h: 1.7, r: 0.24, seed: 384 },
  { u: -9.2, v: 10.3, y: 0.3, h: 1.5, r: 0.22, seed: 385 }
]

const SHRUBS = [
  { u: -9.0, v: -6.3, y: 1.12, r: 0.26, seed: 391 },
  { u: -13.0, v: -6.9, y: 1.12, r: 0.3, seed: 392 },
  { u: -15.8, v: -6.9, y: 2.3, r: 0.24, seed: 393 },
  { u: -8.2, v: -14.3, y: 1.8, r: 0.26, seed: 394 },
  { u: -12.6, v: -12.9, y: 2.6, r: 0.22, seed: 395 },
  { u: -16.1, v: -3.0, y: 0.92, r: 0.3, seed: 396 },
  { u: -18.1, v: -4.6, y: 1.8, r: 0.24, seed: 397 },
  { u: -7.0, v: -4.0, y: 0.3, r: 0.22, seed: 398, blobs: 2 },
  { u: -17.4, v: -2.7, y: 0.3, r: 0.2, seed: 399, blobs: 2 },
  { u: 14.3, v: -11.0, y: 2.0, r: 0.22, seed: 400 },
  { u: -8.6, v: 10.8, y: 0.3, r: 0.2, seed: 401, blobs: 2 },
  { u: -20.5, v: -18.0, y: 4.0, r: 0.3, seed: 402 }
]

/** How far a slab is set down into whatever it stands on: ground slabs bury their bevel in the sand, stacked ones bed into the shelf below */
const GROUND = 0.12
const sinkOf = (s: Slab) => (s.y <= GROUND ? 0.45 : 0.18)

/** The widest skirt of the stone's rock that the sand around it allows, or none */
function skirtOf(s: Slab, skirt: boolean, x: number, z: number) {
  if (!skirt || s.y > GROUND || groundHeight(x, z) > seabed(x, z) + 0.3) return null
  for (const f of [1.32, 1.22, 1.12]) {
    const reach = (Math.max(s.w, s.d) * f) / 2
    let worst = -Infinity
    for (let a = 0; a < Math.PI * 2; a += 0.35) worst = Math.max(worst, coastShore(x + Math.cos(a) * reach, z + Math.sin(a) * reach))
    if (worst < -0.15) return rockSlab({ w: s.w * f, d: s.d * f, h: 0.7, seed: s.seed + 7, bevel: 0.16, tilt: 0.02 })
  }
  return null
}

function SlabMesh({ s, skirt = true, seat = false }: { s: Slab; skirt?: boolean; seat?: boolean }) {
  const m = materials()
  const [x, z] = at(s.u, s.v)
  // a seated stone (the stairs) reaches down to whatever ground is really under it, its top staying put
  const sink = seat ? Math.max(sinkOf(s), s.y - groundHeight(x, z) + 0.2) : sinkOf(s)
  // each stone sculpted with its own lean, shear and taper; grass takes a different share of each top
  const geo = useMemo(() => {
    const r = rng(s.seed * 3)
    const grass = s.grass === true ? 0.45 + r() * 0.5 : typeof s.grass === 'number' ? s.grass : r() < 0.3 ? 0.15 + r() * 0.25 : 0
    return sculptSlab({ w: s.w, d: s.d, h: s.h + sink, seed: s.seed, wild: s.y > GROUND ? 0.75 : 0.55, grass })
  }, [s, sink])
  // stacked stones settle off-centre and a little askew on the one below, so the stacks interlock rather than tier
  const nudge = useMemo(() => (s.y > GROUND && !seat ? settle(s.seed, Math.min(s.w, s.d)) : { dx: 0, dz: 0, rx: 0, rz: 0, ry: 0 }), [s, seat])
  // a low, wider skirt of the same stone round a stone standing alone on the sand (the mainland's stones rise out of
  // the ground itself and need none) — only as wide as the sand allows, left off where the stone stands in the surf
  const talus = useMemo(() => skirtOf(s, skirt, x, z), [s, skirt, x, z])
  const rot: [number, number, number] = [nudge.rx, Math.PI / 4 + (s.rot ?? 0) + nudge.ry * 0.3, nudge.rz]
  return (
    <group>
      <mesh geometry={geo} material={m.rock} position={[x + nudge.dx, s.y - sink, z + nudge.dz]} rotation={rot} castShadow receiveShadow userData={{ rock: true }} />
      {talus && <mesh geometry={talus} material={m.rock} position={[x, -0.26, z]} rotation={[0, rot[1] + 0.2, 0]} castShadow receiveShadow />}
    </group>
  )
}

function SteppingStones({ from, to, y, seed }: (typeof WALKS)[number]) {
  const m = materials()
  const built = useMemo(() => {
    const r = rng(seed)
    const [ax, az] = at(...from)
    const [bx, bz] = at(...to)
    const len = Math.hypot(bx - ax, bz - az)
    const nx = -(bz - az) / len
    const nz = (bx - ax) / len
    const stones: { x: number; z: number; y: number; s: number; rot: number; tiltX: number; tiltZ: number; stretch: number }[] = []
    const tufts: { x: number; z: number; y: number; s: number; rot: number }[] = []
    // uneven spacing, the line wandering with the ground, each stone its own size, turn and tilt, set into the turf
    for (let d = 0.25 + r() * 0.2; d < len - 0.15; d += 0.3 + r() * 0.3) {
      const t = d / len
      const wander = Math.sin(t * Math.PI * 2.3 + seed) * 0.26 + (r() - 0.5) * 0.16
      const x = ax + (bx - ax) * t + nx * wander
      const z = az + (bz - az) * t + nz * wander
      // each stone bedded into the ground where it lies, tilted with the slope
      const g = groundHeight(x, z)
      const { gx, gz } = groundSlope(x, z)
      stones.push({ x, z, y: g - 0.025 - r() * 0.03, s: 0.14 + r() * 0.1, rot: r() * Math.PI, tiltX: Math.atan(gz) * 0.8 + (r() - 0.5) * 0.08, tiltZ: -Math.atan(gx) * 0.8 + (r() - 0.5) * 0.08, stretch: 0.7 + r() * 0.5 })
      if (r() < 0.45) {
        const side = r() < 0.5 ? -1 : 1
        const tx = x + nx * side * (0.22 + r() * 0.12)
        const tz = z + nz * side * (0.22 + r() * 0.12)
        tufts.push({ x: tx, z: tz, y: groundHeight(tx, tz) - 0.02, s: 0.4 + r() * 0.35, rot: r() * 6.28 })
      }
    }
    return { stones, tufts }
  }, [from, to, seed])
  void y
  const geo = useMemo(() => new CylinderGeometry(1, 1.08, 0.09, 7), [])
  return (
    <group>
      {built.stones.map((s, i) => (
        <mesh key={i} geometry={geo} material={m.stone} position={[s.x, s.y, s.z]} rotation={[s.tiltX, s.rot, s.tiltZ]} scale={[s.s, 1, s.s * s.stretch]} castShadow receiveShadow />
      ))}
      <DuneGrass spots={built.tufts} />
    </group>
  )
}

export type GrassSpot = { x: number; y: number; z: number; s: number; rot: number }
const grassTime = { value: 0 }

/** Clumps of dune grass, one instanced draw, swaying in the wind */
export function DuneGrass({ spots, seed = 1 }: { spots: GrassSpot[]; seed?: number }) {
  const ref = useRef<InstancedMesh>(null)
  const geo = useMemo(() => duneGrass(900 + seed), [seed])
  const mat = useMemo(() => duneGrassMaterial(grassTime), [])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    spots.forEach((p, i) => {
      o.position.set(p.x, p.y, p.z)
      o.rotation.set(0, p.rot, 0)
      o.scale.setScalar(p.s)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [spots])
  useFrame(({ clock }) => {
    grassTime.value = clock.elapsedTime
  })
  if (!spots.length) return null
  return <instancedMesh ref={ref} args={[geo, mat, spots.length]} receiveShadow />
}

/** Windswept pines on the exposed high ground and the islet */
const PINES: { u: number; v: number; y: number; h: number; lean: number; seed: number }[] = [
  { u: -20.4, v: -13.6, y: 4.1, h: 3.0, lean: 0.6, seed: 921 },
  { u: -22.6, v: -19.2, y: 4.0, h: 3.4, lean: 0.55, seed: 922 },
  { u: -16.4, v: -16.9, y: 2.6, h: 2.5, lean: 0.7, seed: 923 },
  { u: -15.9, v: -7.2, y: 2.3, h: 2.2, lean: 0.5, seed: 924 },
  { u: 14.0, v: -12.4, y: 2.0, h: 2.3, lean: 0.75, seed: 925 },
  // stands on the sand just behind and to the left of the trail sign (y 0: the ground height is used), crown clear of the board
  { u: -19.4, v: -6.4, y: 0, h: 2.0, lean: 0.65, seed: 926 }
]

function CoastalVegetation() {
  const m = materials()
  // grass and shrubs grow where the land invites them: grass in clusters on the shore band and between the rocks,
  // shrubs tucked into sheltered hollows, both spilling a little over edges
  const { grass, shrubs } = useMemo(() => {
    const r = rng(931)
    const grass: GrassSpot[] = []
    const shrubs: { x: number; y: number; z: number; s: number; rot: number; k: number }[] = []
    const onTile = (x: number, z: number) => Math.max(Math.abs(x), Math.abs(z)) < 5.2
    // clusters: seed points, then a handful of clumps round each
    for (let k = 0; k < 2600 && grass.length < 150; k++) {
      const [x, z] = at(-32 + r() * 50, -22 + r() * 36)
      const d = coastShore(x, z)
      if (d > -0.25 || onTile(x, z)) continue
      const h = groundHeight(x, z, d)
      const above = h - seabed(x, z, d)
      const { slope } = groundSlope(x, z)
      const shoreBand = smoothstep(-0.25, -0.7, d) * (1 - smoothstep(-1.2, -2.2, d)) * (above < 0.25 ? 1 : 0)
      const crevice = smoothstep(0.3, 0.6, shelter(x, z)) * (above > 0.25 ? 1 : 0)
      const want = Math.max(shoreBand * 0.55, crevice * 0.7) * (1 - smoothstep(0.5, 0.75, slope)) * smoothstep(0.35, 0.6, terrainNoise(x * 0.5, z * 0.5, 96))
      if (r() > want) continue
      const n = 2 + Math.floor(r() * 3)
      for (let j = 0; j < n; j++) {
        const a = r() * Math.PI * 2
        const dd = r() * 0.55
        const gx = x + Math.cos(a) * dd
        const gz = z + Math.sin(a) * dd
        const gd = coastShore(gx, gz)
        if (gd > -0.2) continue
        grass.push({ x: gx, y: groundHeight(gx, gz, gd) - 0.02, z: gz, s: 0.7 + r() * 0.55, rot: r() * 6.28 })
      }
    }
    for (let k = 0; k < 1800 && shrubs.length < 26; k++) {
      const [x, z] = at(-32 + r() * 50, -22 + r() * 36)
      const d = coastShore(x, z)
      if (d > -0.8 || onTile(x, z)) continue
      const h = groundHeight(x, z, d)
      if (h - seabed(x, z, d) < 0.3) continue
      const sh = shelter(x, z)
      const { slope, gx, gz } = groundSlope(x, z)
      if (r() > smoothstep(0.35, 0.7, sh) * (1 - smoothstep(0.45, 0.7, slope))) continue
      // nudge it a touch downhill, so it leans out over the edge below
      const len = Math.hypot(gx, gz) || 1
      shrubs.push({ x: x + (gx / len) * 0.12, y: h - 0.06, z: z + (gz / len) * 0.12, s: 0.7 + r() * 0.6, rot: r() * 6.28, k: k % 2 })
    }
    return { grass, shrubs }
  }, [])
  const shrubGeos = useMemo(() => [shrub({ r: 0.3, seed: 961, blobs: 3 }), shrub({ r: 0.24, seed: 962, blobs: 2 })], [])
  const pines = useMemo(
    () =>
      PINES.map((p) => {
        const pos = at(p.u, p.v)
        return { ...p, y: Math.max(p.y, groundHeight(pos[0], pos[1])), geo: windsweptPine({ seed: p.seed, height: p.h, lean: p.lean }), pos }
      }),
    []
  )
  const leafy = useMemo(() => swayMaterial(new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), grassTime, 0.035), [])
  const sway = useMemo(() => swayMaterial(m.foliage, grassTime, 0.1), [m.foliage])
  return (
    <group>
      <DuneGrass spots={grass} seed={2} />
      {shrubs.map((s, i) => (
        <mesh key={i} geometry={shrubGeos[s.k]} material={sway} position={[s.x, s.y, s.z]} rotation={[0, s.rot, 0]} scale={s.s} castShadow receiveShadow />
      ))}
      {pines.map((p) => (
        <mesh key={p.seed} geometry={p.geo} material={leafy} position={[p.pos[0], p.y - 0.03, p.pos[1]]} castShadow receiveShadow />
      ))}
    </group>
  )
}

/**
 * The cottage's footing on its rocky perch: a dressed-stone plinth cut down into the shelf (so the walls rise out of
 * stone rather than resting on it), a ring of dry-stone edging round the plinth at shelf level, and hydrangeas and
 * shrubs tucked in against the walls. All on the island's own cottage shelf (whose stepping stones already lead from
 * the door).
 */
function CottageFoundation() {
  const m = materials()
  const plinth = useMemo(() => rockSlab({ w: 3.3, d: 4.0, h: 1.0, seed: 501, bevel: 0.06, tilt: 0 }), [])
  const edging = useMemo(() => {
    const r = rng(503)
    const out: { x: number; z: number; y: number; rot: number; s: number }[] = []
    // round the plinth, a course of small stones, a few missing, each a little askew
    const w = 1.95
    const d = 2.3
    const n = 26
    for (let i = 0; i < n; i++) {
      if (r() < 0.12) continue
      const t = (i / n) * 4
      const side = Math.floor(t)
      const f = t - side
      const x = side === 0 ? -w + f * 2 * w : side === 1 ? w : side === 2 ? w - f * 2 * w : -w
      const z = side === 0 ? -d : side === 1 ? -d + f * 2 * d : side === 2 ? d : d - f * 2 * d
      // the island's cottage shelf is a slab turned 45°: keep the stones on it, and leave the door's path clear
      const a = Math.PI / 4 + 0.05
      const lx = x * Math.cos(a) + z * Math.sin(a)
      const lz = -x * Math.sin(a) + z * Math.cos(a)
      if (Math.abs(lx) > 2.15 || Math.abs(lz) > 1.85) continue
      if (x > 1.2 && Math.abs(z) < 0.7) continue
      out.push({ x: COTTAGE.x + x, z: COTTAGE.z + z, y: COTTAGE.y + 0.1, rot: r() * Math.PI, s: 0.8 + r() * 0.45 })
    }
    return out
  }, [])
  const stoneGeo = useMemo(() => new RoundedBoxGeometry(0.28, 0.2, 0.22, 2, 0.05), [])
  const blooms = useMemo(() => [0, 1, 2].map((k) => hydrangea(861 + k, 0.3)), [])
  const bushes = useMemo(() => [shrub({ r: 0.24, seed: 507, blobs: 3 }), shrub({ r: 0.2, seed: 508, blobs: 2 })], [])
  const leafy = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }), [])
  const W = 1.15
  const L = 1.5
  return (
    <group>
      <mesh geometry={plinth} material={m.stoneBase} position={[COTTAGE.x, COTTAGE.y - 0.86, COTTAGE.z]} castShadow receiveShadow />
      {edging.map((e, i) => (
        <mesh key={i} geometry={stoneGeo} material={m.stone} position={[e.x, e.y, e.z]} rotation={[0, e.rot, 0]} scale={e.s} castShadow receiveShadow />
      ))}
      {/* planting against the walls: hydrangeas along the front, shrubs at the back corners */}
      <mesh geometry={blooms[0]} material={leafy} position={[COTTAGE.x + W + 0.35, COTTAGE.y + 0.02, COTTAGE.z - 1.0]} castShadow />
      <mesh geometry={blooms[1]} material={leafy} position={[COTTAGE.x + W + 0.35, COTTAGE.y + 0.02, COTTAGE.z + 1.0]} castShadow />
      <mesh geometry={blooms[2]} material={leafy} position={[COTTAGE.x - 0.4, COTTAGE.y + 0.02, COTTAGE.z + L + 0.4]} castShadow />
      <mesh geometry={bushes[0]} material={m.foliage} position={[COTTAGE.x - W - 0.35, COTTAGE.y, COTTAGE.z - 0.8]} castShadow />
      <mesh geometry={bushes[1]} material={m.foliage} position={[COTTAGE.x + 0.6, COTTAGE.y, COTTAGE.z - L - 0.4]} castShadow />
    </group>
  )
}

// ─── the ground ────────────────────────────────────────────────────────────────

const GRASS = { shade: new Color('#5a8a3b'), mid: new Color('#729f47'), sun: new Color('#9bbb55'), dry: new Color('#a9a95c') }
const STONE = { lit: new Color(PALETTE.rockTop), mid: new Color(PALETTE.rockSide), dark: new Color(PALETTE.rockDeep) }
const PEBBLE = new Color('#b9ad98')
const DIRT = new Color('#c7a97b')
const SAND = new Color(PALETTE.sand)
const WET = new Color(PALETTE.wetSand)

/** Distance to the nearest walk, so worn dirt shows along the paths */
function walkDistance(x: number, z: number) {
  let best = Infinity
  for (const w of WALKS) {
    const [ax, az] = at(...w.from)
    const [bx, bz] = at(...w.to)
    const dx = bx - ax
    const dz = bz - az
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)))
  }
  return best
}

/**
 * The mainland's surface: one mesh over the formations' ground, its colour following the land — grass where it
 * lies gently, exposed sandstone on steep faces and ridges, pebbly patches, worn dirt along the walks, and sand only
 * where it runs down to the water. Cells inside the island's own tile are left to the tile.
 */
function Ground() {
  const mat = useMemo(() => {
    const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, bumpMap: grainBump(), bumpScale: 0.8 })
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vLandW;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLandW = (modelMatrix * vec4(position, 1.0)).xyz;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vLandW;\n${NOISE}`)
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          {
            vec2 p = vLandW.xz;
            float grassy = smoothstep(-0.02, 0.07, diffuseColor.g - diffuseColor.r);
            // grass: broad light and shade, then short blade streaks leaning with the wind
            float mott = snoise(p * 0.5 + 3.0) * 0.6 + snoise(p * 1.6) * 0.4;
            vec2 w = vec2(dot(p, vec2(0.9, 0.44)), dot(p, vec2(-0.44, 0.9)));
            float blades = snoise(vec2(w.x * 7.0, w.y * 1.6)) * 0.6 + snoise(vec2(w.x * 15.0, w.y * 3.2)) * 0.4;
            // sand and dirt: soft dune ripples and a fine speckle
            float dunes = 0.5 + 0.5 * sin((w.x + snoise(p * 0.3) * 1.3) * 4.5);
            float speck = snoise(p * 13.0);
            float g = mott * 0.12 + blades * 0.09;
            float s = (dunes - 0.5) * 0.1 + mott * 0.07 + speck * 0.05;
            diffuseColor.rgb *= 1.0 + mix(s, g, grassy) * ${SEA_LOOK.landTexture.toFixed(2)};
          }`
        )
    }
    return m
  }, [])
  const geo = useMemo(() => {
    const X0 = -34
    const X1 = 10
    const Z0 = -34
    const Z1 = 14
    const step = 0.22
    const nx = Math.round((X1 - X0) / step) + 1
    const nz = Math.round((Z1 - Z0) / step) + 1
    const g = new PlaneGeometry(X1 - X0, Z1 - Z0, nx - 1, nz - 1)
    g.rotateX(-Math.PI / 2)
    g.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2)
    const pos = g.getAttribute('position')
    const uv = g.getAttribute('uv')
    const col = new Float32Array(pos.count * 3)
    const keep: boolean[] = []
    const heights = new Float32Array(pos.count)
    const sandH = new Float32Array(pos.count)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const d = coastShore(x, z)
      const sand = seabed(x, z, d)
      const h = groundHeight(x, z, d)
      heights[i] = h
      sandH[i] = sand
      pos.setY(i, h + 0.012)
      uv.setXY(i, x * 0.4, z * 0.4)
      keep.push(h > sand + 0.02 && Math.max(Math.abs(x), Math.abs(z)) > 4.95)
    }
    g.computeVertexNormals()
    const n = g.getAttribute('normal')
    const c = new Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const above = heights[i] - sandH[i]
      const steep = 1 - smoothstep(0.62, 0.86, n.getY(i))
      const t1 = terrainNoise(x, z, 91)
      const t2 = terrainNoise(x * 0.35, z * 0.35, 92)
      // sand → grass as the land rises off the beach
      c.copy(SAND).lerp(WET, 1 - smoothstep(0.03, 0.14, sandH[i]))
      const grass = GRASS.mid.clone().lerp(GRASS.sun, smoothstep(0.3, 0.8, t1)).lerp(GRASS.shade, smoothstep(0.6, 0.95, terrainNoise(x * 1.3, z * 1.3, 93)) * 0.5).lerp(GRASS.dry, smoothstep(0.55, 0.9, t2) * 0.4)
      c.lerp(grass, smoothstep(0.12, 0.55, above))
      // pebbly patches on the low ground, exposed stone on steep faces and along ridges
      const pebbly = smoothstep(0.62, 0.8, terrainNoise(x * 0.6, z * 0.6, 94)) * (1 - smoothstep(0.5, 1.4, above)) * smoothstep(0.1, 0.4, above)
      c.lerp(PEBBLE, pebbly * 0.7)
      const ridge = smoothstep(0.8, 0.97, 1 - Math.abs(noise3(x * 0.35, 2, z * 0.35, 81))) * smoothstep(0.8, 2, heights[i])
      const stone = STONE.mid.clone().lerp(STONE.dark, 0.5 + 0.5 * Math.sin(heights[i] * 7 + t1 * 3)).lerp(STONE.lit, smoothstep(0.55, 0.8, n.getY(i)) * 0.5)
      c.lerp(stone, Math.max(steep, ridge * 0.8))
      // worn dirt along the walks
      c.lerp(DIRT, (1 - smoothstep(0.28, 0.7, walkDistance(x, z))) * smoothstep(0.1, 0.4, above) * 0.8)
      col.set([c.r, c.g, c.b], i * 3)
    }
    const index = g.getIndex()!
    const kept: number[] = []
    for (let t = 0; t < index.count; t += 3) {
      const a = index.getX(t)
      const b = index.getX(t + 1)
      const e = index.getX(t + 2)
      if (keep[a] || keep[b] || keep[e]) kept.push(a, b, e)
    }
    g.setIndex(kept)
    g.setAttribute('color', new BufferAttribute(col, 3))
    g.computeVertexNormals()
    return g
  }, [])
  return <mesh geometry={geo} material={mat} castShadow receiveShadow />
}

/** Small stones scattered where the ground is pebbly and along the foot of the rocks */
function Pebbles() {
  const spots = useMemo(() => {
    const r = rng(941)
    const out: { x: number; y: number; z: number; s: number; rot: number; tint: number }[] = []
    for (let k = 0; k < 4000 && out.length < 220; k++) {
      const [x, z] = at(-32 + r() * 48, -22 + r() * 36)
      const d = coastShore(x, z)
      if (d > -0.3 || Math.max(Math.abs(x), Math.abs(z)) < 5.2) continue
      const h = groundHeight(x, z, d)
      const above = h - seabed(x, z, d)
      const pebbly = smoothstep(0.62, 0.8, terrainNoise(x * 0.6, z * 0.6, 94)) * (1 - smoothstep(0.5, 1.4, above))
      const nearRock = SLABS.some((s) => Math.hypot(...(([sx, sz]) => [sx - x, sz - z])(at(s.u, s.v))) < Math.max(s.w, s.d) * 0.62 + 0.5)
      if (r() > Math.max(pebbly, nearRock ? 0.25 : 0) * 0.6) continue
      out.push({ x, y: h, z, s: 0.045 + r() * 0.07, rot: r() * 6.28, tint: 0.8 + r() * 0.4 })
    }
    return out
  }, [])
  const geo = useMemo(() => new IcosahedronGeometry(1, 1), [])
  const mat = useMemo(() => new MeshStandardMaterial({ color: '#b9ad98', roughness: 0.9, flatShading: true }), [])
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    const c = new Color()
    spots.forEach((p, i) => {
      o.position.set(p.x, p.y, p.z)
      o.rotation.set(0, p.rot, 0)
      o.scale.set(p.s, p.s * 0.6, p.s * (0.8 + (i % 3) * 0.15))
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      mesh.setColorAt(i, c.setScalar(p.tint))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [spots])
  if (!spots.length) return null
  return <instancedMesh ref={ref} args={[geo, mat, spots.length]} receiveShadow />
}

const FLOWER_COLOURS = ['#f4c84e', '#f28fb0', '#fbf6ec', '#b79ae6']

/** A few small wildflower patches on sheltered, gentle ground */
function Wildflowers() {
  const { spots, colours } = useMemo(() => {
    const r = rng(951)
    const out: { x: number; y: number; z: number; s: number }[] = []
    const cols: Color[] = []
    const patches = [
      { u: -12.6, v: -8.6, hue: 0 },
      { u: -17.8, v: -12.2, hue: 1 },
      { u: -22.4, v: -17.4, hue: 2 },
      { u: -10.2, v: -12.2, hue: 3 },
      { u: -14.6, v: -5.0, hue: 1 }
    ]
    for (const p of patches) {
      const base = new Color(FLOWER_COLOURS[p.hue])
      for (let k = 0; k < 26; k++) {
        const a = r() * Math.PI * 2
        const dd = Math.sqrt(r()) * 1.1
        const [x, z] = at(p.u + Math.cos(a) * dd, p.v + Math.sin(a) * dd)
        const d = coastShore(x, z)
        if (d > -0.6) continue
        const h = groundHeight(x, z, d)
        if (h - seabed(x, z, d) < 0.2 || groundSlope(x, z).slope > 0.45) continue
        out.push({ x, y: h + 0.04, z, s: 0.6 + r() * 0.5 })
        cols.push(base.clone().multiplyScalar(0.85 + r() * 0.3))
      }
    }
    return { spots: out, colours: cols }
  }, [])
  const geo = useMemo(() => new IcosahedronGeometry(0.06, 0), [])
  const mat = useMemo(() => new MeshStandardMaterial({ roughness: 0.6, emissive: new Color('#ffffff'), emissiveIntensity: 0.05 }), [])
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    spots.forEach((p, i) => {
      o.position.set(p.x, p.y, p.z)
      o.scale.setScalar(p.s)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      mesh.setColorAt(i, colours[i])
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [spots, colours])
  if (!spots.length) return null
  return <instancedMesh ref={ref} args={[geo, mat, spots.length]} />
}

export function Landscape() {
  const m = materials()
  const boulders = useMemo(
    () =>
      BOULDERS.map((b) => {
        const [x, z] = at(b.u, b.v)
        const ground = Math.max(-0.45, seabed(x, z))
        return { ...b, x, z, y: ground - (b.sunk ?? b.r * 0.32), geo: boulder({ r: b.r, seed: b.seed }) }
      }),
    []
  )
  const trees = useMemo(
    () =>
      CYPRESSES.map((c) => {
        const pos = at(c.u, c.v)
        return { ...c, y: Math.max(c.y, groundHeight(pos[0], pos[1])), geo: cypress({ h: c.h, r: c.r, seed: c.seed }), pos }
      }),
    []
  )
  const shrubs = useMemo(
    () =>
      SHRUBS.map((s) => {
        const pos = at(s.u, s.v)
        return { ...s, y: Math.max(s.y, groundHeight(pos[0], pos[1])), geo: shrub({ r: s.r, seed: s.seed, blobs: s.blobs ?? 3 }), pos }
      }),
    []
  )
  const treeSway = useMemo(() => swayMaterial(m.foliage, grassTime, 0.022), [m.foliage])
  const shrubSway = useMemo(() => swayMaterial(m.foliage, grassTime, 0.1), [m.foliage])
  return (
    <group>
      <Ground />
      <Pebbles />
      <Wildflowers />
      <CottageFoundation />
      <CoastalVegetation />
      {SLABS.map((s) => (
        <SlabMesh key={s.seed} s={s} />
      ))}
      {STEPS.map((s) => (
        <SlabMesh key={s.seed} s={s} skirt={false} seat />
      ))}
      {WALKS.map((w) => (
        <SteppingStones key={w.seed} {...w} />
      ))}
      {boulders.map((b) => (
        <mesh key={b.seed} geometry={b.geo} material={m.boulder} position={[b.x, b.y, b.z]} castShadow receiveShadow />
      ))}
      {trees.map((t) => (
        <group key={t.seed} position={[t.pos[0], t.y, t.pos[1]]}>
          <mesh material={m.timber} position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.06, 0.3, 8]} />
          </mesh>
          <mesh geometry={t.geo} material={treeSway} position={[0, 0.16, 0]} castShadow receiveShadow />
        </group>
      ))}
      {shrubs.map((s) => (
        <mesh key={s.seed} geometry={s.geo} material={shrubSway} position={[s.pos[0], s.y - 0.04, s.pos[1]]} castShadow receiveShadow />
      ))}
    </group>
  )
}
