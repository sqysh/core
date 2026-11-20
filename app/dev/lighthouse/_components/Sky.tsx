'use client'

import { Cloud, Clouds } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Group, MeshBasicMaterial } from 'three'
import { materials } from '../_lib/materials'
import { cloudPuffUrl } from '../_lib/textures'
import { at } from '../_lib/world'

// Soft cumulus puffs drifting around the tower, and a few gulls wheeling on the breeze.

const CLOUDS = [
  // beside the lantern, tucked partly behind the tower
  { u: 2.15, v: -4.2, y: 13.9, seed: 2, scale: 1, bounds: [1.5, 0.32, 0.8] as const },
  // left of the tower, above the cottage spire
  { u: -3.6, v: -1.8, y: 11.2, seed: 5, scale: 0.9, bounds: [1.4, 0.3, 0.8] as const },
  // lower right, the largest
  { u: 3.9, v: -0.9, y: 9.9, seed: 9, scale: 1.1, bounds: [1.7, 0.36, 0.9] as const }
]

function DriftingCloud({ c, i }: { c: (typeof CLOUDS)[number]; i: number }) {
  const ref = useRef<Group>(null)
  const [x, z] = at(c.u, c.v)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime * 0.05 + i * 2
    ref.current.position.set(x + Math.sin(t) * 0.3, c.y + Math.sin(t * 1.7) * 0.06, z + Math.cos(t * 0.8) * 0.2)
  })
  const [bx, by, bz] = c.bounds
  return (
    <group ref={ref} position={[x, c.y, z]} scale={c.scale}>
      {/* a bright, billowing crown over a flatter gray belly */}
      <Cloud seed={c.seed + 50} segments={14} bounds={[bx * 1.15, by * 0.5, bz * 0.9]} position={[0.1, -0.3, 0]} volume={0.85} smallestVolume={0.45} color="#7f8a92" fade={40} growth={1} speed={0.04} opacity={0.85} />
      <Cloud seed={c.seed + 90} segments={12} bounds={[bx, by * 0.6, bz]} position={[0, -0.05, 0]} volume={0.85} smallestVolume={0.4} color="#c9d0d4" fade={40} growth={1} speed={0.05} opacity={0.8} />
      <Cloud seed={c.seed} segments={16} bounds={[bx * 0.85, by, bz * 0.85]} position={[-0.1, 0.25, 0]} volume={0.75} smallestVolume={0.35} color="#ffffff" fade={40} growth={1.2} speed={0.06} opacity={0.95} />
    </group>
  )
}

/** A little gull: a body and two swept wings that flap, made once and shared */
function gullWing(side: 1 | -1) {
  const g = new BufferGeometry()
  // a curved, swept wing with a pointed tip, lying in the xz plane
  const p = [
    0, 0, 0.05,
    0, 0, -0.04,
    side * 0.13, 0.02, -0.02,
    side * 0.13, 0.02, -0.02,
    0, 0, 0.05,
    side * 0.3, -0.03, -0.1
  ]
  g.setAttribute('position', new BufferAttribute(new Float32Array(p), 3))
  g.computeVertexNormals()
  return g
}

function Gull({ radius, height, speed, phase, tilt }: { radius: number; height: number; speed: number; phase: number; tilt: number }) {
  const ref = useRef<Group>(null)
  const left = useRef<Group>(null)
  const right = useRef<Group>(null)
  const m = materials()
  const wings = useMemo(() => ({ l: gullWing(-1), r: gullWing(1) }), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + phase
    if (ref.current) {
      ref.current.position.set(Math.cos(t) * radius, height + Math.sin(t * 2.3) * 0.25, Math.sin(t) * radius * 0.8)
      // face along the circle
      ref.current.rotation.set(0, -t + (speed > 0 ? 0 : Math.PI), tilt)
    }
    // flap in bursts, then glide
    const f = clock.elapsedTime * 7 + phase * 5
    const flap = Math.sin(f) * 0.55 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 0.6 + phase) > 0.35 ? 1 : 0.15)
    if (left.current) left.current.rotation.z = flap
    if (right.current) right.current.rotation.z = -flap
  })
  return (
    <group ref={ref}>
      <group scale={1.5}>
        <mesh material={m.bird} scale={[0.03, 0.025, 0.1]}>
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>
        <group ref={left}>
          <mesh geometry={wings.l} material={m.bird} />
        </group>
        <group ref={right}>
          <mesh geometry={wings.r} material={m.bird} />
        </group>
      </group>
    </group>
  )
}

export function Sky({ center, clouds = true }: { center: [number, number]; clouds?: boolean }) {
  return (
    <group>
      {clouds && (
        <Clouds material={MeshBasicMaterial} texture={cloudPuffUrl()} limit={200}>
          {CLOUDS.map((c, i) => (
            <DriftingCloud key={i} c={c} i={i} />
          ))}
        </Clouds>
      )}
      <group position={[center[0], 0, center[1]]}>
        <Gull radius={4.2} height={13.2} speed={0.28} phase={0} tilt={0.25} />
        <Gull radius={5.1} height={11.6} speed={0.22} phase={2.2} tilt={0.3} />
        <Gull radius={3.6} height={14.8} speed={-0.3} phase={4.1} tilt={-0.25} />
        <Gull radius={5.8} height={9.8} speed={0.18} phase={1.1} tilt={0.2} />
        <Gull radius={4.6} height={15.6} speed={-0.2} phase={3.3} tilt={-0.2} />
      </group>
    </group>
  )
}
