'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { DirectionalLight, HemisphereLight } from 'three'
import { getLight, lightVersion, sunDirection } from '../_lib/lightLook'

/**
 * Applies the Lighting panel's values to this scene's lights (found in the scene: the shared rig is not touched). It
 * only does work when a value has changed, plus for the first moments, while the rig and its reflections are still
 * settling in and might otherwise be left with the rig's own values.
 */
export function LightingGrade() {
  const scene = useThree((s) => s.scene)
  const applied = useRef(-1)
  const frames = useRef(0)
  const sunDistance = useRef(0)

  useFrame(() => {
    const v = lightVersion()
    if (v === applied.current && frames.current++ > 120) return
    applied.current = v
    const p = getLight()
    const sun: DirectionalLight[] = []
    scene.traverse((o) => {
      if (o instanceof HemisphereLight) {
        o.color.set(p.skyColor)
        o.groundColor.set(p.groundColor)
        o.intensity = p.ambient * p.exposure
      } else if (o instanceof DirectionalLight) sun.push(o)
    })
    // the shadow-casting directional light is the sun; the other is the cool fill from the far side
    for (const l of sun) {
      if (l.castShadow) {
        l.color.set(p.sunColor)
        l.intensity = p.sunIntensity * p.exposure
        l.shadow.radius = p.shadowSoftness
        // keep its distance and focus; move it round the sky
        const t = l.target.position
        if (!sunDistance.current) sunDistance.current = l.position.distanceTo(t)
        const d = sunDirection(p.sunAzimuth, p.sunElevation)
        const r = sunDistance.current
        l.position.set(t.x + d.x * r, t.y + d.y * r, t.z + d.z * r)
      } else {
        l.color.set(p.fillColor)
        l.intensity = p.fillIntensity * p.exposure
      }
    }
    scene.environmentIntensity = p.reflections * p.exposure
  })
  return null
}
