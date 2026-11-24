'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import { BufferGeometry, Vector3 } from 'three'
import { COTTAGE } from '../../lib/lighthouse/lighthouseTile'
import { at } from '../../lib/lighthouse/world'
import { castTo, clingProjector, solidsNear } from '../../lib/harbor/cling'
import { vine, vineMaterial } from '../../lib/harbor/vegetationKit'

// Vines for the established look: spilling over a few sandstone ledges and climbing the cottage's walls. Each is
// grown once, on the first frames after the scene is built, against the real meshes (rock slabs, plaster, roof), so
// it lies on the surface rather than hovering near it. Seeded, so they look the same every load. The QR niche grows
// its own (see QrSign.tsx) from the same kit.

const R = Math.SQRT1_2

export const vineTime = { value: 0 }

/** Spec for one vine, in world space */
type Spec = {
  seed: number
  mode: 'climb' | 'drape' | 'wrap'
  /** Where it roots: a world point, or (u, v) on the diorama frame with the height found by casting down onto rock */
  at: { x: number; y: number; z: number } | { u: number; v: number; top: true }
  dir: [number, number, number]
  length: number
  /** The way the surface faces */
  face: [number, number, number]
  density?: number
  leaf?: number
  hang?: number
  thickness?: number
}

const ROCK_VINES: Spec[] = [
  // spilling over the front edge of the first terrace's upper stones, and the stack behind it
  { seed: 11, mode: 'drape', at: { u: -15.4, v: -5.4, top: true }, dir: [0.25, -0.2, 0.6], length: 1.5, face: [R, 0, R], density: 1.1 },
  { seed: 12, mode: 'drape', at: { u: -14.2, v: -5.5, top: true }, dir: [0.2, -0.3, 0.5], length: 1.0, face: [R, 0, R] },
  { seed: 13, mode: 'drape', at: { u: -13.0, v: -10.9, top: true }, dir: [0.2, -0.2, 0.6], length: 1.7, face: [R, 0, R], density: 1.1 },
  { seed: 15, mode: 'drape', at: { u: -18.9, v: -4.3, top: true }, dir: [-0.2, -0.2, 0.6], length: 1.2, face: [R, 0, R] },
  // a few more, on the cove's low stones and the stack at the harbor's edge
  { seed: 17, mode: 'drape', at: { u: -7.0, v: -9.5, top: true }, dir: [0.2, -0.2, 0.6], length: 1.1, face: [R, 0, R] },
  { seed: 18, mode: 'drape', at: { u: -8.8, v: -13.9, top: true }, dir: [0.1, -0.2, 0.6], length: 1.0, face: [R, 0, R], density: 1.1 },
  { seed: 19, mode: 'drape', at: { u: -11.8, v: -6.2, top: true }, dir: [0.25, -0.2, 0.6], length: 1.3, face: [R, 0, R] }
]

/** The cottage: climbing its right wall from the back corner, and the front gable's left corner */
const COTTAGE_VINES: Spec[] = [
  { seed: 21, mode: 'climb', at: { x: COTTAGE.x + 1.19, y: COTTAGE.y + 0.22, z: COTTAGE.z - 1.15 }, dir: [0, 1, 0.12], length: 1.5, face: [1, 0, 0], density: 1.15, hang: 0.2 },
  { seed: 22, mode: 'climb', at: { x: COTTAGE.x - 0.95, y: COTTAGE.y + 0.22, z: COTTAGE.z + 1.54 }, dir: [0.1, 1, 0], length: 1.15, face: [0, 0, 1], density: 1.1, hang: 0.2 },
  { seed: 23, mode: 'climb', at: { x: COTTAGE.x + 1.19, y: COTTAGE.y + 0.22, z: COTTAGE.z + 0.55 }, dir: [0, 1, -0.1], length: 0.8, face: [1, 0, 0], density: 1, hang: 0.3 }
]

export function Vines() {
  const { scene } = useThree()
  const [geos, setGeos] = useState<BufferGeometry[]>([])
  const frames = useRef(0)
  const mat = useMemo(() => vineMaterial(vineTime), [])
  useFrame(({ clock }) => {
    vineTime.value = clock.elapsedTime
    // let the scene's meshes mount first
    if (frames.current++ !== 4) return
    const rocks = (m: { userData: { rock?: boolean } }) => !!m.userData.rock
    const out: BufferGeometry[] = []
    const grow = (spec: Spec, targets: ReturnType<typeof solidsNear>) => {
      const face = new Vector3(...spec.face)
      let start: Vector3
      if ('u' in spec.at) {
        const [x, z] = at(spec.at.u, spec.at.v)
        const hit = castTo(targets, new Vector3(x, 12, z), new Vector3(0, -1, 0), 20)
        if (!hit) return
        start = hit.point.clone().addScaledVector(face, -0.05)
      } else start = new Vector3(spec.at.x, spec.at.y, spec.at.z)
      out.push(
        vine({
          seed: spec.seed,
          start,
          dir: new Vector3(...spec.dir),
          length: spec.length,
          mode: spec.mode,
          face,
          density: spec.density,
          leaf: spec.leaf,
          hang: spec.hang,
          thickness: spec.thickness,
          cling: clingProjector(targets, face)
        })
      )
    }
    const rockTargets = solidsNear(scene, new Vector3(-12, 2, -4), 14, rocks)
    for (const s of ROCK_VINES) grow(s, rockTargets)
    const cottageTargets = solidsNear(scene, new Vector3(COTTAGE.x, COTTAGE.y + 1.5, COTTAGE.z), 4.5, (m) => !m.userData.rock)
    for (const s of COTTAGE_VINES) grow(s, cottageTargets)
    setGeos(out)
  })
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} material={mat} castShadow userData={{ noCling: true }} />
      ))}
    </group>
  )
}
