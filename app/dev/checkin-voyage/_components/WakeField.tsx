'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry } from 'three'
import { foamTexture } from '../../voyage/_components/Wakes'
import { HarborStore } from '../_lib/store'
import { seaAt, swellMask } from '../_lib/waves'
import { VESSEL_CLASS_SPECS } from '../_lib/vessel/classes'

// Readable wakes for every boat making way (an arrival, or a player at the helm), in one instanced draw: a spreading
// V of foam from the stern, a churn of prop wash, and bow waves peeling off both sides, plus a ring of spray wherever
// an anchor goes in or comes out. Puffs ride the swell and are tinted toward the sea's own aqua, so the
// wake melts into the water instead of sitting on it as white patches. Everything scales with speed.

const MAX = 900
const STEP = 0.075

type Puff = { x: number; z: number; vx: number; vz: number; age: number; life: number; s0: number; s1: number; a: number; rot: number; m: number }

export function WakeField({ store }: { store: HarborStore }) {
  const mesh = useRef<InstancedMesh>(null)
  const geo = useMemo(() => {
    const g = new PlaneGeometry(1, 1)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const mat = useMemo(
    () => new MeshBasicMaterial({ map: foamTexture(), transparent: true, depthWrite: false, blending: AdditiveBlending }),
    []
  )
  const puffs = useRef<Puff[]>([])
  const travelled = useRef(new Map<string, { d: number; x: number; z: number }>())
  const dummy = useMemo(() => new Object3D(), [])
  const color = useMemo(() => new Color(), [])

  useFrame(({ clock }, rawDt) => {
    const m = mesh.current
    if (!m) return
    const dt = Math.min(rawDt, 0.05)
    const t = clock.elapsedTime
    const list = puffs.current

    // splashes: a burst of spray thrown outward in a ring, and a churn where it went in
    for (const e of store.events.splice(0)) {
      if (e.kind !== 'splash') continue
      const mask = swellMask(e.x, e.z)
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + Math.random() * 0.4
        const v = (0.35 + Math.random() * 0.3) * e.size * 2.2
        list.push({ x: e.x, z: e.z, vx: Math.cos(a) * v, vz: Math.sin(a) * v, age: 0, life: 1.1 + Math.random() * 0.5, s0: e.size * 0.25, s1: e.size * 0.8, a: 0.5, rot: Math.random() * 6.28, m: mask })
      }
      list.push({ x: e.x, z: e.z, vx: 0, vz: 0, age: 0, life: 1.8, s0: e.size * 0.4, s1: e.size * 1.6, a: 0.55, rot: Math.random() * 6.28, m: mask })
    }

    for (const b of store.boats.values()) {
      if (b.phase !== 'arriving' && b.phase !== 'underway') continue
      const len = VESSEL_CLASS_SPECS[b.who.boat].dims.length
      const fx = Math.sin(b.heading)
      const fz = Math.cos(b.heading)
      const rx = -fz
      const rz = fx
      const sx = b.x - fx * len * 0.5
      const sz = b.z - fz * len * 0.5
      const tr = travelled.current.get(b.id) ?? { d: 0, x: sx, z: sz }
      tr.d += Math.hypot(sx - tr.x, sz - tr.z)
      tr.x = sx
      tr.z = sz
      travelled.current.set(b.id, tr)
      const k = Math.min(1, Math.abs(b.speed) / 2.8)
      // how much swell is here, once per boat per frame (puffs keep it as they drift)
      const mask = swellMask(b.x, b.z)
      while (tr.d > STEP && k > 0.04) {
        tr.d -= STEP
        // the V: puffs either side of the stern, pushed outward
        for (const side of [-1, 1])
          list.push({
            x: sx + rx * side * 0.2,
            z: sz + rz * side * 0.2,
            vx: rx * side * (0.2 + 0.25 * k),
            vz: rz * side * (0.2 + 0.25 * k),
            age: 0,
            life: 3.2 + Math.random() * 0.8,
            s0: 0.16,
            s1: 0.7 + 0.5 * k,
            a: 0.42 * k,
            rot: Math.random() * 6.28,
            m: mask
          })
        // prop wash down the middle
        list.push({
          x: sx - fx * 0.05 + (Math.random() - 0.5) * 0.08,
          z: sz - fz * 0.05 + (Math.random() - 0.5) * 0.08,
          vx: -fx * 0.15 * k,
          vz: -fz * 0.15 * k,
          age: 0,
          life: 2.2,
          s0: 0.24,
          s1: 0.55 + 0.25 * k,
          a: 0.38 * k,
          rot: Math.random() * 6.28,
            m: mask
        })
        // bow waves peeling off forward of midships
        if (Math.random() < 0.6)
          for (const side of [-1, 1])
            list.push({
              x: b.x + fx * len * 0.3 + rx * side * 0.32,
              z: b.z + fz * len * 0.3 + rz * side * 0.32,
              vx: rx * side * (0.35 + 0.3 * k),
              vz: rz * side * (0.35 + 0.3 * k),
              age: 0,
              life: 1.6,
              s0: 0.12,
              s1: 0.42,
              a: 0.32 * k,
              rot: Math.random() * 6.28,
            m: mask
            })
      }
    }
    for (const id of travelled.current.keys()) {
      const b = store.boats.get(id)
      if (!b || (b.phase !== 'arriving' && b.phase !== 'underway')) travelled.current.delete(id)
    }

    let n = 0
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i]
      p.age += dt
      if (p.age >= p.life) {
        list.splice(i, 1)
        continue
      }
      const drag = Math.exp(-dt * 0.8)
      p.vx *= drag
      p.vz *= drag
      p.x += p.vx * dt
      p.z += p.vz * dt
    }
    if (list.length > MAX) list.splice(0, list.length - MAX)
    for (const p of list) {
      const t = p.age / p.life
      const size = p.s0 + (p.s1 - p.s0) * (1 - Math.pow(1 - t, 2))
      const alpha = p.a * Math.min(1, p.age * 8) * Math.pow(1 - t, 1.5)
      dummy.position.set(p.x, seaAt(p.x, p.z, t, p.m).h + 0.012, p.z)
      dummy.rotation.set(0, p.rot + t * 0.4, 0)
      dummy.scale.set(size, 1, size)
      dummy.updateMatrix()
      m.setMatrixAt(n, dummy.matrix)
      // additive: a soft sea-foam aqua, never pure white
      m.setColorAt(n, color.setRGB(0.8 * alpha, 0.93 * alpha, 0.9 * alpha))
      n++
    }
    m.count = n
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[geo, mat, MAX]} frustumCulled={false} renderOrder={3} />
}
