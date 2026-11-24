'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { hydrangea, roundedRock } from '@/lib/harbor/landscapeKit'
import { duneGrass, duneGrassMaterial } from '@/lib/harbor/vegetationKit'
import { materials } from '@/lib/lighthouse/materials'
import { CLIFF } from './cliffLayout'
import { graniteMass, graniteMaterial } from './granite'

/**
 * The cliff under the lighthouse, as seen from the sign-in view behind the island, dressed as a North Shore granite
 * ledge: oversized weathered masses overlapping one another and stepping back up to the shelf top, shelves of rock
 * running down onto the sand, loose stones in the shallows, and coastal grass, moss and a hydrangea or two wherever
 * there's a ledge. The masses are set well into the cliff, so they read as the cliff itself; the island's own rock is
 * left exactly as it is. Shown by the native launch screen's harbor only.
 */

/**
 * A mass, in the cliff's frame: centre, size, a turn about the vertical and a slight tilt, and how mossy its top is.
 * `size` is the outline before the fractures break it back (see graniteMass); GROW turns that into the generator's
 * extent, so the broken masses overlap into one ledge.
 */
type Mass = { at: [number, number, number]; size: [number, number, number]; turn?: number; tilt?: number; moss?: number; seed: number }

const GROW = 1.6

const MASSES: Mass[] = [
  // the foot of the cliff: big, rounded masses on the sand
  { at: [-1.3, 0.58, 0.05], size: [1.65, 1.35, 1.15], turn: 0.22, tilt: 0.05, seed: 701 },
  { at: [0.35, 0.52, 0.12], size: [1.55, 1.2, 1.25], turn: -0.28, tilt: -0.07, seed: 702 },
  { at: [1.45, 0.48, -0.25], size: [1.25, 1.05, 1.45], turn: 0.15, seed: 703 },
  // the middle: masses lying across those, set back a little
  { at: [-0.55, 1.42, -0.05], size: [1.85, 0.95, 1.0], turn: 0.08, tilt: -0.06, moss: 0.7, seed: 704 },
  { at: [0.95, 1.5, -0.28], size: [1.45, 0.9, 1.05], turn: -0.18, tilt: 0.05, moss: 0.6, seed: 705 },
  // the top, under the lighthouse's foot
  { at: [0.05, 2.15, -0.32], size: [2.2, 0.68, 0.85], turn: 0.05, moss: 0.85, seed: 706 },
  // the flank toward the lighthouse's far side
  { at: [-2.45, 0.72, -0.1], size: [1.25, 1.45, 0.95], turn: 0.3, seed: 707 },
  { at: [-2.0, 1.72, -0.22], size: [1.15, 0.85, 0.85], turn: -0.25, moss: 0.75, seed: 708 },
  // shelves running down onto the sand and into the shallows
  { at: [-0.65, 0.1, 0.92], size: [1.35, 0.42, 0.85], turn: 0.3, tilt: 0.04, moss: 0.3, seed: 709 },
  { at: [1.15, 0.02, 1.0], size: [1.05, 0.36, 0.85], turn: -0.35, tilt: -0.05, moss: 0.25, seed: 710 }
]

/** Loose stones on the sand and in the water */
const STONES = [
  { at: [0.35, 0.0, 1.55], r: 0.2, seed: 721 },
  { at: [-1.55, -0.02, 1.4], r: 0.17, seed: 722 },
  { at: [1.95, -0.05, 1.5], r: 0.14, seed: 723 }
]

/** Coastal grass on the ledges: where, and how tall */
const GRASS = [
  { at: [-1.05, 1.88, 0.25], h: 0.3, seed: 731 },
  { at: [0.7, 1.92, 0.12], h: 0.26, seed: 732 },
  { at: [-1.7, 1.22, 0.42], h: 0.28, seed: 733 },
  { at: [0.9, 1.08, 0.55], h: 0.3, seed: 734 },
  { at: [-0.75, 0.3, 1.15], h: 0.22, seed: 735 },
  { at: [1.3, 0.2, 1.2], h: 0.22, seed: 736 },
  { at: [-0.3, 2.48, -0.05], h: 0.32, seed: 737 }
]

/** A hydrangea or two in the shelter of the rock */
const BLOOMS = [
  { at: [-2.05, 2.1, 0.08], size: 0.16, colour: '#8fa8e0', seed: 741 },
  { at: [1.2, 1.95, 0.12], size: 0.13, colour: '#d99ac2', seed: 742 }
]

/** The wind clock the grass material reads; set from the frame loop */
const time = { value: 0 }

export function GraniteCliff() {
  const m = materials()
  const grassMat = useMemo(() => duneGrassMaterial(time), [])
  useFrame(({ clock }) => {
    time.value = clock.elapsedTime
  })
  const masses = useMemo(
    () => MASSES.map((s) => ({ ...s, geo: graniteMass({ w: s.size[0] * GROW, h: s.size[1] * GROW, d: s.size[2] * GROW, seed: s.seed, moss: s.moss ?? 0.45 }) })),
    []
  )
  const stones = useMemo(() => STONES.map((s) => ({ ...s, geo: roundedRock(s.seed, 'gray') })), [])
  const grass = useMemo(() => GRASS.map((g) => ({ ...g, geo: duneGrass(g.seed, g.h, 0.3) })), [])
  const blooms = useMemo(() => BLOOMS.map((b) => ({ ...b, geo: hydrangea(b.seed, b.size, b.colour) })), [])

  return (
    <group position={CLIFF.position} rotation={[0, CLIFF.rotationY, 0]}>
      {masses.map((s) => (
        <mesh
          key={s.seed}
          geometry={s.geo}
          material={graniteMaterial()}
          position={s.at}
          rotation={[0, s.turn ?? 0, s.tilt ?? 0]}
          castShadow
          receiveShadow
        />
      ))}
      {stones.map((s) => (
        <mesh key={s.seed} geometry={s.geo} material={m.boulder} position={s.at as [number, number, number]} scale={s.r} castShadow receiveShadow />
      ))}
      {grass.map((g) => (
        <mesh key={g.seed} geometry={g.geo} material={grassMat} position={g.at as [number, number, number]} castShadow />
      ))}
      {blooms.map((b) => (
        <mesh key={b.seed} geometry={b.geo} material={m.foliage} position={b.at as [number, number, number]} castShadow />
      ))}
    </group>
  )
}
