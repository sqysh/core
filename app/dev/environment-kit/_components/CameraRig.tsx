'use client'

import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo } from 'react'
import { OrthographicCamera, Quaternion, Vector3 } from 'three'

// The workshop camera: orthographic and isometric like the CORE world (looking in from the tile's south-east corner),
// fitted to the window. Saved views frame the whole diorama, the rock's surface up close, and the waterline from low
// down; orbit, pan and zoom carry on from any of them. The close-up and waterline frame the asset by its size (they were
// set on the 7.2-unit granite headland), so a shrub is framed as well as a tree. Side by side, the second view follows
// the first's camera.

export type CameraView = 'overview' | 'close' | 'waterline'
export const CAMERA_VIEWS: { id: CameraView; name: string }[] = [
  { id: 'overview', name: 'Overview' },
  { id: 'close', name: 'Close-up' },
  { id: 'waterline', name: 'Waterline' }
]

const DEG = Math.PI / 180
const DISTANCE = 60
/** World width and height that must stay in frame at the overview */
const FRAME = { w: 13.5, h: 9.5 }

type ViewSpec = { target: [number, number, number]; azimuth: number; elevation: number; zoom: number }
/** The reference asset the close-up and waterline were set on (width, height, depth) */
const REFERENCE: [number, number, number] = [7.2, 2.3, 5.7]

const VIEWS: Record<CameraView, ViewSpec> = {
  overview: { target: [0, 0.6, 0.3], azimuth: 45, elevation: 30, zoom: 1 },
  close: { target: [0.6, 1.05, 0.5], azimuth: 40, elevation: 32, zoom: 2.7 },
  waterline: { target: [0, 0.35, 1.8], azimuth: 30, elevation: 11, zoom: 1.7 }
}

/** A view fitted to an asset of `size`: targets and zoom scale from the reference asset */
function fitted(view: CameraView, size?: [number, number, number]): ViewSpec {
  const v = VIEWS[view]
  if (view === 'overview' || !size) return v
  const [w, h, d] = size
  const [rw, rh, rd] = REFERENCE
  // the larger of its spread and its height (counted as it shows from above) sets how close to come
  const factor = Math.max(rw, rh * 1.5, rd) / Math.max(w, h * 1.5, d)
  return { ...v, target: [(v.target[0] * w) / rw, (v.target[1] * h) / rh, (v.target[2] * d) / rd], zoom: v.zoom * factor }
}

/** One view's camera, shared with a second view that follows it */
export type CameraLink = { position: Vector3; quaternion: Quaternion; zoom: number; ready: boolean }
export const cameraLink = (): CameraLink => ({ position: new Vector3(), quaternion: new Quaternion(), zoom: 1, ready: false })

/** The following view of a side-by-side pair: the same camera as the view it follows, every frame */
export function FollowCamera({ link }: { link: CameraLink }) {
  useFrame(({ camera }) => {
    if (!link.ready) return
    const cam = camera as OrthographicCamera
    cam.position.copy(link.position)
    cam.quaternion.copy(link.quaternion)
    if (cam.zoom !== link.zoom) {
      cam.zoom = link.zoom
      cam.updateProjectionMatrix()
    }
  }, -50)
  return null
}

/** Puts the camera on a view and points the orbit controls at its target */
function placeCamera(
  camera: OrthographicCamera,
  controls: { target: Vector3; update: () => void } | null,
  v: ViewSpec,
  fit: number
) {
  const az = v.azimuth * DEG
  const el = v.elevation * DEG
  const [tx, ty, tz] = v.target
  camera.position.set(tx + DISTANCE * Math.cos(el) * Math.sin(az), ty + DISTANCE * Math.sin(el), tz + DISTANCE * Math.cos(el) * Math.cos(az))
  camera.near = 0.1
  camera.far = 300
  camera.zoom = fit * v.zoom
  camera.lookAt(tx, ty, tz)
  camera.updateProjectionMatrix()
  if (controls) {
    controls.target.set(tx, ty, tz)
    controls.update()
  }
}

/** Copies the leading camera onto the link its follower reads */
function leadLink(link: CameraLink, camera: OrthographicCamera) {
  link.position.copy(camera.position)
  link.quaternion.copy(camera.quaternion)
  link.zoom = camera.zoom
  link.ready = true
}

export function CameraRig({
  view,
  nonce,
  autoRotate,
  link,
  subject
}: {
  view: CameraView
  nonce: number
  autoRotate: boolean
  link?: CameraLink
  /** The asset's size, to frame the close-up and waterline on */
  subject?: [number, number, number]
}) {
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const size = useThree((s) => s.size)
  const controls = useThree((s) => s.controls) as unknown as { target: Vector3; update: () => void } | null
  const fit = useMemo(() => Math.min(size.width / FRAME.w, size.height / FRAME.h), [size])

  // framing follows the asset's size, not each new build of it (another level of detail keeps the view where it is)
  const sizeKey = subject?.map((n) => n.toFixed(3)).join(',') ?? ''
  useLayoutEffect(() => {
    const v = fitted(view, sizeKey ? (sizeKey.split(',').map(Number) as [number, number, number]) : undefined)
    placeCamera(camera, controls, v, fit)
  }, [camera, controls, view, nonce, fit, sizeKey])

  // lead a following view (after the controls have moved the camera this frame)
  useFrame(() => {
    if (!link) return
    leadLink(link, camera)
  })

  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minZoom={fit * 0.5}
      maxZoom={fit * 30}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2 - 0.04}
      autoRotate={autoRotate}
      autoRotateSpeed={0.6}
      zoomToCursor
    />
  )
}
