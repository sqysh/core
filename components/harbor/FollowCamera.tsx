'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { OrthographicCamera, Vector3 } from 'three'
import { damp } from '../../lib/harbor/damp'
import { HarborStore } from '../../lib/harbor/store'
import { VIEW } from '../../lib/harbor/view'

// A phone's camera on the harbor: the TV's own isometric three-quarter view, closer in and following one boat, so a
// member watches theirs sail in and lie at anchor. It eases after the boat rather than locking to it, so the swell
// and the boat's turns read as the boat moving, not the world.

/** World units across the narrower dimension of the screen: close enough to see the boat, far enough to see where it is */
const SPAN_LANDSCAPE = 22
const SPAN_PORTRAIT = 11

/** Where on the screen the boat sits, as fractions of its width and height from the top left */
export type Frame = { landscape: [number, number]; portrait: [number, number] }
const CENTRE: Frame = { landscape: [0.5, 0.5], portrait: [0.5, 0.5] }

export function FollowCamera({ store, follow, frame = CENTRE }: { store: HarborStore; follow: string; frame?: Frame }) {
  const get = useThree((s) => s.get)
  const size = useThree((s) => s.size)
  const target = useRef(new Vector3(VIEW.target.x, VIEW.target.y, VIEW.target.z))
  const placed = useRef(false)

  useEffect(() => {
    const camera = get().camera as OrthographicCamera
    camera.near = 0.5
    camera.far = 500
    camera.zoom = size.width / (size.width > size.height ? SPAN_LANDSCAPE : SPAN_PORTRAIT)
    camera.updateProjectionMatrix()
  }, [get, size])

  useFrame((state, rawDt) => {
    const { clock } = state
    const camera = state.camera as OrthographicCamera
    const dt = Math.min(rawDt, 0.05)
    const b = store.boats.get(follow)
    if (b) {
      // a touch ahead of the boat while it's under way, so it sails into the frame rather than out of it
      const lead = Math.min(1.5, Math.abs(b.speed) * 0.5)
      // and off-centre when the screen has controls over part of it, so the boat sits in the clear part: the target
      // moves along the screen's right (horizontal) and its up (the ground's forward, foreshortened by the elevation)
      const [fx, fy] = size.width > size.height ? frame.landscape : frame.portrait
      const right = (fx - 0.5) * (size.width / camera.zoom)
      const up = ((0.5 - fy) * (size.height / camera.zoom)) / Math.sin(VIEW.elevation)
      const az = VIEW.azimuth
      const gx = b.x + Math.sin(b.heading) * lead - Math.cos(az) * right + Math.sin(az) * up
      const gz = b.z + Math.cos(b.heading) * lead + Math.sin(az) * right + Math.cos(az) * up
      if (!placed.current) target.current.set(gx, 0, gz)
      placed.current = true
      const k = damp(1.6, dt)
      target.current.x += (gx - target.current.x) * k
      target.current.z += (gz - target.current.z) * k
    }
    const t = clock.elapsedTime
    const az = VIEW.azimuth + Math.sin(t * 0.05) * 0.008
    const el = VIEW.elevation
    camera.position.set(
      target.current.x + VIEW.distance * Math.cos(el) * Math.sin(az),
      target.current.y + VIEW.distance * Math.sin(el),
      target.current.z + VIEW.distance * Math.cos(el) * Math.cos(az)
    )
    camera.lookAt(target.current)
  })
  return null
}
