'use client'

import { useMemo } from 'react'
import { ExtrudeGeometry, LatheGeometry, Shape, Vector2 } from 'three'
import { archPath, curvedGableRoof, gabledWalls } from '../../lib/lighthouse/geometry'
import { materials } from '../../lib/lighthouse/materials'
import { COTTAGE_TOWER } from '../../lib/lighthouse/lighthouseTile'
import { ArchedWindow } from './Parts'

// The keeper's cottage: half-timbered plaster walls under a steep clay roof whose slopes sweep out into flared eaves,
// with a slender tower and a curved spire. Ridge runs along z, the main gable faces +z. Local origin: floor centre.

const W = 2.3
const L = 3.0
const RIDGE = 3.35

/** A thin timber beam from a to b, lying on a wall plane */
function Beam({ a, b, t = 0.09, z = 0 }: { a: [number, number]; b: [number, number]; t?: number; z?: number }) {
  const m = materials()
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy)
  return (
    <mesh
      material={m.timber}
      position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z]}
      rotation={[0, 0, Math.atan2(dy, dx)]}
      castShadow
    >
      <boxGeometry args={[len + t * 0.5, t, 0.05]} />
    </mesh>
  )
}

function Spire() {
  const m = materials()
  const geo = useMemo(() => {
    const pts = [new Vector2(0, 0), new Vector2(0.8, 0), new Vector2(0.83, 0.05)]
    const n = 18
    for (let i = 1; i <= n; i++) {
      const s = i / n
      pts.push(new Vector2(Math.max(0.002, 0.76 * Math.pow(1 - s, 1.7)), 0.05 + s * COTTAGE_TOWER.spire))
    }
    const g = new LatheGeometry(pts, 4)
    g.rotateY(Math.PI / 4)
    const uv = g.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 5, uv.getY(i) * 3.2)
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <group position={[0, COTTAGE_TOWER.top, 0]}>
      <mesh geometry={geo} material={m.roof} castShadow receiveShadow />
      <mesh material={m.copper} position={[0, COTTAGE_TOWER.spire + 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.03, 0.4, 8]} />
      </mesh>
      <mesh material={m.copper} position={[0, COTTAGE_TOWER.spire + 0.16, 0]}>
        <sphereGeometry args={[0.05, 12, 8]} />
      </mesh>
    </group>
  )
}

export function Cottage({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const m = materials()
  const roof = useMemo(
    () => curvedGableRoof({ halfSpan: 1.58, height: 2.02, length: L + 0.62, ridge: RIDGE }),
    []
  )
  const walls = useMemo(() => gabledWalls({ width: W, length: L, underside: roof.underside }), [roof])
  const eave = roof.underside(W / 2)

  const towerRoof = useMemo(
    () => curvedGableRoof({ halfSpan: 0.62, height: 0.5, length: 0.95, ridge: 0.5, thickness: 0.08 }),
    []
  )

  const door = useMemo(() => {
    const s = archPath(0.5, 0.86) as Shape
    return new ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 14 })
  }, [])
  const doorFrame = useMemo(() => {
    const s = archPath(0.64, 0.96) as Shape
    return new ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 14 })
  }, [])

  const xFace = W / 2 + 0.035
  const zFace = L / 2 + 0.035
  const tw = 0.74

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* stone footing */}
      <mesh material={m.stone} position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.18, 0.24, L + 0.18]} />
      </mesh>
      <mesh geometry={walls} material={m.plaster} position={[0, 0.02, 0]} castShadow receiveShadow />
      {/* roof: tiled slopes, cream gable trim */}
      <mesh geometry={roof.geo} material={[m.trim, m.roof]} castShadow receiveShadow />

      {/* long wall (+x): framing, two windows and the door */}
      <group position={[xFace, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Beam a={[-L / 2, 0.24]} b={[L / 2, 0.24]} />
        <Beam a={[-L / 2, eave - 0.06]} b={[L / 2, eave - 0.06]} />
        {[-L / 2 + 0.04, -0.47, 0.47, L / 2 - 0.04].map((z) => (
          <Beam key={z} a={[z, 0.2]} b={[z, eave - 0.02]} />
        ))}
        <Beam a={[-L / 2 + 0.05, 0.3]} b={[-0.52, eave - 0.1]} t={0.07} />
        <Beam a={[L / 2 - 0.05, 0.3]} b={[0.52, eave - 0.1]} t={0.07} />
        <group position={[-1.0, 0.5, 0.02]}>
          <ArchedWindow w={0.32} h={0.5} dark />
        </group>
        <group position={[1.0, 0.5, 0.02]}>
          <ArchedWindow w={0.32} h={0.5} dark />
        </group>
        <mesh geometry={doorFrame} material={m.timber} position={[0, 0.2, -0.01]} castShadow />
        <mesh geometry={door} material={m.wood} position={[0, 0.24, 0.02]} />
        <mesh material={m.copper} position={[0.14, 0.62, 0.09]}>
          <sphereGeometry args={[0.025, 8, 6]} />
        </mesh>
      </group>

      {/* main gable (+z): framing, a window, and a round attic light */}
      <group position={[0, 0, zFace]}>
        <Beam a={[-W / 2, 0.24]} b={[W / 2, 0.24]} />
        <Beam a={[-W / 2, eave - 0.06]} b={[W / 2, eave - 0.06]} />
        <Beam a={[-W / 2 + 0.04, 0.2]} b={[-W / 2 + 0.04, eave]} />
        <Beam a={[W / 2 - 0.04, 0.2]} b={[W / 2 - 0.04, eave]} />
        <Beam a={[0.08, 0.2]} b={[0.08, eave]} />
        <Beam a={[0, eave]} b={[0, RIDGE - 0.4]} />
        <Beam a={[-0.75, eave]} b={[-0.06, 2.55]} t={0.07} />
        <Beam a={[0.75, eave]} b={[0.06, 2.55]} t={0.07} />
        <group position={[-0.52, 0.5, 0.02]}>
          <ArchedWindow w={0.34} h={0.52} dark />
        </group>
        <group position={[0.6, 0.5, 0.02]}>
          <ArchedWindow w={0.26} h={0.44} dark />
        </group>
        <mesh material={m.timber} position={[0, 2.05, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.15, 0.035, 8, 24]} />
        </mesh>
        <mesh material={m.glass} position={[0, 2.05, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.02, 20]} />
        </mesh>
      </group>

      {/* back wall (-x): framing and a single window */}
      <group position={[-xFace, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <Beam a={[-L / 2, 0.24]} b={[L / 2, 0.24]} />
        <Beam a={[-L / 2, eave - 0.06]} b={[L / 2, eave - 0.06]} />
        {[-L / 2 + 0.04, -0.55, 0.55, L / 2 - 0.04].map((z) => (
          <Beam key={z} a={[z, 0.2]} b={[z, eave - 0.02]} />
        ))}
        <Beam a={[-0.55, 0.3]} b={[-L / 2 + 0.05, eave - 0.1]} t={0.07} />
        <Beam a={[0.55, 0.3]} b={[L / 2 - 0.05, eave - 0.1]} t={0.07} />
        <group position={[0, 0.5, 0.02]}>
          <ArchedWindow w={0.32} h={0.5} dark />
        </group>
      </group>

      {/* rear gable (-z) */}
      <group position={[0, 0, -zFace]} rotation={[0, Math.PI, 0]}>
        <Beam a={[-W / 2, 0.24]} b={[W / 2, 0.24]} />
        <Beam a={[-W / 2, eave - 0.06]} b={[W / 2, eave - 0.06]} />
        <Beam a={[-W / 2 + 0.04, 0.2]} b={[-W / 2 + 0.04, eave]} />
        <Beam a={[W / 2 - 0.04, 0.2]} b={[W / 2 - 0.04, eave]} />
        <Beam a={[0, eave]} b={[0, RIDGE - 0.4]} />
        <Beam a={[-0.75, eave]} b={[-0.06, 2.55]} t={0.07} />
        <Beam a={[0.75, eave]} b={[0.06, 2.55]} t={0.07} />
        <group position={[0, 0.5, 0.02]}>
          <ArchedWindow w={0.34} h={0.52} dark />
        </group>
        <group position={[0, 1.75, 0.02]}>
          <ArchedWindow w={0.2} h={0.34} dark />
        </group>
      </group>

      {/* the tower rising through the roof, with its own little gables and curved spire */}
      <group position={[COTTAGE_TOWER.x, 0, COTTAGE_TOWER.z]}>
        <mesh material={m.plaster} position={[0, (1.2 + COTTAGE_TOWER.top) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[tw, COTTAGE_TOWER.top - 1.2, tw]} />
        </mesh>
        {[
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1]
        ].map(([sx, sz], i) => (
          <mesh key={i} material={m.timber} position={[(sx * tw) / 2, 3.35, (sz * tw) / 2]} castShadow>
            <boxGeometry args={[0.08, 1.8, 0.08]} />
          </mesh>
        ))}
        <mesh material={m.timber} position={[0, COTTAGE_TOWER.top - 0.04, 0]} castShadow>
          <boxGeometry args={[tw + 0.12, 0.09, tw + 0.12]} />
        </mesh>
        <mesh material={m.timber} position={[0, 3.0, 0]}>
          <boxGeometry args={[tw + 0.04, 0.07, tw + 0.04]} />
        </mesh>
        <group position={[0, 3.32, tw / 2 + 0.01]}>
          <ArchedWindow w={0.22} h={0.4} dark />
        </group>
        <group position={[tw / 2 + 0.01, 3.32, 0]} rotation={[0, Math.PI / 2, 0]}>
          <ArchedWindow w={0.22} h={0.4} dark />
        </group>
        <Spire />
      </group>

      {/* a little gabled dormer on the long slope */}
      <group position={[0.92, 1.62, -0.75]} rotation={[0, Math.PI / 2, 0]}>
        <mesh material={m.plaster} position={[0, 0.28, -0.2]} castShadow>
          <boxGeometry args={[0.62, 0.62, 0.7]} />
        </mesh>
        <mesh geometry={towerRoof.geo} material={[m.trim, m.roof]} position={[0, 0.48, -0.15]} castShadow />
        <group position={[0, 0.08, 0.16]}>
          <ArchedWindow w={0.24} h={0.36} dark />
        </group>
      </group>
    </group>
  )
}
