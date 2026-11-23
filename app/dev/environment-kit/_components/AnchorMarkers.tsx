'use client'

import { useMemo } from 'react'
import { GroundAnchor } from '@/lib/environment/core/placement'
import { TerrainSampler } from '@/lib/environment/core/terrain'

/** Marks where an asset's footprint meets the ground, to check it was sampled and seated correctly */
export function AnchorMarkers({ terrain, anchor, yaw }: { terrain: TerrainSampler; anchor: GroundAnchor; yaw: number }) {
  const points = useMemo(() => {
    const c = Math.cos(yaw)
    const s = Math.sin(yaw)
    return anchor.footprint.map(([fx, fz]) => {
      const x = c * fx + s * fz
      const z = -s * fx + c * fz
      return [x, terrain.height(x, z), z] as [number, number, number]
    })
  }, [terrain, anchor, yaw])
  return (
    <group>
      {points.map((p, i) => (
        <mesh key={i} position={[p[0], p[1] + 0.03, p[2]]}>
          <sphereGeometry args={[0.06, 10, 8]} />
          <meshBasicMaterial color="#ff5ad1" depthTest={false} transparent />
        </mesh>
      ))}
    </group>
  )
}
