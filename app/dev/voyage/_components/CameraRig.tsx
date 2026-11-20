'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { OrthographicCamera, Vector3 } from 'three'
import { angleDelta, damp, FleetState, FLEET } from '../_lib/fleet'
import { headingAround } from '../_lib/route'
import { WORLD_CENTER } from '../_lib/worldMap'

// One orthographic camera with two choreographies, blended smoothly into each other:
//  - overview: the whole miniature world from its south-east corner, like the lighthouse diorama
//  - follow: a closer three-quarter view from behind the fleet that swings round bends ahead of time
// Everything eases (target, bearing, tilt, zoom), so the camera never jumps. Drag turns it, the wheel zooms.

export type CameraMode = 'overview' | 'follow'

const DISTANCE = 70
const OVERVIEW = { azimuth: Math.PI / 4, elevation: (30 * Math.PI) / 180, height: 6.6, frameW: 30, frameH: 30 }
const FOLLOW = { elevation: (38 * Math.PI) / 180, frameH: 8.5, lead: 0.9, side: -0.6, swing: 0.9 }

export function CameraRig({
  state,
  mode,
  view
}: {
  state: FleetState
  mode: CameraMode
  /** User zoom multiplier and bearing offset (from the zoom control, the wheel and dragging), read every frame */
  view: { zoom: number; orbit: number }
}) {
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const size = useThree((s) => s.size)
  const cur = useRef({
    target: new Vector3(WORLD_CENTER[0], OVERVIEW.height, WORLD_CENTER[1]),
    azimuth: OVERVIEW.azimuth,
    elevation: OVERVIEW.elevation,
    zoom: 0
  })
  const goal = useRef(new Vector3())

  useEffect(() => {
    camera.near = 0.1
    camera.far = 220
  }, [camera])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const c = cur.current
    const { zoom, orbit } = view
    const fit = Math.min(size.width / OVERVIEW.frameW, size.height / OVERVIEW.frameH)

    let azimuth: number
    let elevation: number
    let z: number
    if (mode === 'overview') {
      goal.current.set(WORLD_CENTER[0], OVERVIEW.height, WORLD_CENTER[1])
      azimuth = OVERVIEW.azimuth + orbit
      elevation = OVERVIEW.elevation
      z = fit * zoom
    } else {
      // look at the middle of the fleet, a little ahead of it
      let x = 0
      let zz = 0
      for (const b of state.boats) {
        x += b.x
        zz += b.z
      }
      x /= state.boats.length
      zz /= state.boats.length
      const midGap = FLEET[Math.floor(FLEET.length / 2)].gap
      const heading = headingAround(state.s - midGap, 3, 6)
      goal.current.set(x + Math.sin(heading) * FOLLOW.lead, 0.9, zz + Math.cos(heading) * FOLLOW.lead)
      // behind the fleet and off to one side, so we see the boats in three-quarter — but only swinging so far from
      // the world's home bearing (south-east), which keeps the tall lighthouse behind the fleet instead of in front
      const behind = heading + Math.PI + FOLLOW.side
      const swing = Math.max(-FOLLOW.swing, Math.min(FOLLOW.swing, angleDelta(OVERVIEW.azimuth, behind)))
      azimuth = OVERVIEW.azimuth + swing + orbit
      elevation = FOLLOW.elevation
      z = (size.height / FOLLOW.frameH) * zoom
    }

    // the very first frame starts exactly on the shot, so the page never opens with a swoop
    if (c.zoom === 0) {
      c.zoom = z
      c.target.copy(goal.current)
      c.azimuth = azimuth
      c.elevation = elevation
    }
    const follow = mode === 'follow'
    c.target.lerp(goal.current, damp(follow ? 1.6 : 1.1, dt))
    c.azimuth += angleDelta(c.azimuth, azimuth) * damp(follow ? 0.55 : 0.9, dt)
    c.elevation += (elevation - c.elevation) * damp(1, dt)
    // zoom eases in log space so zooming in and out feel the same
    c.zoom = Math.exp(Math.log(c.zoom) + (Math.log(z) - Math.log(c.zoom)) * damp(1.3, dt))

    const ce = Math.cos(c.elevation)
    camera.position.set(
      c.target.x + DISTANCE * ce * Math.sin(c.azimuth),
      c.target.y + DISTANCE * Math.sin(c.elevation),
      c.target.z + DISTANCE * ce * Math.cos(c.azimuth)
    )
    camera.lookAt(c.target)
    if (Math.abs(camera.zoom - c.zoom) > 1e-4) {
      camera.zoom = c.zoom
      camera.updateProjectionMatrix()
    }
  })

  return null
}
