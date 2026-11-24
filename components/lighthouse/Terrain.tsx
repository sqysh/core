'use client'

import { useMemo } from 'react'
import { boulder, rockSlab } from '../../lib/lighthouse/geometry'
import { materials } from '../../lib/lighthouse/materials'
import { at } from '../../lib/lighthouse/world'

// The lighthouse island's rock: stacked sandstone shelves (a lower one for the cottage, a higher one for the
// lighthouse), stone stairs between them and down to the beach, and boulders along the shore.

type Slab = { u: number; v: number; y: number; h: number; w: number; d: number; rot?: number; seed: number }

const SLABS: Slab[] = [
  // cottage shelf
  { u: -1.8, v: -0.8, y: 0.12, h: 1.0, w: 6.0, d: 5.0, seed: 1 },
  { u: -2.0, v: -1.05, y: 1.06, h: 0.86, w: 5.1, d: 4.5, seed: 2, rot: 0.05 },
  // lower plates stepping down to the sand in front of it
  { u: -0.55, v: 1.35, y: 0.12, h: 0.6, w: 3.4, d: 1.9, seed: 3, rot: -0.1 },
  { u: -3.55, v: 1.15, y: 0.12, h: 0.95, w: 2.7, d: 2.1, seed: 4, rot: 0.2 },
  { u: -2.45, v: 1.75, y: 0.12, h: 0.42, w: 2.0, d: 1.2, seed: 5 },
  { u: -4.75, v: 0.05, y: 0.12, h: 1.35, w: 1.8, d: 2.2, seed: 6, rot: 0.15 },
  { u: -4.7, v: 0.1, y: 1.4, h: 0.5, w: 1.3, d: 1.5, seed: 7, rot: -0.2 },
  // lighthouse shelf
  { u: 0.85, v: -2.75, y: 0.12, h: 1.62, w: 5.0, d: 4.2, seed: 8, rot: 0.08 },
  { u: 0.75, v: -2.85, y: 1.66, h: 0.86, w: 4.1, d: 3.6, seed: 9, rot: -0.06 },
  // right shoulder where the cypresses grow
  { u: 2.65, v: -1.15, y: 0.12, h: 1.1, w: 2.4, d: 2.4, seed: 10, rot: 0.3 },
  // the saddle between the two shelves
  { u: 0.15, v: -0.85, y: 1.0, h: 0.94, w: 2.3, d: 1.9, seed: 11, rot: 0.1 }
]

/** Steps: from the beach up to the cottage shelf, then up to the lighthouse */
const STEPS: Slab[] = [
  { u: 1.25, v: 1.2, y: 0.12, h: 0.55, w: 1.1, d: 0.62, seed: 20, rot: 0.1 },
  { u: 1.2, v: 0.72, y: 0.12, h: 0.95, w: 1.05, d: 0.6, seed: 21, rot: 0.05 },
  { u: 1.12, v: 0.25, y: 0.12, h: 1.4, w: 1.05, d: 0.6, seed: 22 },
  { u: 1.02, v: -0.22, y: 0.12, h: 1.92, w: 1.05, d: 0.6, seed: 23, rot: -0.05 },
  { u: 0.95, v: -1.0, y: 1.9, h: 0.28, w: 0.95, d: 0.6, seed: 24 },
  { u: 0.9, v: -1.4, y: 1.9, h: 0.6, w: 0.95, d: 0.55, seed: 25, rot: 0.05 }
]

const BOULDERS = [
  { u: 0.55, v: 4.35, r: 0.42, seed: 31, y: 0.1 },
  { u: -1.75, v: 3.25, r: 0.2, seed: 32, y: 0.22 },
  { u: 2.6, v: 3.4, r: 0.17, seed: 33, y: 0.15 },
  { u: -3.9, v: 2.5, r: 0.28, seed: 34, y: 0.2 },
  { u: 3.9, v: 0.55, r: 0.24, seed: 35, y: 0.18 },
  { u: 1.0, v: 4.2, r: 0.16, seed: 36, y: 0.05 },
  { u: -5.1, v: 1.4, r: 0.3, seed: 37, y: 0.05 }
]

function SlabMesh({ s }: { s: Slab }) {
  const m = materials()
  const geo = useMemo(() => rockSlab({ w: s.w, d: s.d, h: s.h, seed: s.seed }), [s])
  const [x, z] = at(s.u, s.v)
  // slabs are authored in the screen-aligned frame, so turn them 45° to match it
  return (
    <mesh
      geometry={geo}
      material={m.rock}
      position={[x, s.y, z]}
      rotation={[0, Math.PI / 4 + (s.rot ?? 0), 0]}
      castShadow
      receiveShadow
    />
  )
}

export function Terrain() {
  const m = materials()
  const boulders = useMemo(() => BOULDERS.map((b) => ({ ...b, geo: boulder({ r: b.r, seed: b.seed }) })), [])
  return (
    <group>
      {SLABS.map((s) => (
        <SlabMesh key={s.seed} s={s} />
      ))}
      {STEPS.map((s) => (
        <SlabMesh key={s.seed} s={s} />
      ))}
      {boulders.map((b) => {
        const [x, z] = at(b.u, b.v)
        return <mesh key={b.seed} geometry={b.geo} material={m.boulder} position={[x, b.y, z]} castShadow receiveShadow />
      })}
    </group>
  )
}
