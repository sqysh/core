'use client'

import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useLayoutEffect, useMemo } from 'react'
import { MeshBasicMaterial, OrthographicCamera, Vector3 } from 'three'
import { at } from '@/app/dev/lighthouse/_lib/world'

// Pieces the builder's comparison and the terrain lab share: the orbiting isometric camera, the world's finish, and the
// wireframe overlay. (The harbor editor has its own camera, framed on the reference image: _components/EditorScene.)

const DEG = Math.PI / 180

/** The orthographic isometric view, like the TV's: 45° round, 35° down, the scenery left of centre and open water right */
export const ISO = { azimuth: 45, elevation: 35, target: at(1, 0), width: 62 }

export const wire = new MeshBasicMaterial({
  color: '#7fd3ff',
  wireframe: true,
  transparent: true,
  opacity: 0.3,
  depthWrite: false
})
/** The orbit camera, set to the isometric preset round `target` (world x, z) fitting `width` units across */
/** Points the camera, and the orbit controls that follow it, at a place: the same framing the camera object always got */
function frameCamera(
  camera: OrthographicCamera,
  controls: { target: Vector3; update: () => void } | null,
  { position, zoom, look }: { position: [number, number, number]; zoom: number; look: [number, number, number] }
) {
  camera.position.set(...position)
  camera.near = 1
  camera.far = 400
  camera.zoom = zoom
  camera.lookAt(...look)
  camera.updateProjectionMatrix()
  if (controls) {
    controls.target.set(...look)
    controls.update()
  }
}

export function Camera({
  nonce,
  turn,
  target = ISO.target,
  width: presetWidth = ISO.width
}: {
  nonce: number
  turn: number
  target?: [number, number]
  width?: number
}) {
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const size = useThree((s) => s.size)
  const controls = useThree((s) => s.controls) as unknown as { target: Vector3; update: () => void } | null
  // ?width=…&tu=…&tv=…&el=… adjust the preset, for checking a composition from the address
  const q = useMemo(() => new URLSearchParams(window.location.search), [])
  const width = Number(q.get('width')) || presetWidth
  const fit = size.width / width
  useLayoutEffect(() => {
    const az = (ISO.azimuth + turn) * DEG
    const el = (Number(q.get('el')) || ISO.elevation) * DEG
    const [tx, tz] = q.get('tu') ? at(Number(q.get('tu')), Number(q.get('tv') ?? 0)) : target
    const D = 140
    frameCamera(camera, controls, {
      position: [tx + D * Math.cos(el) * Math.sin(az), D * Math.sin(el), tz + D * Math.cos(el) * Math.cos(az)],
      zoom: Math.min(fit, size.height / (width * 0.6)),
      look: [tx, 0, tz]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, turn, controls, size.width, size.height])
  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minZoom={fit * 0.3}
      maxZoom={fit * 25}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2 - 0.03}
      zoomToCursor
    />
  )
}

/** The world's finish: ambient occlusion, a little bloom, neutral tone mapping, vignette */
export function Finish() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO aoRadius={1.6} distanceFalloff={0.6} intensity={1.6} quality="medium" color="#1d1712" halfRes />
      <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.2} intensity={0.4} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Vignette offset={0.3} darkness={0.3} />
      <SMAA />
    </EffectComposer>
  )
}
