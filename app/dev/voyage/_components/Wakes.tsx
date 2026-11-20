'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace
} from 'three'
import { CRUISE, FleetState, FLEET } from '../_lib/fleet'

// Foam wakes for the whole fleet in one instanced draw: each boat sheds pairs of foam puffs from its stern that
// spread outward into a V, widen and fade, plus a churn of prop wash down the middle. Faster boats leave more.

const PER_BOAT = 140
const MAX = PER_BOAT * FLEET.length
const STEP = 0.09 // world units travelled between puffs

type Puff = { x: number; z: number; vx: number; vz: number; age: number; life: number; s0: number; s1: number; a: number; rot: number }

export function foamTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 62)
  grad.addColorStop(0, 'rgba(255,255,255,0.5)')
  grad.addColorStop(0.55, 'rgba(255,255,255,0.85)')
  grad.addColorStop(0.75, 'rgba(255,255,255,0.35)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  // break the ring up into lacy bubbles
  g.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(0,0,0,${0.3 + Math.random() * 0.5})`
    g.beginPath()
    g.arc(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 7, 0, Math.PI * 2)
    g.fill()
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

export function Wakes({ state, resetKey }: { state: FleetState; resetKey: number }) {
  const mesh = useRef<InstancedMesh>(null)
  const geo = useMemo(() => {
    const g = new PlaneGeometry(1, 1)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const mat = useMemo(
    () =>
      new MeshBasicMaterial({
        map: foamTexture(),
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending
      }),
    []
  )
  const sim = useRef({
    puffs: FLEET.map(() => [] as Puff[]),
    travelled: FLEET.map(() => 0),
    last: FLEET.map(() => ({ x: NaN, z: NaN }))
  })
  const dummy = useMemo(() => new Object3D(), [])
  const color = useMemo(() => new Color(), [])

  useEffect(() => {
    sim.current.puffs.forEach((p) => (p.length = 0))
    sim.current.last.forEach((l) => (l.x = NaN))
  }, [resetKey])

  useFrame((_, rawDt) => {
    const m = mesh.current
    if (!m) return
    const dt = Math.min(rawDt, 0.05)
    const speedNorm = state.speed / CRUISE
    let n = 0

    FLEET.forEach((spec, i) => {
      const b = state.boats[i]
      const puffs = sim.current.puffs[i]
      const last = sim.current.last[i]
      const fx = Math.sin(b.heading)
      const fz = Math.cos(b.heading)
      // starboard
      const rx = -fz
      const rz = fx
      const sternX = b.x - fx * spec.length * 0.48
      const sternZ = b.z - fz * spec.length * 0.48

      if (!Number.isNaN(last.x)) sim.current.travelled[i] += Math.hypot(sternX - last.x, sternZ - last.z)
      last.x = sternX
      last.z = sternZ

      while (sim.current.travelled[i] > STEP && speedNorm > 0.03) {
        sim.current.travelled[i] -= STEP
        const strength = Math.min(1, speedNorm) * spec.wake
        for (const side of [-1, 1]) {
          puffs.push({
            x: sternX + rx * side * 0.16,
            z: sternZ + rz * side * 0.16,
            vx: rx * side * (0.16 + 0.12 * strength),
            vz: rz * side * (0.16 + 0.12 * strength),
            age: 0,
            life: 2.6 + Math.random() * 0.8,
            s0: 0.14,
            s1: 0.55 + 0.35 * strength,
            a: 0.32 * strength,
            rot: Math.random() * Math.PI
          })
        }
        puffs.push({
          x: sternX + (Math.random() - 0.5) * 0.06,
          z: sternZ + (Math.random() - 0.5) * 0.06,
          vx: 0,
          vz: 0,
          age: 0,
          life: 1.6,
          s0: 0.2,
          s1: 0.42 + 0.15 * strength,
          a: 0.3 * strength,
          rot: Math.random() * Math.PI
        })
      }
      if (speedNorm <= 0.03) sim.current.travelled[i] = 0
      while (puffs.length > PER_BOAT) puffs.shift()

      for (let k = puffs.length - 1; k >= 0; k--) {
        const p = puffs[k]
        p.age += dt
        if (p.age >= p.life) {
          puffs.splice(k, 1)
          continue
        }
        // spreading slows as the wave dies away
        const drag = Math.exp(-dt * 0.9)
        p.vx *= drag
        p.vz *= drag
        p.x += p.vx * dt
        p.z += p.vz * dt
      }
      for (const p of puffs) {
        const t = p.age / p.life
        const size = p.s0 + (p.s1 - p.s0) * (1 - Math.pow(1 - t, 2))
        const alpha = p.a * Math.min(1, p.age * 8) * Math.pow(1 - t, 1.6)
        dummy.position.set(p.x, 0.03, p.z)
        dummy.rotation.set(0, p.rot + t * 0.4, 0)
        dummy.scale.set(size, 1, size)
        dummy.updateMatrix()
        m.setMatrixAt(n, dummy.matrix)
        // additive blending: a darker colour is a fainter puff
        m.setColorAt(n, color.setScalar(alpha))
        n++
      }
    })

    m.count = n
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[geo, mat, MAX]} frustumCulled={false} renderOrder={3} />
}
