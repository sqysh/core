'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { QRCodeSVG } from 'qrcode.react'
import { ReactNode, useLayoutEffect, useMemo, useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NearestFilter,
  Object3D,
  SRGBColorSpace,
  Vector3
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { boulder, shrub } from '../../lighthouse/_lib/geometry'
import { materials } from '../../lighthouse/_lib/materials'
import { grainBump } from '../../lighthouse/_lib/textures'
import { growSign, planSign, QR_FACE, trailStones } from '../_lib/trailSign'
import { vineMaterial } from '../_lib/vegetationKit'
import { DuneGrass } from './Landscape'
import { vineTime } from './Vines'

// The check-in code on a weathered wooden trail sign, planted in the open sand at the far left of the mainland — a
// waypoint on a coastal walking path, not a check-in station. A winding trail of irregular sandstone stepping stones
// comes in from the east, passes in front of the sign and carries on past it. The base is grown over with dune grass,
// shrubs, wildflowers and creeping vines; a few vines wrap the legs and climb the frame's outer edge, never the code.
//
// The code is built to be read off a TV screen, and is exactly as it was:
//  - a 37 × 37 texture (29 modules plus the four-module quiet zone), pure #000 on pure #fff, sampled NEAREST with no
//    mipmaps, so every module is a crisp solid block and nothing ever blurs it
//  - the face is squared to the camera every frame (exactly square to the screen, pixel-aligned edges)
//  - unlit, kept just under pure white so the bloom pass (threshold 0.95) never haloes the white; no depth of field
//  - 2.6 units square including the quiet zone: about 2.4 px per module at 1080p, 3.6 px at 1.5× density
// The layout (see _lib/trailSign.ts) is worked out in the plaque's own frame and checked with rays: nothing is ever in
// front of the code.

function makeQrTexture(url: string) {
  const svg = renderToStaticMarkup(<QRCodeSVG value={url} size={512} level="L" marginSize={4} />)
  const modules = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)?.[1] ?? 37)
  const dark = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]).pop() ?? ''
  const c = document.createElement('canvas')
  c.width = c.height = modules
  const g = c.getContext('2d')!
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, modules, modules)
  g.fillStyle = '#000000'
  g.fill(new Path2D(dark))
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.magFilter = NearestFilter
  t.minFilter = NearestFilter
  t.generateMipmaps = false
  t.anisotropy = 1
  return t
}

function useQrMaterial(url: string) {
  return useMemo(
    () =>
      new MeshBasicMaterial({
        map: makeQrTexture(url),
        color: '#f4f4f4',
        toneMapped: false,
        side: DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4
      }),
    [url]
  )
}

/** Keeps its children squared to the camera */
function Billboard({ position, children }: { position: Vector3; children: ReactNode }) {
  const ref = useRef<Group>(null)
  const camera = useThree((s) => s.camera)
  useFrame(() => {
    ref.current?.quaternion.copy(camera.quaternion)
  })
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  )
}

/** Sandstone stepping stones: three irregular stone shapes, instanced, each bedded into the sand */
function TrailStones() {
  const { stones, tufts } = useMemo(trailStones, [])
  const geos = useMemo(() => [0, 1, 2].map((k) => boulder({ r: 1, seed: 1500 + k, squash: 0.35 })), [])
  const mat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }), [])
  const groups = useMemo(() => [0, 1, 2].map((k) => stones.filter((s) => s.k === k)), [stones])
  const refs = [useRef<InstancedMesh>(null), useRef<InstancedMesh>(null), useRef<InstancedMesh>(null)]
  useLayoutEffect(() => {
    const o = new Object3D()
    const c = new Color()
    groups.forEach((list, k) => {
      const mesh = refs[k].current
      if (!mesh) return
      list.forEach((s, i) => {
        o.position.set(s.x, s.y, s.z)
        o.rotation.set(s.tiltX, s.rot, s.tiltZ)
        o.scale.set(s.s, s.s * 0.9, s.s * s.stretch)
        o.updateMatrix()
        mesh.setMatrixAt(i, o.matrix)
        // each a slightly different warm sandstone
        mesh.setColorAt(i, c.setRGB(0.95 + (i % 3) * 0.05, 0.9 + (i % 4) * 0.04, 0.82 + (i % 5) * 0.05))
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups])
  return (
    <group>
      {groups.map((list, k) =>
        list.length ? <instancedMesh key={k} ref={refs[k]} args={[geos[k], mat, list.length]} castShadow receiveShadow /> : null
      )}
      <DuneGrass spots={tufts.map((t) => ({ ...t, rot: t.rot }))} seed={4} />
    </group>
  )
}

const FLOWER_COLOURS = ['#f4c84e', '#f28fb0', '#fbf6ec', '#b79ae6']

function Wildflowers({ list }: { list: { pos: Vector3; s: number; hue: number }[] }) {
  const geo = useMemo(() => new IcosahedronGeometry(0.06, 0), [])
  const mat = useMemo(() => new MeshStandardMaterial({ roughness: 0.6, emissive: new Color('#ffffff'), emissiveIntensity: 0.05 }), [])
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    list.forEach((f, i) => {
      o.position.copy(f.pos)
      o.scale.setScalar(f.s)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      mesh.setColorAt(i, new Color(FLOWER_COLOURS[f.hue]).multiplyScalar(0.85 + (i % 4) * 0.1))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [list])
  if (!list.length) return null
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} />
}

export function QrTrailSign({ url }: { url: string }) {
  const m = materials()
  const qr = useQrMaterial(url)
  const plan = useMemo(planSign, [])
  const growth = useMemo(() => growSign(plan), [plan])
  const vineMat = useMemo(() => vineMaterial(vineTime), [])
  // weathered: grey-brown, a little rough, like driftwood
  const wood = useMemo(() => new MeshStandardMaterial({ color: '#8a7a64', roughness: 0.97, bumpMap: grainBump(), bumpScale: 0.9 }), [])
  const post = useMemo(() => new MeshStandardMaterial({ color: '#76674f', roughness: 0.98, bumpMap: grainBump(), bumpScale: 0.9 }), [])
  const beam = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 2, 0.14), [])
  const shrubGeos = useMemo(() => [shrub({ r: 0.3, seed: 991, blobs: 3 }), shrub({ r: 0.24, seed: 992, blobs: 2 })], [])
  const F = QR_FACE / 2
  const border = 0.12
  return (
    <group>
      {plan.posts.map((p, i) => {
        const len = p.top.y - p.base.y
        return (
          <mesh key={i} material={post} position={[p.base.x, p.base.y + len / 2, p.base.z]} castShadow receiveShadow>
            <cylinderGeometry args={[p.r * 0.85, p.r, len, 8]} />
          </mesh>
        )
      })}
      <Billboard position={plan.centre}>
        {/* a slim frame round the code: four weathered boards, the sides a touch wider, set a little proud of the face */}
        {[
          { p: [0, F + border / 2, 0.015], s: [QR_FACE + border * 2 + 0.16, border, 0.14] },
          { p: [0, -F - border / 2, 0.015], s: [QR_FACE + border * 2 + 0.16, border, 0.14] },
          { p: [-F - border / 2 - 0.04, 0, 0.015], s: [border + 0.08, QR_FACE + border * 2, 0.14] },
          { p: [F + border / 2 + 0.04, 0, 0.015], s: [border + 0.08, QR_FACE + border * 2, 0.14] }
        ].map((b, i) => (
          <mesh key={i} geometry={beam} material={wood} position={b.p as [number, number, number]} scale={b.s as [number, number, number]} castShadow receiveShadow />
        ))}
        {/* the board behind the code */}
        <mesh material={wood} position={[0, 0, -0.05]} castShadow receiveShadow>
          <boxGeometry args={[QR_FACE + 0.1, QR_FACE + 0.1, 0.08]} />
        </mesh>
        <mesh material={qr}>
          <planeGeometry args={[QR_FACE, QR_FACE]} />
        </mesh>
      </Billboard>
      {growth.vines.map((g, i) => (
        <mesh key={i} geometry={g} material={vineMat} castShadow userData={{ noCling: true }} />
      ))}
      {growth.shrubs.map((s, i) => (
        <mesh key={i} geometry={shrubGeos[s.k]} material={m.foliage} position={s.pos} scale={s.s} castShadow receiveShadow />
      ))}
      <DuneGrass spots={growth.grass.map((g) => ({ ...g }))} seed={3} />
      <Wildflowers list={growth.flowers} />
      <TrailStones />
    </group>
  )
}
