'use client'

import { Environment, Lightformer } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Object3D, Scene } from 'three'
import { studioBackdrop } from '../../lib/lighthouse/textures'

// The world's single lighting rig: a warm key from the upper left, a cool sky fill, a faint cool rim, and a soft studio
// environment for gentle reflections on paint, glass and copper. Every tile is lit by this, never by its own lights.

function setBackground(scene: Scene, background: Scene['background']) {
  scene.background = background
}

export function StudioLighting({
  focus = [0, 0, 0],
  backdrop = true,
  shadowRange = 15,
  shadowSoftness = 5,
  shadowMapSize = 4096
}: {
  focus?: [number, number, number]
  /** Half-width of the shadow box round the focus (the diorama tile needs 15; a wider scene more) */
  shadowRange?: number
  /** Shadow edge blur (the diorama uses 5; a wider scene reads better softer) */
  shadowSoftness?: number
  /** Shadow map resolution (a phone gets by with far less than the TV) */
  shadowMapSize?: number
  /** The charcoal studio backdrop; scenes with their own sky or haze turn it off */
  backdrop?: boolean
}) {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    if (!backdrop) return
    setBackground(scene, studioBackdrop())
    return () => {
      setBackground(scene, null)
    }
  }, [scene, backdrop])

  // the key light (and its shadow box) follows the focus, so it can travel with the camera across tiles
  const target = useMemo(() => new Object3D(), [])
  const [fx, fy, fz] = focus
  return (
    <>
      <primitive object={target} position={focus} />
      <hemisphereLight args={['#c4dcf2', '#6a5a4a', 1.15]} />
      <directionalLight
        castShadow
        color="#ffdcb2"
        intensity={3.7}
        position={[fx - 14 * (shadowRange / 15), fy + 24 * (shadowRange / 15), fz + 15 * (shadowRange / 15)]}
        target={target}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-left={-shadowRange}
        shadow-camera-right={shadowRange}
        shadow-camera-top={shadowRange}
        shadow-camera-bottom={-shadowRange}
        shadow-camera-near={1}
        shadow-camera-far={80 * (shadowRange / 15)}
        shadow-radius={shadowSoftness}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <directionalLight color="#8fb4e6" intensity={0.55} position={[fx + 16, fy + 7, fz - 8]} />
      <Environment resolution={256} frames={1} environmentIntensity={0.8}>
        <Lightformer form="rect" intensity={2.4} color="#fff1df" position={[-8, 10, 6]} scale={[10, 8, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} color="#bcd6f5" position={[10, 6, -6]} scale={[10, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="circle" intensity={1.5} color="#ffffff" position={[0, 14, 0]} scale={6} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.4} color="#2a2e31" position={[0, -6, 0]} scale={[30, 30, 1]} rotation-x={Math.PI / 2} />
      </Environment>
    </>
  )
}
