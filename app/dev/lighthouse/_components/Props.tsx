'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  TubeGeometry,
  Vector3
} from 'three'
import { rowboatHull, sagCurve } from '../_lib/geometry'
import { materials } from '../_lib/materials'
import { COTTAGE, COTTAGE_TOWER, LIGHTHOUSE, lighthouseShore, TOWER, towerRadius } from '../_lib/lighthouseTile'
import { beachHeight } from '../_lib/shore'
import { rng } from '../_lib/noise'
import { at } from '../_lib/world'

// The small things that make the island lived-in: the rowboat and its oars, wooden posts with rope rails, a
// stepping-stone path and the strings of lights slung from the lighthouse.

function Rowboat({ u, v, yaw }: { u: number; v: number; yaw: number }) {
  const m = materials()
  const [x, z] = at(u, v)
  // resting on the wet sand with its keel just bedded in
  const y = Math.max(0, beachHeight(lighthouseShore, x, z)) + 0.3
  const { geo, rail, transom } = useMemo(() => rowboatHull({}), [])
  const railGeo = useMemo(() => new TubeGeometry(new CatmullRomCurve3(rail, true), 120, 0.028, 6, true), [rail])
  const transomGeo = useMemo(() => {
    // a fan across the stern opening
    const c = transom.reduce((a, p) => a.add(p), new Vector3()).multiplyScalar(1 / transom.length)
    const pos: number[] = []
    for (let i = 0; i < transom.length - 1; i++) pos.push(c.x, c.y, c.z, transom[i].x, transom[i].y, transom[i].z, transom[i + 1].x, transom[i + 1].y, transom[i + 1].z)
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
    g.computeVertexNormals()
    return g
  }, [transom])
  return (
    <group position={[x, y, z]} rotation={[0.04, yaw, -0.09]} scale={1.3}>
      <mesh geometry={geo} material={m.boatWood} castShadow receiveShadow />
      <mesh geometry={railGeo} material={m.timber} castShadow />
      <mesh geometry={transomGeo} material={m.wood} castShadow />
      {[-0.35, 0.18].map((bx) => (
        <mesh key={bx} material={m.wood} position={[bx, -0.06, 0]} castShadow>
          <boxGeometry args={[0.16, 0.035, 0.5 - Math.abs(bx) * 0.1]} />
        </mesh>
      ))}
      {/* oars resting across the thwarts */}
      {[0.09, -0.11].map((oz, i) => (
        <group key={i} position={[-0.05, 0.0, oz]} rotation={[0, 0.12 * (i ? -1 : 1), Math.PI / 2 + 0.06]}>
          <mesh material={m.wood} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 1.25, 6]} />
          </mesh>
          <mesh material={m.wood} position={[0, 0.68, 0]} castShadow>
            <boxGeometry args={[0.09, 0.3, 0.018]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Post({ x, y, z, h, r = 0.055, cross = false }: { x: number; y: number; z: number; h: number; r?: number; cross?: boolean }) {
  const m = materials()
  return (
    <group position={[x, y, z]}>
      <mesh material={m.timber} position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[r * 0.85, r, h, 8]} />
      </mesh>
      <mesh material={m.timber} position={[0, h + 0.02, 0]} castShadow>
        <sphereGeometry args={[r * 0.95, 8, 6]} />
      </mesh>
      {cross && (
        <mesh material={m.timber} position={[0, h * 0.72, 0]} rotation={[0, Math.PI / 4, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[r * 0.7, r * 0.7, 0.62, 8]} />
        </mesh>
      )}
    </group>
  )
}

function Rope({ a, b, sag, r = 0.016 }: { a: Vector3; b: Vector3; sag: number; r?: number }) {
  const m = materials()
  const geo = useMemo(() => new TubeGeometry(sagCurve(a, b, sag), 32, r, 5, false), [a, b, sag, r])
  return <mesh geometry={geo} material={m.rope} castShadow />
}

const BULB_COLORS = ['#ffd9a0', '#ff8a5c', '#ffe7b8', '#ffc56b', '#9fe3d8']

/** A rope with glowing bulbs that twinkle gently */
function StringLights({ a, b, sag, spacing = 0.5 }: { a: Vector3; b: Vector3; sag: number; spacing?: number }) {
  const curve = useMemo(() => sagCurve(a, b, sag, 40), [a, b, sag])
  const bulbs = useMemo(() => {
    const n = Math.max(2, Math.floor(curve.getLength() / spacing))
    return Array.from({ length: n - 1 }, (_, i) => curve.getPointAt((i + 1) / n))
  }, [curve, spacing])
  const mats = useMemo(
    () =>
      BULB_COLORS.map(
        (c) => new MeshStandardMaterial({ color: c, emissive: new Color(c), emissiveIntensity: 2.2, roughness: 0.3 })
      ),
    []
  )
  const bulbGeo = useMemo(() => new CylinderGeometry(0.03, 0.05, 0.11, 10), [])
  const refs = useRef<(Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    mats.forEach((mat, i) => (mat.emissiveIntensity = 1.9 + 0.5 * Math.sin(t * 1.3 + i * 1.7)))
    refs.current.forEach((b, i) => b && (b.rotation.z = Math.sin(t * 1.1 + i) * 0.08))
  })
  return (
    <group>
      <Rope a={a} b={b} sag={sag} r={0.013} />
      {bulbs.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          geometry={bulbGeo}
          material={mats[i % mats.length]}
          position={[p.x, p.y - 0.07, p.z]}
        />
      ))}
    </group>
  )
}

function SteppingStones({ from, to, y, seed, size = 0.17 }: { from: [number, number]; to: [number, number]; y: number; seed: number; size?: number }) {
  const m = materials()
  const stones = useMemo(() => {
    const r = rng(seed)
    const n = Math.max(2, Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]) / (size * 2.2)))
    return Array.from({ length: n }, (_, i) => {
      const t = (i + 0.5) / n
      const wob = Math.sin(t * Math.PI * 2 + seed) * 0.18
      const dx = to[0] - from[0]
      const dz = to[1] - from[1]
      const len = Math.hypot(dx, dz)
      return {
        x: from[0] + dx * t + (-dz / len) * wob + (r() - 0.5) * 0.06,
        z: from[1] + dz * t + (dx / len) * wob + (r() - 0.5) * 0.06,
        s: size * (0.8 + r() * 0.4),
        rot: r() * Math.PI
      }
    })
  }, [from, to, seed, size])
  const geo = useMemo(() => new CylinderGeometry(1, 1.06, 0.06, 9), [])
  return (
    <group>
      {stones.map((s, i) => (
        <mesh key={i} geometry={geo} material={m.stone} position={[s.x, y + 0.02, s.z]} rotation={[0, s.rot, 0]} scale={[s.s, 1, s.s * 0.85]} receiveShadow castShadow />
      ))}
    </group>
  )
}

export function Props() {
  // string-light anchors: the two beam ends on the tower, the cottage spire, a tall post by the cypresses
  const anchors = useMemo(() => {
    const r = towerRadius(TOWER.beamY) + 0.95
    const beam = (a: number) =>
      new Vector3(LIGHTHOUSE.x + Math.sin(a) * r, LIGHTHOUSE.y + TOWER.beamY - 0.02, LIGHTHOUSE.z + Math.cos(a) * r)
    const [px, pz] = at(2.0, -0.2)
    return {
      left: beam(-Math.PI / 4),
      right: beam((3 * Math.PI) / 4),
      spire: new Vector3(COTTAGE.x + COTTAGE_TOWER.x, COTTAGE.y + COTTAGE_TOWER.top + COTTAGE_TOWER.spire * 0.55, COTTAGE.z + COTTAGE_TOWER.z),
      post: new Vector3(px, 1.2 + 1.55, pz),
      postBase: [px, pz] as const
    }
  }, [])

  // rope rail beside the stairs
  const rail = useMemo(
    () =>
      [
        { u: 1.82, v: 1.45, y: 0.3, h: 0.62 },
        { u: 1.75, v: 0.55, y: 0.3, h: 1.35 },
        { u: 1.62, v: -0.35, y: 1.15, h: 1.05 }
      ].map((p) => {
        const [x, z] = at(p.u, p.v)
        return { x, z, y: p.y, h: p.h, top: new Vector3(x, p.y + p.h - 0.06, z) }
      }),
    []
  )

  const [stairTopX, stairTopZ] = at(0.85, -0.45)
  const door: [number, number] = [COTTAGE.x + 1.45, COTTAGE.z - 0.05]
  const [ltStepX, ltStepZ] = at(0.85, -1.75)
  const lhDoor: [number, number] = [LIGHTHOUSE.x + Math.sin(0.35) * 2.15, LIGHTHOUSE.z + Math.cos(0.35) * 2.15]
  const [beachA, beachAz] = at(1.4, 1.75)
  const [beachB, beachBz] = at(3.0, 2.6)
  const [crossX, crossZ] = at(3.75, 1.05)

  return (
    <group>
      <Rowboat u={3.5} v={2.4} yaw={-0.35} />
      <Post x={crossX} y={0.22} z={crossZ} h={1.15} cross />
      <Post x={anchors.postBase[0]} y={1.18} z={anchors.postBase[1]} h={1.62} r={0.06} />

      {rail.map((p, i) => (
        <Post key={i} x={p.x} y={p.y} z={p.z} h={p.h} r={0.045} />
      ))}
      <Rope a={rail[0].top} b={rail[1].top} sag={0.16} />
      <Rope a={rail[1].top} b={rail[2].top} sag={0.14} />

      <StringLights a={anchors.left} b={anchors.spire} sag={0.9} />
      <StringLights a={anchors.right} b={anchors.post} sag={0.7} />

      <SteppingStones from={[stairTopX, stairTopZ]} to={door} y={COTTAGE.y} seed={3} />
      <SteppingStones from={[ltStepX, ltStepZ]} to={lhDoor} y={LIGHTHOUSE.y} seed={5} size={0.15} />
      <SteppingStones from={[beachA, beachAz]} to={[beachB, beachBz]} y={0.3} seed={7} size={0.19} />
    </group>
  )
}
