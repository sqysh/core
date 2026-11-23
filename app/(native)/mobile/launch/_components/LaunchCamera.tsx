'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { OrthographicCamera } from 'three'
import { placeCamera, poseAt } from '../../_lib/cameraChoreography'
import { CAMERA_MS, prefersReducedMotion } from './launchMotion'
import { CAMERA_DISTANCE, SAFETY, SIGN_IN_JOURNEY } from './launchView'

/**
 * The launch screen's camera: follows SIGN_IN_JOURNEY forward over CAMERA_MS when signing in, and back along the same
 * path on the way back. With reduced motion it cuts straight to the end. It only touches the camera while moving, or
 * when the screen's width changes.
 */
export function LaunchCamera({ signingIn }: { signingIn: boolean }) {
  const width = useThree((s) => s.size.width)
  /** 0 = landing, 1 = signing in, linear in time; each part of the pose eases on its own */
  const progress = useRef(signingIn ? 1 : 0)
  const placed = useRef({ progress: -1, width: 0 })

  useFrame((state, dt) => {
    const camera = state.camera as OrthographicCamera
    const goal = signingIn ? 1 : 0
    const p = progress.current
    if (p !== goal) {
      const step = prefersReducedMotion() ? 1 : (Math.min(dt, 0.05) * 1000) / CAMERA_MS
      progress.current = goal > p ? Math.min(goal, p + step) : Math.max(goal, p - step)
    }
    if (placed.current.progress === progress.current && placed.current.width === width) return
    placed.current = { progress: progress.current, width }
    camera.near = 0.5
    camera.far = 500
    placeCamera(camera, poseAt(SIGN_IN_JOURNEY, progress.current), width, CAMERA_DISTANCE, SAFETY)
  })
  return null
}
