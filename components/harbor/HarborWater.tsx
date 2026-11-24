'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, Color, MeshStandardMaterial, OrthographicCamera, PlaneGeometry } from 'three'
import { fbm3, smoothstep } from '../../lib/lighthouse/noise'
import { PALETTE } from '../../lib/lighthouse/materials'
import { grainBump, sandMap } from '../../lib/lighthouse/textures'
import { coastShore, seabed } from '../../lib/harbor/coast'
import { SEA_CENTER } from '../../lib/harbor/waves'
import { SEA_LOOK, seaUniforms } from '../../lib/harbor/seaLook'
import { bakeSeabed, MAP, NOISE, seaSurfaceMaterial } from '../../lib/harbor/seaSurface'

// The sea, in the diorama's colours: a real sea floor underneath (sand shelving down from the beaches, rocks lying in
// the shallows, dancing caustics), and a water surface whose colour and transparency follow the true depth below —
// glass-clear turquoise over the shallows, deepening through saturated turquoise to ocean blue, delicate foam where
// the swell meets rock and sand, and the sun's sparkle across it. The same four swells roll it that the boats ride.

const SIZE = 300
const SEGMENTS = 300
/** The sea floor: sand shelving down from the beaches, rocks in the shallows, caustics playing over it under water */
function seabedMaterial(time: { value: number }) {
  // the very same sand as the island's beach: its speckle map, grain and roughness, tinted by the vertex colours
  const mat = new MeshStandardMaterial({ vertexColors: true, map: sandMap(), roughness: 0.96, bumpMap: grainBump(), bumpScale: 1.1 })
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uTime: time, uCaus: seaUniforms.uCaus })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = (modelMatrix * vec4(position, 1.0)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uTime, uCaus;\nvarying vec3 vW;\n${NOISE}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          // submerged sand: slow current ripples running along one direction, soft mottling, fine speckle
          float wet = smoothstep(0.1, -0.05, vW.y);
          vec2 q = vec2(dot(vW.xz, vec2(0.87, 0.5)), dot(vW.xz, vec2(-0.5, 0.87)));
          float bend = snoise(vW.xz * 0.35) * 1.4;
          float ridges = 0.5 + 0.5 * sin((q.x + bend) * 5.5 + snoise(vW.xz * 0.9) * 2.0);
          float mottle = snoise(vW.xz * 1.3 + 4.0) * 0.6 + snoise(vW.xz * 3.1) * 0.4;
          float speck = snoise(vW.xz * 14.0);
          float tex = (ridges - 0.5) * 0.16 + mottle * 0.1 + speck * 0.05;
          diffuseColor.rgb *= 1.0 + tex * mix(${(0.7 * SEA_LOOK.landTexture).toFixed(2)}, ${SEA_LOOK.sandTexture.toFixed(2)}, wet);
        }`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float under = smoothstep(-0.08, -0.3, vW.y);
        float fade = 1.0 - smoothstep(0.6, 3.2, -vW.y);
        totalEmissiveRadiance += vec3(0.95, 1.0, 0.92) * caustic(vW.xz * 0.8, uTime * ${SEA_LOOK.causticSpeed.toFixed(3)}) * uCaus * under * fade;`
      )
  }
  return mat
}

function seabedGeometry() {
  const g = new PlaneGeometry(MAP.size, MAP.size, 560, 560)
  g.rotateX(-Math.PI / 2)
  g.translate(MAP.minX + MAP.size / 2, 0, MAP.minZ + MAP.size / 2)
  const pos = g.getAttribute('position')
  const uv = g.getAttribute('uv')
  const col = new Float32Array(pos.count * 3)
  // the diorama's beach colours, shading to a cooler sand in the deep
  const dry = new Color(PALETTE.sand)
  const wet = new Color(PALETTE.wetSand)
  const deep = new Color('#b7b88f')
  const deepSand = new Color('#74c0b0')
  const patchy = new Color('#9fd0bd')
  const c = new Color()
  const tile = new Color()
  const tileDeep = new Color('#9d8a63')
  const keep: boolean[] = []
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const d = coastShore(x, z)
    const h = seabed(x, z, d)
    pos.setY(i, h)
    // the sand grain at the island tile's scale (its 10-unit beach repeats its map four times)
    uv.setXY(i, x * 0.4, z * 0.4)
    // the lighthouse island's tile models its own beach
    keep.push(Math.max(Math.abs(x), Math.abs(z)) > 4.9)
    // dry sand, a clean band of wet sand at the water's edge, then the sand darkening as it goes under
    c.copy(dry)
      .lerp(wet, 1 - smoothstep(0.06, 0.18, h))
      .lerp(deep, 1 - smoothstep(-0.2, -0.02, h))
      .lerp(deepSand, smoothstep(-SEA_LOOK.sandCoolDepth[0], -SEA_LOOK.sandCoolDepth[1], h) * SEA_LOOK.sandTurquoise)
    // patches of slightly warmer and cooler sand, so the floor isn't one even tone
    c.lerp(patchy, 0.35 * (0.5 + 0.5 * fbm3(x * 0.25, 5, z * 0.25, 77)) * (1 - smoothstep(-0.3, -2.0, h)))
    // at the island's tile the sand must be the tile's own (dry, wet, then its tan under water), so there's no visible
    // seam where its beach ends; the cooler harbor colours take over gradually beyond it
    tile.copy(dry).lerp(wet, 1 - smoothstep(0.03, 0.14, h)).lerp(tileDeep, 1 - smoothstep(-0.3, 0.0, h))
    c.lerp(tile, 1 - smoothstep(4.9, 10, Math.max(Math.abs(x), Math.abs(z))))
    col.set([c.r, c.g, c.b], i * 3)
  }
  const index = g.getIndex()!
  const kept: number[] = []
  for (let t = 0; t < index.count; t += 3) {
    const a = index.getX(t)
    const b = index.getX(t + 1)
    const e = index.getX(t + 2)
    if (keep[a] || keep[b] || keep[e]) kept.push(a, b, e)
  }
  g.setIndex(kept)
  g.setAttribute('color', new BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

export function HarborWater() {
  const time = useMemo(() => ({ value: 0 }), [])
  const px = useMemo(() => ({ value: 1 / 34 }), [])
  const geo = useMemo(() => {
    const g = new PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const floorGeo = useMemo(() => seabedGeometry(), [])
  const { water, floor } = useMemo(() => ({ water: seaSurfaceMaterial(bakeSeabed(), time, px), floor: seabedMaterial(time) }), [time, px])
  // the uniforms are shared with the materials above; the frame loop reaches them through a ref
  const uniforms = useRef<{ time: { value: number }; px: { value: number } } | null>(null)
  useEffect(() => {
    uniforms.current = { time, px }
  }, [time, px])
  useFrame(({ clock, camera }) => {
    const u = uniforms.current
    if (!u) return
    u.time.value = clock.elapsedTime
    u.px.value = 1 / (camera as OrthographicCamera).zoom
  })
  return (
    <group>
      <mesh geometry={floorGeo} material={floor} receiveShadow />
      <mesh geometry={geo} material={water} position={[SEA_CENTER.x, 0, SEA_CENTER.z]} receiveShadow renderOrder={1} />
    </group>
  )
}
