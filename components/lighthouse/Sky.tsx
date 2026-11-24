'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Group } from 'three'
import { materials } from '../../lib/lighthouse/materials'

// A few gulls wheeling on the breeze round the tower.

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

export function Sky({ center }: { center: [number, number] }) {
  return (
    <group>
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
