'use client'

import { useFrame } from '@react-three/fiber'
import { ReactNode, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Group } from 'three'
import { ACCESSORY_FITS, AccessoryId } from '@/lib/vessel/catalog'
import { BoatClass } from '../../_lib/identity'
import { VESSEL_CLASS_SPECS, VesselClassSpec } from '../../_lib/vessel/classes'
import { VesselLook } from '../../_lib/vessel/look'
import { kit } from './kit'

// Accessories: swappable pieces that attach at a class's mount points (vessel/classes.ts) and take their colours from
// the member's look. A new accessory is an id in the shared catalog plus an entry here; the hulls never change.

/** A flag on a staff that streams and flutters */
export function Flag({ at, colour, size = 0.13 }: { at: [number, number, number]; colour: string; size?: number }) {
  const k = kit()
  const ref = useRef<Group>(null)
  const geo = useMemo(() => {
    const g = new BufferGeometry()
    const w = size
    const h = size * 0.62
    g.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 0, -h, 0, -w, -h / 2, 0]), 3))
    g.computeVertexNormals()
    return g
  }, [size])
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = Math.sin(clock.elapsedTime * 7 + at[0] * 3) * 0.28 + 0.1
  })
  return (
    <group position={at}>
      <mesh material={k.varnish} position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.006, 0.008, 0.26, 6]} />
      </mesh>
      <group ref={ref}>
        <mesh geometry={geo} material={k.flag(colour)} />
      </group>
    </group>
  )
}

/** A long, narrow pennant at the masthead, streaming aft and snapping in the breeze */
function Burgee({ at, colour, trim }: { at: [number, number, number]; colour: string; trim: string }) {
  const k = kit()
  const ref = useRef<Group>(null)
  const geo = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array([0, 0.03, 0, 0, -0.03, 0, -0.34, 0, 0]), 3))
    g.computeVertexNormals()
    return g
  }, [])
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = Math.sin(clock.elapsedTime * 9 + 1.3) * 0.22 + 0.15
  })
  return (
    <group position={at}>
      <mesh material={k.chrome} position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.12, 5]} />
      </mesh>
      <group ref={ref} position={[0, 0.1, 0]}>
        <mesh geometry={geo} material={k.flag(colour)} />
        <mesh geometry={geo} material={k.flag(trim)} scale={[0.45, 0.45, 1]} position={[-0.005, 0, 0.001]} />
      </group>
    </group>
  )
}

const RENDER: Record<AccessoryId, (spec: VesselClassSpec, look: VesselLook) => ReactNode> = {
  ensign: (spec, look) => <Flag at={spec.mounts.ensign.at} colour={look.accent} size={spec.mounts.ensign.size} />,
  burgee: (spec, look) => (spec.mounts.masthead ? <Burgee at={spec.mounts.masthead} colour={look.accent} trim={look.trim} /> : null)
}

/** Everything a member has fitted, at their class's mounts; anything that doesn't fit the class is left off */
export function Accessories({ kind, look }: { kind: BoatClass; look: VesselLook }) {
  const spec = VESSEL_CLASS_SPECS[kind]
  return (
    <>
      {look.accessories
        .filter((a) => ACCESSORY_FITS[a]?.includes(kind))
        .map((a) => (
          <group key={a}>{RENDER[a](spec, look)}</group>
        ))}
    </>
  )
}
