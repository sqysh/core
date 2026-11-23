'use client'

import { useFrame } from '@react-three/fiber'
import { memo, useMemo, useRef } from 'react'
import { CanvasTexture, Group, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three'
import { BoatRuntime, HarborStore } from '../_lib/store'
import { separate, stepVessel } from '../_lib/vessel/motion'
import { seaTime } from '../_lib/vessel/submerged'
import { Boat } from './boats/Boats'

// Draws the fleet and runs it: every boat steps through the one vessel simulation (vessel/motion.ts) each frame,
// whether the autopilot is bringing a check-in in or a player has the helm, and the scene graph just follows the state.

let collarTex: CanvasTexture | null = null
/** Where hull meets water: a soft darkening around the hull and a thin lace of foam at its edge */
function collarTexture() {
  if (collarTex) return collarTex
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const shade = g.createRadialGradient(128, 128, 40, 128, 128, 128)
  shade.addColorStop(0, 'rgba(8,48,58,0.38)')
  shade.addColorStop(0.62, 'rgba(8,48,58,0.16)')
  shade.addColorStop(1, 'rgba(8,48,58,0)')
  g.fillStyle = shade
  g.fillRect(0, 0, 256, 256)
  const foam = g.createRadialGradient(128, 128, 78, 128, 128, 100)
  foam.addColorStop(0, 'rgba(255,255,255,0)')
  foam.addColorStop(0.45, 'rgba(236,250,246,0.42)')
  foam.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = foam
  g.fillRect(0, 0, 256, 256)
  collarTex = new CanvasTexture(c)
  collarTex.colorSpace = SRGBColorSpace
  return collarTex
}

export function Collar({ length, beam }: { length: number; beam: number }) {
  const geo = useMemo(() => {
    const g = new PlaneGeometry(1, 1)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const mat = useMemo(() => new MeshBasicMaterial({ map: collarTexture(), transparent: true, depthWrite: false }), [])
  return (
    <mesh
      geometry={geo}
      material={mat}
      scale={[length * 1.32, 1, beam * 2.1]}
      position={[0, 0.012, 0]}
      renderOrder={2}
    />
  )
}

const BoatNode = memo(function BoatNode({ b }: { b: BoatRuntime }) {
  const outer = useRef<Group>(null)
  const inner = useRef<Group>(null)
  useFrame(() => {
    const o = outer.current
    if (!o) return
    o.visible = b.phase !== 'waiting'
    // the outer group sits on the water (the collar lies flat on it); the hull rocks inside
    o.position.set(b.x, b.y, b.z)
    o.rotation.set(0, b.heading - Math.PI / 2, 0)
    inner.current?.rotation.set(b.roll, 0, b.pitch)
  })
  const dims = b.who.spec.dims
  return (
    <group ref={outer} visible={false}>
      <Collar length={dims.length} beam={dims.beam} />
      <group ref={inner}>
        <Boat kind={b.who.boat} look={b.who.look} rig={b.rig} name={b.who.name.split(' ')[0]} />
      </group>
    </group>
  )
})

export function HarborFleet({ store, ids }: { store: HarborStore; ids: string[] }) {
  useFrame(({ clock }, rawDt) => {
    seaTime.value = clock.elapsedTime
    const dt = Math.min(rawDt, 0.05)
    const now = performance.now()
    for (const b of store.boats.values()) stepVessel(b, store, now, dt, clock.elapsedTime)
    separate(store)
  })
  return (
    <group>
      {ids.map((id) => {
        const b = store.boats.get(id)
        return b ? <BoatNode key={id} b={b} /> : null
      })}
    </group>
  )
}
