'use client'

import { useFrame } from '@react-three/fiber'
import { memo, useMemo, useRef } from 'react'
import { CanvasTexture, Group, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three'
import { playArrival } from '../_lib/boatAudio'
import { BOAT_DIMS } from '../_lib/boatDims'
import { MOOR_HEADING, pathAt } from '../_lib/harbor'
import { BoatRuntime, HarborStore } from '../_lib/store'
import { seaAt } from '../_lib/waves'
import { VIEW } from '../_lib/view'
import { angleDelta, damp } from '../../voyage/_lib/fleet'
import { Boat } from './boats/Boats'

// Sails each arrival in along its planned route and keeps the moored fleet alive. An arrival comes on at a purposeful
// clip from just off-screen, eases off smoothly over its last stretch, runs straight up into its berth head to wind,
// stops, and settles with a little rock. Everyone rides the same swell the water draws, and moored boats swing
// lazily on their moorings.

/** Cruising speed into the harbor (world units per second) per class */
const CRUISE = { runabout: 3.9, lobster: 3.0, sloop: 2.7 }
/** Deceleration on the approach: v = √(2·a·d) keeps it even all the way to a stop */
const BRAKE = 1.15

function step(b: BoatRuntime, now: number, dt: number, t: number) {
  const phase = b.id.length * 0.37 + b.berth.x * 0.21
  const kind = b.who.boat
  if (b.phase === 'waiting') {
    if (now < b.launchAt) return
    b.phase = 'arriving'
    b.speed = CRUISE[kind]
    // left–right placement for the cue: where it enters relative to the middle of the shot
    playArrival(kind, b.who.index, Math.max(-1, Math.min(1, (b.x - VIEW.target.x) / 22)))
  }
  b.age += dt

  if (b.phase === 'arriving' && b.path) {
    const cruise = CRUISE[kind]
    const remaining = b.path.length - b.s
    const target = Math.min(cruise, Math.sqrt(2 * BRAKE * Math.max(remaining, 0)) + 0.05)
    b.speed += (target - b.speed) * damp(target < b.speed ? 3 : 1.5, dt)
    b.s = Math.min(b.path.length, b.s + b.speed * dt)
    const p = pathAt(b.path, b.s)
    const prev = b.heading
    b.heading += angleDelta(b.heading, p.heading) * damp(6, dt)
    b.turnRate += ((b.heading - prev) / Math.max(dt, 1e-4) - b.turnRate) * damp(3, dt)
    b.x = p.x
    b.z = p.z
    b.rig.hoist = Math.min(1, Math.max(0, (remaining - 1) / 4))
    if (remaining < 0.015) {
      b.phase = 'settling'
      b.settled = 0
      b.speed = 0
      b.rig.moored = true
    }
  }
  if (b.phase === 'settling') {
    b.settled += dt
    if (b.settled > 3) b.phase = 'moored'
  }
  if (b.phase === 'moored' || b.phase === 'settling') {
    const swing = Math.sin(t * 0.21 + phase) * 0.05
    b.heading += angleDelta(b.heading, MOOR_HEADING + swing) * damp(b.phase === 'moored' ? 0.8 : 2, dt)
    b.x = b.berth.x
    b.z = b.berth.z
  }

  // riding the swell: height from the sea, pitch and roll from its slope along and across the hull
  const sea = seaAt(b.x, b.z, t)
  const fx = Math.sin(b.heading)
  const fz = Math.cos(b.heading)
  const slopeAlong = sea.gx * fx + sea.gz * fz
  const slopeAcross = -sea.gx * fz + sea.gz * fx
  const speedNorm = b.phase === 'arriving' ? b.speed / CRUISE[kind] : 0
  const settle = b.phase === 'settling' ? Math.exp(-b.settled * 1.6) : 0
  const idle = 1 - Math.min(1, speedNorm * 1.4)
  const rollTarget =
    -b.turnRate * speedNorm * (kind === 'runabout' ? 0.5 : 0.3) +
    Math.atan(slopeAcross) * 0.8 +
    Math.sin(t * 1.15 + phase) * (0.012 + 0.012 * idle) +
    settle * Math.sin(b.settled * 4.2) * 0.06
  const pitchTarget =
    (kind === 'runabout' ? 0.07 : 0.025) * speedNorm +
    Math.atan(slopeAlong) * 0.8 +
    Math.sin(t * 1.5 + phase * 2) * (0.008 + 0.008 * idle) -
    settle * Math.sin(b.settled * 3.4 + 0.5) * 0.05
  b.roll += (rollTarget - b.roll) * damp(3, dt)
  b.pitch += (pitchTarget - b.pitch) * damp(2.5, dt)
  b.y = sea.h + Math.sin(t * 1.3 + phase) * 0.01
}

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

function Collar({ length, beam }: { length: number; beam: number }) {
  const geo = useMemo(() => {
    const g = new PlaneGeometry(1, 1)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const mat = useMemo(() => new MeshBasicMaterial({ map: collarTexture(), transparent: true, depthWrite: false }), [])
  return <mesh geometry={geo} material={mat} scale={[length * 1.32, 1, beam * 2.1]} position={[0, 0.012, 0]} renderOrder={2} />
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
  const dims = BOAT_DIMS[b.who.boat]
  return (
    <group ref={outer} visible={false}>
      <Collar length={dims.length} beam={dims.beam} />
      <group ref={inner}>
        <Boat kind={b.who.boat} palette={b.who.palette} rig={b.rig} />
      </group>
    </group>
  )
})

export function HarborFleet({ store, ids }: { store: HarborStore; ids: string[] }) {
  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const now = performance.now()
    for (const b of store.boats.values()) step(b, now, dt, clock.elapsedTime)
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
