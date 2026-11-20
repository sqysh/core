'use client'

import { useMemo } from 'react'
import { boulder, cypress, rockSlab, shrub } from '../../lighthouse/_lib/geometry'
import { materials } from '../../lighthouse/_lib/materials'

// Rock, trees and shrubs for the new tiles, sculpted with the lighthouse island's own generators and materials.
// The sand under them comes from the world shoreline. Positions are world coordinates.

type Slab = { x: number; z: number; y?: number; w: number; d: number; h: number; rot: number; seed: number }

const SLABS: Slab[] = [
  // north-east islet: a stacked rock with a cap
  { x: 9.9, z: -0.5, w: 2.1, d: 1.7, h: 0.95, rot: 0.35, seed: 201 },
  { x: 9.75, z: -0.65, y: 1.0, w: 1.35, d: 1.1, h: 0.7, rot: -0.2, seed: 202 },
  { x: 10.85, z: 0.05, w: 0.95, d: 0.8, h: 0.5, rot: 0.8, seed: 203 },
  // south-west coast, along the west side…
  { x: -3.3, z: 7.2, w: 2.0, d: 1.8, h: 1.05, rot: 0.2, seed: 211 },
  { x: -3.4, z: 9.1, w: 1.9, d: 2.2, h: 1.45, rot: -0.15, seed: 212 },
  { x: -3.35, z: 9.0, y: 1.45, w: 1.3, d: 1.5, h: 0.6, rot: 0.3, seed: 213 },
  { x: -3.2, z: 11.3, w: 2.2, d: 2.0, h: 1.2, rot: 0.1, seed: 214 },
  // …and round the south side
  { x: -1.1, z: 13.1, w: 2.5, d: 1.7, h: 1.0, rot: -0.1, seed: 215 },
  { x: 1.5, z: 13.2, w: 2.2, d: 1.5, h: 0.75, rot: 0.15, seed: 216 },
  { x: 1.4, z: 13.3, y: 0.75, w: 1.3, d: 0.95, h: 0.45, rot: -0.25, seed: 217 },
  { x: 3.3, z: 12.95, w: 1.15, d: 0.95, h: 0.5, rot: 0.5, seed: 218 }
]

const BOULDERS = [
  { x: 8.7, z: 3.4, r: 0.5, y: 0.05, seed: 221 },
  { x: 9.15, z: 3.75, r: 0.22, y: 0.0, seed: 222 },
  { x: 11.25, z: -0.95, r: 0.26, y: 0.1, seed: 223 },
  { x: 8.6, z: -0.9, r: 0.22, y: 0.1, seed: 224 },
  { x: 9.85, z: 10.55, r: 0.3, y: 0.18, seed: 225 },
  { x: -1.85, z: 7.05, r: 0.3, y: 0.15, seed: 226 },
  { x: -1.45, z: 11.95, r: 0.34, y: 0.15, seed: 227 },
  { x: 3.95, z: 12.3, r: 0.24, y: 0.12, seed: 228 }
]

const CYPRESSES = [
  { x: 9.6, z: -0.85, y: 1.65, h: 2.3, r: 0.27, seed: 231 },
  { x: 10.1, z: -0.4, y: 1.6, h: 1.7, r: 0.22, seed: 232 },
  { x: -3.6, z: 10.4, y: 1.25, h: 2.9, r: 0.32, seed: 233 },
  { x: -3.0, z: 10.85, y: 1.2, h: 2.2, r: 0.27, seed: 234 },
  { x: -0.3, z: 13.55, y: 1.0, h: 2.5, r: 0.3, seed: 235 },
  { x: 0.35, z: 13.3, y: 0.9, h: 1.8, r: 0.24, seed: 236 },
  { x: 8.95, z: 10.5, y: 0.3, h: 1.4, r: 0.2, seed: 237 }
]

const SHRUBS = [
  { x: 10.6, z: 0.45, y: 0.3, r: 0.24, seed: 241 },
  { x: 9.0, z: -0.15, y: 0.3, r: 0.2, seed: 242 },
  { x: -2.35, z: 8.1, y: 0.3, r: 0.3, seed: 243 },
  { x: -2.2, z: 12.4, y: 0.3, r: 0.26, seed: 244 },
  { x: 2.5, z: 12.55, y: 0.3, r: 0.24, seed: 245 },
  { x: -3.7, z: 6.15, y: 0.3, r: 0.22, seed: 246 },
  { x: 9.35, z: 10.15, y: 0.3, r: 0.22, seed: 247, blobs: 2 },
  { x: -3.3, z: 7.3, y: 1.12, r: 0.22, seed: 248 }
]

export function WorldTerrain() {
  const m = materials()
  const geos = useMemo(
    () => ({
      slabs: SLABS.map((s) => rockSlab({ w: s.w, d: s.d, h: s.h, seed: s.seed })),
      boulders: BOULDERS.map((b) => boulder({ r: b.r, seed: b.seed })),
      trees: CYPRESSES.map((c) => cypress({ h: c.h, r: c.r, seed: c.seed })),
      shrubs: SHRUBS.map((s) => shrub({ r: s.r, seed: s.seed, blobs: s.blobs ?? 3 }))
    }),
    []
  )
  return (
    <group>
      {SLABS.map((s, i) => (
        <mesh key={s.seed} geometry={geos.slabs[i]} material={m.rock} position={[s.x, s.y ?? 0.12, s.z]} rotation={[0, s.rot, 0]} castShadow receiveShadow />
      ))}
      {BOULDERS.map((b, i) => (
        <mesh key={b.seed} geometry={geos.boulders[i]} material={m.boulder} position={[b.x, b.y, b.z]} castShadow receiveShadow />
      ))}
      {CYPRESSES.map((c, i) => (
        <group key={c.seed} position={[c.x, c.y, c.z]}>
          <mesh material={m.timber} position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.055, 0.28, 8]} />
          </mesh>
          <mesh geometry={geos.trees[i]} material={m.foliage} position={[0, 0.15, 0]} castShadow receiveShadow />
        </group>
      ))}
      {SHRUBS.map((s, i) => (
        <mesh key={s.seed} geometry={geos.shrubs[i]} material={m.foliage} position={[s.x, s.y - 0.04, s.z]} castShadow receiveShadow />
      ))}
    </group>
  )
}
