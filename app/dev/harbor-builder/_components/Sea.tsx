'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  Color,
  DataTexture,
  LinearFilter,
  MeshStandardMaterial,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  UnsignedByteType
} from 'three'
import { MAP, seaSurfaceMaterial } from '@/app/dev/checkin-voyage/_lib/seaSurface'
import { PALETTE } from '@/app/dev/lighthouse/_lib/materials'

// The check-in harbor's own animated sea (its turquoise palette, ripples, foam, sparkle and swell), driven by a depth
// map baked from the builder's land rather than the harbor's: shallows and foam follow the coast the models make. A
// sand floor shelves away under it, so the shallows read through the water.

const RES = 192
const SIZE = 300

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export type SeaBake = { texture: DataTexture; heights: Float32Array; res: number }

/** Fills the depth map and the sea floor from a bake: the sand at the coast cooling to teal in the deep */
function applyBake(bake: SeaBake, map: DataTexture, floor: PlaneGeometry) {
  ;(map.image.data as Uint8Array).set(bake.texture.image.data as Uint8Array)
  map.needsUpdate = true
  const pos = floor.getAttribute('position')
  const col = floor.getAttribute('color')
  const sand = new Color(PALETTE.wetSand)
  const deep = new Color('#5fae9f')
  const c = new Color()
  for (let j = 0; j < RES; j++)
    for (let i = 0; i < RES; i++) {
      const v = j * RES + i
      const h = bake.heights[v]
      pos.setY(v, h)
      c.copy(sand).lerp(deep, smooth(-0.6, -3.5, h))
      col.setXYZ(v, c.r, c.g, c.b)
    }
  pos.needsUpdate = true
  col.needsUpdate = true
  floor.computeVertexNormals()
}

/** The sea's two animated uniforms: the clock, and one screen pixel in world units */
function tickSea(time: { value: number }, px: { value: number }, t: number, zoom: number) {
  time.value = t
  px.value = 1 / zoom
}

export function Sea({ bake }: { bake: SeaBake | null }) {
  const time = useMemo(() => ({ value: 0 }), [])
  const px = useMemo(() => ({ value: 1 / 30 }), [])
  // one depth map the water keeps, refilled whenever the land moves
  const map = useMemo(() => {
    const data = new Uint8Array(RES * RES * 4)
    for (let k = 0; k < RES * RES; k++) {
      data[k * 4] = 40
      data[k * 4 + 1] = 255
      data[k * 4 + 3] = 255
    }
    const t = new DataTexture(data, RES, RES, RGBAFormat, UnsignedByteType)
    t.magFilter = LinearFilter
    t.minFilter = LinearFilter
    t.needsUpdate = true
    return t
  }, [])
  const water = useMemo(() => seaSurfaceMaterial(map, time, px), [map, time, px])
  const surface = useMemo(() => {
    const g = new PlaneGeometry(SIZE, SIZE, 300, 300)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const floor = useMemo(() => {
    const g = new PlaneGeometry(MAP.size, MAP.size, RES - 1, RES - 1)
    g.rotateX(-Math.PI / 2)
    g.translate(MAP.minX + MAP.size / 2, 0, MAP.minZ + MAP.size / 2)
    g.setAttribute('color', new BufferAttribute(new Float32Array(RES * RES * 3), 3))
    return g
  }, [])
  const floorMaterial = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), [])

  useEffect(() => {
    if (!bake || bake.res !== RES) return
    applyBake(bake, map, floor)
  }, [bake, map, floor])

  // In the editor the sea only needs to animate at ~15 fps. Throttling the invalidate() call keeps the
  // demand-frame-loop from burning a full 60-fps render budget on waves while the user is placing models.
  const lastTick = useRef(0)
  useFrame(({ clock, camera, invalidate }) => {
    const t = clock.elapsedTime
    if (t - lastTick.current < 1 / 15) return
    lastTick.current = t
    tickSea(time, px, t, (camera as OrthographicCamera).zoom)
    invalidate()
  })

  return (
    <group>
      <mesh geometry={floor} material={floorMaterial} receiveShadow />
      <mesh
        geometry={surface}
        material={water}
        position={[MAP.minX + MAP.size / 2, 0, MAP.minZ + MAP.size / 2]}
        receiveShadow
        renderOrder={1}
      />
    </group>
  )
}
