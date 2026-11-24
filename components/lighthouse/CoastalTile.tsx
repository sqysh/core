'use client'

import { ReactNode, useMemo } from 'react'
import { BufferAttribute, Color, PlaneGeometry } from 'three'
import { materials, PALETTE } from '../../lib/lighthouse/materials'
import { beachHeight, ShoreField } from '../../lib/lighthouse/shore'
import { TILE_SIZE, WATER_Y } from '../../lib/lighthouse/world'
import { smoothstep } from '../../lib/lighthouse/noise'

// One square terrain tile: its beach, and whatever stands on it as children. The sea is drawn around it (HarborWater).

export function CoastalTile({
  position = [0, WATER_Y, 0],
  shore,
  beachDetail = 220,
  children
}: {
  position?: [number, number, number]
  shore: ShoreField
  /** Beach mesh resolution; open-water tiles can use less */
  beachDetail?: number
  children?: ReactNode
}) {
  const beach = useMemo(() => {
    const g = new PlaneGeometry(TILE_SIZE - 0.04, TILE_SIZE - 0.04, beachDetail, beachDetail)
    g.rotateX(-Math.PI / 2)
    const pos = g.getAttribute('position')
    const colors = new Float32Array(pos.count * 3)
    const dry = new Color(PALETTE.sand)
    const wet = new Color(PALETTE.wetSand)
    const deep = new Color('#9d8a63')
    const c = new Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      // dunes are sampled in world space so a beach running across a tile edge stays continuous
      const y = beachHeight(shore, x, z, 0, position[0], position[2])
      pos.setY(i, y)
      c.copy(dry)
        .lerp(wet, 1 - smoothstep(0.03, 0.14, y))
        .lerp(deep, 1 - smoothstep(-0.3, 0.0, y))
      colors.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new BufferAttribute(colors, 3))
    g.computeVertexNormals()
    // world-scale sand grain
    const uv = g.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 4)
    return g
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shore, beachDetail, position[0], position[2]])

  return (
    <group position={position}>
      <mesh geometry={beach} material={materials().sand} receiveShadow castShadow />
      {children}
    </group>
  )
}
