'use client'

import { useMemo } from 'react'
import { BufferAttribute, Color, PlaneGeometry } from 'three'
import { fbm3, smoothstep } from '@/lib/environment/core/noise'
import { TerrainSampler } from '@/lib/environment/core/terrain'

// The workshop's test ground, drawn from the same sampler the assets are placed with, so what you see is exactly the
// ground they were grounded on: sand at the water, wet sand at its edge, then soil and patchy grass up the slopes.

const SIZE = 32
const SEGMENTS = 220

export function PreviewGround({ terrain }: { terrain: TerrainSampler }) {
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)
    g.rotateX(-Math.PI / 2)
    const pos = g.getAttribute('position')
    const col = new Float32Array(pos.count * 3)
    const sand = new Color('#cdb894')
    const wetSand = new Color('#8f7c5e')
    const soil = new Color('#7a6a52')
    const grass = new Color('#6c7d43')
    const grassLit = new Color('#8f9a52')
    const c = new Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = terrain.height(x, z)
      pos.setY(i, y)
      const patch = fbm3(x * 0.4, 0, z * 0.4, 21, 3)
      const above = terrain.seaLevel === null ? 2 : y - terrain.seaLevel
      c.copy(soil).lerp(grass, smoothstep(-0.15, 0.25, patch)).lerp(grassLit, smoothstep(0.25, 0.6, patch) * 0.6)
      c.lerp(sand, 1 - smoothstep(0.35, 0.7, above))
      c.lerp(wetSand, 1 - smoothstep(0.02, 0.12, above))
      c.multiplyScalar(0.92 + 0.16 * fbm3(x * 2.5, 1, z * 2.5, 22, 2))
      col.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new BufferAttribute(col, 3))
    g.computeVertexNormals()
    return g
  }, [terrain])
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} />
    </mesh>
  )
}

/** A plain stand-in sea for checking the waterline (not the world's ocean) */
export function PreviewWater({ level }: { level: number }) {
  return (
    <mesh position={[0, level, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[SIZE, SIZE]} />
      <meshPhysicalMaterial color="#1f8f9c" roughness={0.08} metalness={0} transparent opacity={0.62} depthWrite={false} />
    </mesh>
  )
}
