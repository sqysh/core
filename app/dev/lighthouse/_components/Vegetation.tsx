'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Group } from 'three'
import { cypress, shrub } from '../_lib/geometry'
import { materials } from '../_lib/materials'
import { at } from '../_lib/world'

// Cypresses and shrubs. Each sways a hair in the breeze, out of step with its neighbours.

const CYPRESSES = [
  { u: 2.3, v: -1.75, y: 1.2, h: 3.5, r: 0.38, seed: 41 },
  { u: 2.95, v: -1.1, y: 1.15, h: 2.8, r: 0.33, seed: 42 },
  { u: 2.55, v: -0.55, y: 1.1, h: 2.15, r: 0.28, seed: 43 },
  { u: 1.95, v: 1.0, y: 0.3, h: 3.05, r: 0.34, seed: 44 },
  { u: 2.45, v: 1.5, y: 0.3, h: 2.35, r: 0.3, seed: 45 },
  { u: 1.75, v: 1.75, y: 0.3, h: 1.8, r: 0.25, seed: 46 },
  { u: -4.6, v: -0.7, y: 1.85, h: 2.3, r: 0.27, seed: 47 },
  { u: -0.75, v: -3.6, y: 1.7, h: 2.6, r: 0.3, seed: 48 }
]

const SHRUBS = [
  { u: -3.9, v: 0.75, y: 1.02, r: 0.32, seed: 51 },
  { u: -4.95, v: 1.25, y: 0.25, r: 0.36, seed: 52 },
  { u: -3.3, v: 1.75, y: 0.5, r: 0.22, seed: 53 },
  { u: -0.6, v: 0.6, y: 1.9, r: 0.24, seed: 54 },
  { u: -0.35, v: -2.0, y: 2.5, r: 0.26, seed: 55 },
  { u: 2.3, v: -2.5, y: 2.48, r: 0.24, seed: 56 },
  { u: 1.75, v: 0.0, y: 0.3, r: 0.22, seed: 57 },
  { u: -1.95, v: 2.85, y: 0.3, r: 0.17, seed: 58, blobs: 2 },
  { u: 0.2, v: 1.8, y: 0.3, r: 0.2, seed: 59, blobs: 2 },
  { u: 3.25, v: -0.2, y: 0.3, r: 0.2, seed: 60, blobs: 2 },
  { u: -3.45, v: -2.4, y: 1.9, r: 0.26, seed: 61 }
]

function Swaying({ seed, children }: { seed: number; children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.9 + seed
    if (ref.current) {
      ref.current.rotation.z = Math.sin(t) * 0.012
      ref.current.rotation.x = Math.sin(t * 0.7 + 1) * 0.008
    }
  })
  return <group ref={ref}>{children}</group>
}

export function Vegetation() {
  const m = materials()
  const trees = useMemo(() => CYPRESSES.map((c) => ({ ...c, geo: cypress({ h: c.h, r: c.r, seed: c.seed }) })), [])
  const shrubs = useMemo(
    () => SHRUBS.map((s) => ({ ...s, geo: shrub({ r: s.r, seed: s.seed, blobs: s.blobs ?? 3 }) })),
    []
  )
  return (
    <group>
      {trees.map((t) => {
        const [x, z] = at(t.u, t.v)
        return (
          <group key={t.seed} position={[x, t.y, z]}>
            <mesh material={m.timber} position={[0, 0.12, 0]} castShadow>
              <cylinderGeometry args={[0.045, 0.06, 0.3, 8]} />
            </mesh>
            <Swaying seed={t.seed}>
              <mesh geometry={t.geo} material={m.foliage} position={[0, 0.16, 0]} castShadow receiveShadow />
            </Swaying>
          </group>
        )
      })}
      {shrubs.map((s) => {
        const [x, z] = at(s.u, s.v)
        return <mesh key={s.seed} geometry={s.geo} material={m.foliage} position={[x, s.y - 0.04, z]} castShadow receiveShadow />
      })}
    </group>
  )
}
