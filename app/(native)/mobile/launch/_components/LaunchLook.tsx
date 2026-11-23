'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { DirectionalLight, HemisphereLight } from 'three'
import { sunDirection } from '@/app/dev/checkin-voyage/_lib/lightLook'
import { applySea, SEA_DEFAULTS } from '@/app/dev/checkin-voyage/_lib/seaLook'
import { LAUNCH_LIGHT as L, LAUNCH_SEA } from './launchSettings'

/**
 * Gives the harbor the launch screen's lighting and sea. The lights are this scene's own copies; the sea's shader
 * values are shared, so they're set when this mounts and put back to the approved ones when it goes.
 * The shared rig settles in over its first frames, so the values are applied for the first couple of seconds.
 */
export function LaunchLook() {
  const get = useThree((s) => s.get)
  const frames = useRef(0)
  const sunDistance = useRef(0)

  useEffect(() => {
    const { gl } = get()
    applySea(LAUNCH_SEA)
    gl.toneMappingExposure = L.exposure
    return () => {
      applySea(SEA_DEFAULTS)
      gl.toneMappingExposure = 1
    }
  }, [get])

  useFrame((state) => {
    const scene = state.scene
    if (frames.current++ > 120) return
    scene.traverse((o) => {
      if (o instanceof HemisphereLight) {
        o.color.set(L.skyColor)
        o.groundColor.set(L.groundColor)
        o.intensity = L.ambient
      } else if (o instanceof DirectionalLight) {
        if (o.castShadow) {
          o.color.set(L.sunColor)
          o.intensity = L.sunIntensity
          o.shadow.radius = L.shadowSoftness
          const t = o.target.position
          if (!sunDistance.current) sunDistance.current = o.position.distanceTo(t)
          const d = sunDirection(L.sunAzimuth, L.sunElevation)
          const r = sunDistance.current
          o.position.set(t.x + d.x * r, t.y + d.y * r, t.z + d.z * r)
        } else {
          o.color.set(L.fillColor)
          o.intensity = L.fillIntensity
        }
      }
    })
    scene.environmentIntensity = L.reflections
  })
  return null
}
