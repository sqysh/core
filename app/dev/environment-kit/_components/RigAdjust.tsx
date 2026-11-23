'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { DirectionalLight, HemisphereLight, Light, Scene } from 'three'
import { WorkshopSettings } from './settings'

// Adjusts the world's shared lighting rig (StudioLighting) as it stands in this scene, without touching the rig
// itself: each light's own value is remembered the first time it's seen, and the workshop's settings scale it or move
// it. The shadow-casting light is the sun; the other directional light is the cool fill, counted with the sky.

const DEG = Math.PI / 180

function setEnvironmentIntensity(scene: Scene, value: number) {
  scene.environmentIntensity = value
}

export function RigAdjust({ settings: s }: { settings: WorkshopSettings }) {
  const scene = useThree((st) => st.scene)
  const applied = useRef('')
  const frames = useRef(0)
  useFrame(() => {
    const key = JSON.stringify([s.sunAzimuth, s.sunElevation, s.sunStrength, s.skyLight, s.reflections, s.exposure, s.shadows])
    // keep applying for the first moments, while the rig's own lights and environment are still settling in
    if (key === applied.current && frames.current++ > 90) return
    if (key !== applied.current) frames.current = 0
    applied.current = key
    scene.traverse((o) => {
      if (!(o instanceof Light)) return
      const base = (o.userData.baseIntensity ??= o.intensity) as number
      if (o instanceof HemisphereLight) o.intensity = base * s.skyLight * s.exposure
      else if (o instanceof DirectionalLight) {
        if (o.userData.rigCastShadow === undefined) o.userData.rigCastShadow = o.castShadow
        if (o.userData.rigCastShadow) {
          o.intensity = base * s.sunStrength * s.exposure
          o.castShadow = s.shadows
          const t = o.target.position
          const r = (o.userData.sunDistance ??= o.position.distanceTo(t)) as number
          const az = s.sunAzimuth * DEG
          const el = s.sunElevation * DEG
          o.position.set(t.x + r * Math.cos(el) * Math.sin(az), t.y + r * Math.sin(el), t.z + r * Math.cos(el) * Math.cos(az))
        } else o.intensity = base * s.skyLight * s.exposure
      }
    })
    setEnvironmentIntensity(scene, s.reflections * s.exposure)
  })
  return null
}
