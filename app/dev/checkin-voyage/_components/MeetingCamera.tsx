'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { OrthographicCamera, Vector3 } from 'three'
import { damp } from '../_lib/damp'
import { HarborStore } from '../_lib/store'
import { SCREEN, VIEW } from '../_lib/view'

// The meeting shot (see VIEW): a true orthographic, isometric three-quarter camera like the original diorama. It
// breathes very slightly so the scene never feels frozen, and while a boat is coming in it leans a touch toward it.
// The camera follows a focus point, so as the world grows it can travel in any direction by moving that point;
// azimuth, elevation and zoom stay as set.

const BIAS = 0.05
const MAX_BIAS = 1.2

export function MeetingCamera({ store }: { store: HarborStore }) {
  const get = useThree((s) => s.get)
  const size = useThree((s) => s.size)
  const bias = useRef(new Vector3())
  const goal = useRef(new Vector3())
  const target = useRef(new Vector3())

  useEffect(() => {
    const camera = get().camera
    camera.near = 0.5
    camera.far = 500
  }, [get])

  useFrame((state, rawDt) => {
    const { clock } = state
    const camera = state.camera as OrthographicCamera
    const dt = Math.min(rawDt, 0.05)
    const t = clock.elapsedTime
    // the frame is laid out for 1920×1080; other screens scale it to fit whichever side is tighter
    const zoom = VIEW.zoom * Math.min(size.width / SCREEN.w, size.height / SCREEN.h)
    if (Math.abs(camera.zoom - zoom) > 1e-3) {
      camera.zoom = zoom
      camera.updateProjectionMatrix()
    }

    let lead: { x: number; z: number; launchAt: number } | null = null
    for (const b of store.boats.values())
      if (b.phase === 'arriving' && b.age > 0.4 && (!lead || b.launchAt > lead.launchAt)) lead = b
    if (lead) {
      goal.current.set(lead.x - VIEW.target.x, 0, lead.z - VIEW.target.z).multiplyScalar(BIAS)
      if (goal.current.length() > MAX_BIAS) goal.current.setLength(MAX_BIAS)
    } else goal.current.set(0, 0, 0)
    bias.current.lerp(goal.current, damp(0.4, dt))

    const az = VIEW.azimuth + Math.sin(t * 0.05) * 0.008
    const el = VIEW.elevation + Math.sin(t * 0.037 + 1) * 0.003
    target.current.set(VIEW.target.x + bias.current.x, VIEW.target.y, VIEW.target.z + bias.current.z)
    camera.position.set(
      target.current.x + VIEW.distance * Math.cos(el) * Math.sin(az),
      target.current.y + VIEW.distance * Math.sin(el),
      target.current.z + VIEW.distance * Math.cos(el) * Math.cos(az)
    )
    camera.lookAt(target.current)
  })
  return null
}
