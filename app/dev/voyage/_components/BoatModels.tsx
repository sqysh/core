'use client'

import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Group,
  Material,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  TubeGeometry,
  Vector2,
  Vector3
} from 'three'
import { rowboatHull } from '../../lighthouse/_lib/geometry'
import { materials, PALETTE } from '../../lighthouse/_lib/materials'
import { grainBump } from '../../lighthouse/_lib/textures'
import { BoatKind } from '../_lib/fleet'

// The three test vessels, built from the diorama's rowboat hull generator and shared material library, at the same
// miniature scale as the lighthouse (the cottage door is 0.86 tall; a deckhand is about 0.4). Bow points along +x.

let extra: ReturnType<typeof buildExtra> | null = null
function buildExtra() {
  const grain = grainBump()
  const paint = (color: string) =>
    new MeshPhysicalMaterial({ color, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.35, bumpMap: grain, bumpScale: 0.1 })
  return {
    red: paint('#c5523c'),
    navy: paint('#24384f'),
    yellow: paint('#e7b43d'),
    orange: paint('#e8783a'),
    skin: new MeshStandardMaterial({ color: '#e9b894', roughness: 0.7 }),
    sail: new MeshStandardMaterial({ color: '#f6f1e4', roughness: 0.92, side: DoubleSide }),
    pennant: new MeshStandardMaterial({ color: PALETTE.teal, roughness: 0.7, side: DoubleSide }),
    metal: new MeshStandardMaterial({ color: '#4b5257', metalness: 0.6, roughness: 0.4 }),
    windshield: new MeshPhysicalMaterial({ color: '#9fc7d4', roughness: 0.05, transmission: 0, transparent: true, opacity: 0.55 })
  }
}
const extras = () => (extra ??= buildExtra())

/** Hull, gunwale rail, stern board and a planked deck, from the shared rowboat hull generator */
function Hull({
  length,
  beam,
  depth,
  paint,
  rail
}: {
  length: number
  beam: number
  depth: number
  paint: Material
  rail: Material
}) {
  const m = materials()
  const parts = useMemo(() => {
    const { geo, rail: railPts, transom } = rowboatHull({ length, beam, depth })
    const railGeo = new TubeGeometry(new CatmullRomCurve3(railPts, true), 140, 0.032, 6, true)
    // stern board: a fan across the opening
    const c = transom.reduce((a, p) => a.add(p), new Vector3()).multiplyScalar(1 / transom.length)
    const pos: number[] = []
    for (let i = 0; i < transom.length - 1; i++)
      pos.push(c.x, c.y, c.z, transom[i].x, transom[i].y, transom[i].z, transom[i + 1].x, transom[i + 1].y, transom[i + 1].z)
    const transomGeo = new BufferGeometry()
    transomGeo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
    transomGeo.computeVertexNormals()
    // deck: the gunwale outline, a little inside and below the rail
    const half = Math.floor(railPts.length / 2)
    const outline = [...railPts.slice(0, half), ...railPts.slice(half)]
    const shape = new Shape(outline.map((p) => new Vector2(p.x * 0.97, -p.z * 0.92)))
    const deckGeo = new ShapeGeometry(shape)
    deckGeo.rotateX(-Math.PI / 2)
    const uv = deckGeo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.9, uv.getY(i) * 0.9)
    return { geo, railGeo, transomGeo, deckGeo }
  }, [length, beam, depth])
  return (
    <group>
      <mesh geometry={parts.geo} material={paint} castShadow receiveShadow />
      <mesh geometry={parts.railGeo} material={rail} castShadow />
      <mesh geometry={parts.transomGeo} material={paint} castShadow />
      <mesh geometry={parts.deckGeo} material={m.boatWood} position={[0, -0.015, 0]} receiveShadow />
    </group>
  )
}

/** A little deckhand: rounded body, head and cap */
function Deckhand({ coat, hat, position, turn = 0 }: { coat: Material; hat: Material; position: [number, number, number]; turn?: number }) {
  const e = extras()
  return (
    <group position={position} rotation={[0, turn, 0]}>
      <mesh material={coat} position={[0, 0.13, 0]} castShadow>
        <capsuleGeometry args={[0.065, 0.12, 6, 12]} />
      </mesh>
      <mesh material={e.skin} position={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.058, 16, 12]} />
      </mesh>
      <mesh material={hat} position={[0, 0.345, 0]} castShadow>
        <sphereGeometry args={[0.062, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={hat} position={[0.04, 0.34, 0]} rotation={[0, 0, -0.15]}>
        <cylinderGeometry args={[0.05, 0.05, 0.012, 12, 1, false, -Math.PI / 2, Math.PI]} />
      </mesh>
    </group>
  )
}

function SpeedBoat() {
  const m = materials()
  const e = extras()
  return (
    <group>
      <Hull length={1.75} beam={0.68} depth={0.28} paint={m.trim} rail={m.teal} />
      {/* a painted waterline stripe */}
      <mesh material={m.teal} position={[-0.05, -0.12, 0]} scale={[0.8, 1, 0.98]}>
        <torusGeometry args={[0.33, 0.012, 6, 48]} />
      </mesh>
      <RoundedBox args={[0.26, 0.2, 0.36]} radius={0.05} smoothness={3} material={m.trim} position={[0.08, 0.09, 0]} castShadow />
      <mesh material={e.windshield} position={[0.24, 0.24, 0]} rotation={[0, 0, -0.55]}>
        <boxGeometry args={[0.015, 0.2, 0.46]} />
      </mesh>
      <RoundedBox args={[0.26, 0.11, 0.48]} radius={0.04} smoothness={3} material={e.red} position={[-0.42, 0.04, 0]} castShadow />
      <RoundedBox args={[0.08, 0.2, 0.48]} radius={0.03} smoothness={3} material={e.red} position={[-0.56, 0.12, 0]} castShadow />
      {/* outboard motor on the transom */}
      <group position={[-0.93, 0.08, 0]}>
        <RoundedBox args={[0.16, 0.22, 0.13]} radius={0.04} smoothness={3} material={e.navy} castShadow />
        <mesh material={e.metal} position={[0.01, -0.2, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.24, 8]} />
        </mesh>
      </group>
      <Deckhand coat={e.navy} hat={e.red} position={[-0.12, 0, 0.1]} />
      <group position={[-0.8, 0.1, -0.24]}>
        <mesh material={e.metal} position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.4, 6]} />
        </mesh>
        <Pennant at={[0, 0.36, 0]} size={0.16} />
      </group>
    </group>
  )
}

function FishingBoat() {
  const m = materials()
  const e = extras()
  const buoys = useMemo(() => [-0.45, 0.0, 0.45].flatMap((x) => [{ x, z: 0.43 }, { x: x - 0.1, z: -0.43 }]), [])
  const stay = useMemo(
    () => new TubeGeometry(new CatmullRomCurve3([new Vector3(0.55, 1.42, 0), new Vector3(-0.95, 0.12, 0)]), 8, 0.006, 4),
    []
  )
  return (
    <group>
      <Hull length={2.3} beam={0.86} depth={0.4} paint={m.teal} rail={m.trim} />
      {/* wheelhouse */}
      <RoundedBox args={[0.62, 0.56, 0.6]} radius={0.05} smoothness={3} material={m.plaster} position={[-0.18, 0.27, 0]} castShadow receiveShadow />
      <RoundedBox args={[0.76, 0.07, 0.74]} radius={0.03} smoothness={3} material={e.red} position={[-0.18, 0.58, 0]} castShadow />
      {[
        { p: [0.135, 0.36, 0] as const, r: 0, s: [0.02, 0.18, 0.44] as const },
        { p: [-0.18, 0.36, 0.305] as const, r: 0, s: [0.4, 0.17, 0.02] as const },
        { p: [-0.18, 0.36, -0.305] as const, r: 0, s: [0.4, 0.17, 0.02] as const }
      ].map((w, i) => (
        <mesh key={i} material={m.glass} position={[...w.p]}>
          <boxGeometry args={[...w.s]} />
        </mesh>
      ))}
      <mesh material={e.red} position={[-0.3, 0.24, 0.31]} castShadow>
        <torusGeometry args={[0.075, 0.022, 8, 20]} />
      </mesh>
      {/* mast, boom and a stay to the stern */}
      <mesh material={m.timber} position={[0.55, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.032, 1.42, 8]} />
      </mesh>
      <mesh material={m.timber} position={[0.32, 0.55, 0]} rotation={[0, 0, 1.0]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 0.6, 6]} />
      </mesh>
      <mesh geometry={stay} material={m.rope} />
      {/* nets piled at the stern, crates and orange buoys */}
      <mesh material={m.rope} position={[-0.75, 0.04, 0.05]} scale={[0.26, 0.09, 0.22]} castShadow>
        <sphereGeometry args={[1, 14, 10]} />
      </mesh>
      <mesh material={m.wood} position={[0.42, 0.06, 0.2]} castShadow>
        <boxGeometry args={[0.16, 0.12, 0.16]} />
      </mesh>
      <mesh material={m.wood} position={[0.4, 0.06, -0.18]} rotation={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.14, 0.12, 0.14]} />
      </mesh>
      {buoys.map((b, i) => (
        <mesh key={i} material={e.orange} position={[b.x, -0.04, b.z]} castShadow>
          <sphereGeometry args={[0.045, 12, 10]} />
        </mesh>
      ))}
      <Deckhand coat={e.yellow} hat={e.yellow} position={[0.2, 0, -0.05]} turn={0.6} />
    </group>
  )
}

/** A triangular sail with some belly in it; `belly` animates as the wind fills it */
function sailGeometry(tack: Vector3, head: Vector3, clew: Vector3, belly: number) {
  const n = 10
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      const a = i / n // up the luff
      const b = j / n // across toward the leech
      const p = tack
        .clone()
        .addScaledVector(head.clone().sub(tack), a)
        .addScaledVector(clew.clone().sub(tack), b * (1 - a))
      p.z += belly * Math.sin(Math.PI * b) * (1 - a * 0.7)
      pos.push(p.x, p.y, p.z)
    }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const k = i * (n + 1) + j
      idx.push(k, k + n + 1, k + 1, k + 1, k + n + 1, k + n + 2)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function Pennant({ at, size }: { at: [number, number, number]; size: number }) {
  const e = extras()
  const ref = useRef<Group>(null)
  const geo = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array([0, size * 0.25, 0, 0, -size * 0.25, 0, -size, 0, 0]), 3))
    g.computeVertexNormals()
    return g
  }, [size])
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = Math.sin(clock.elapsedTime * 6) * 0.35
  })
  return (
    <group ref={ref} position={at}>
      <mesh geometry={geo} material={e.pennant} />
    </group>
  )
}

function SailBoat() {
  const m = materials()
  const e = extras()
  const boom = useRef<Group>(null)
  const MAST_X = 0.32
  const main = useMemo(
    () => sailGeometry(new Vector3(0.02, 0.46, 0), new Vector3(0.02, 2.62, 0), new Vector3(-1.02, 0.46, 0), 0.13),
    []
  )
  const jib = useMemo(
    () => sailGeometry(new Vector3(0.95, 0.12, 0), new Vector3(MAST_X + 0.02, 2.2, 0), new Vector3(0.38, 0.32, 0.05), 0.08),
    []
  )
  useFrame(({ clock }) => {
    // the boom swings gently as the wind fills and spills the sail
    if (boom.current) boom.current.rotation.y = 0.22 + Math.sin(clock.elapsedTime * 0.7) * 0.05
  })
  return (
    <group>
      <Hull length={2.0} beam={0.7} depth={0.33} paint={m.cream} rail={m.timber} />
      <RoundedBox args={[0.62, 0.17, 0.42]} radius={0.06} smoothness={3} material={m.cream} position={[0.02, 0.08, 0]} castShadow />
      <RoundedBox args={[0.64, 0.03, 0.44]} radius={0.015} smoothness={2} material={m.teal} position={[0.02, 0.17, 0]} castShadow />
      {[-0.15, 0.08].map((x) =>
        [0.212, -0.212].map((z) => (
          <mesh key={`${x}${z}`} material={m.glass} position={[x, 0.09, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.01, 12]} />
          </mesh>
        ))
      )}
      {/* mast */}
      <mesh material={m.trim} position={[MAST_X, 1.38, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.03, 2.75, 8]} />
      </mesh>
      <Pennant at={[MAST_X, 2.78, 0]} size={0.22} />
      {/* boom and mainsail swing together from the mast */}
      <group ref={boom} position={[MAST_X, 0, 0]}>
        <mesh material={m.timber} position={[-0.5, 0.45, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 1.06, 6]} />
        </mesh>
        <mesh geometry={main} material={e.sail} castShadow />
      </group>
      <mesh geometry={jib} material={e.sail} castShadow />
      <Deckhand coat={m.teal} hat={m.cream} position={[-0.62, 0, 0.08]} turn={-0.4} />
    </group>
  )
}

export function BoatModel({ kind }: { kind: BoatKind }) {
  if (kind === 'speed') return <SpeedBoat />
  if (kind === 'fishing') return <FishingBoat />
  return <SailBoat />
}
