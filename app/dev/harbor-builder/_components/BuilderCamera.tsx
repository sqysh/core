'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { MutableRefObject, useEffect, useLayoutEffect, useRef } from 'react'
import { OrthographicCamera, Vector3 } from 'three'
import {
  cameraOffset,
  DEG,
  groundBelow,
  groundOffsetAt,
  groundPointAt,
  lookAtFor,
  OrthoPose,
  shortestTurn,
  wrapDegrees
} from '@/lib/camera/orthoView'
import { BuilderCameraConfig, WORLD_BUILDER_CAMERA } from '../_lib/builderCamera'
import { frameZoom } from '../_lib/editor'
import { SceneCamera, Vec3 } from '../_lib/scene'
import type { SceneApi } from './EditorScene'

// The World Builder's camera: orthographic at a fixed isometric elevation, turning freely about the vertical axis,
// panning and zooming smoothly. The camera is placed from (azimuth, x, z, zoom) alone, every frame it moves, looking
// at the ground point (x, z) from the fixed elevation with the up direction vertical: there's no state it could tilt
// or roll through. Its rules are in ../_lib/builderCamera.ts (the World Builder's, not the game's).
//
// Controls: drag to pan; right-drag, ⌥-drag or ←/→ to turn; scroll or pinch to zoom toward the pointer; on a
// trackpad two fingers pan, a pinch zooms, and ⌥ with two fingers (or a twist, in Safari) turns; touch: one finger
// pans, two fingers pinch, pan and twist. A press that moves less than a few pixels isn't a camera move, so clicks
// still select, and a drag that starts on the gizmo is the gizmo's. All state lives in refs and is applied to the
// three.js camera directly: moving it re-renders nothing in React.

type Pose = { az: number; x: number; z: number; zoom: number }
type Anchor = { g: [number, number]; px: number; py: number }
type Pointer = {
  x: number
  y: number
  type: string
  /** What dragging it does, once it has moved far enough to be a drag */
  intent: 'pan' | 'rotate'
  mode: 'pending' | 'pan' | 'rotate' | 'pinch' | 'ignored'
  startX: number
  startY: number
  ground: [number, number]
  az0: number
  lastX: number
  lastY: number
  lastT: number
  vx: number
  vy: number
}

const round = (v: number, d = 3) => +v.toFixed(d)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function BuilderCamera({
  home,
  start,
  focus,
  api,
  config = WORLD_BUILDER_CAMERA
}: {
  /** The approved framing: what "Reset camera" returns to (its direction is the config's default, not its own) */
  home: SceneCamera
  /** The view to open on */
  start: SceneCamera
  focus: { nonce: number; point: Vec3 } | null
  api: MutableRefObject<Partial<SceneApi>>
  config?: BuilderCameraConfig
}) {
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)

  const view = useRef({
    cur: { az: 0, x: 0, z: 0, zoom: 1 } as Pose,
    des: { az: 0, x: 0, z: 0, zoom: 1 } as Pose,
    anchor: null as Anchor | null,
    inertia: null as { vx: number; vy: number } | null,
    home: { x: 0, z: 0, zoom: 1, aspect: home.aspect },
    size,
    ready: false,
    dirty: false
  })
  const v = view.current
  v.size = size

  const limits = () => ({
    min: v.size.width / config.zoom.maxViewWidth,
    max: v.size.width / config.zoom.minViewWidth
  })
  const clampZoom = (z: number) => clamp(z, limits().min, limits().max)
  const pose = (p: Pose): OrthoPose => ({ azimuth: p.az, elevation: config.elevation, x: p.x, z: p.z, zoom: p.zoom })
  const homeZoom = () => frameZoom(home, v.size.width, v.size.height)
  const homeGround = (): [number, number] =>
    groundBelow(home.target, config.defaultAzimuth, config.elevation)

  // the framing it returns to, kept current as the approved view or the window changes
  useLayoutEffect(() => {
    const [x, z] = homeGround()
    v.home = { x, z, zoom: homeZoom(), aspect: home.aspect }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home.target[0], home.target[1], home.target[2], home.width, home.aspect, size.width, size.height])

  // opening on the start view
  useLayoutEffect(() => {
    const [x, z] = groundBelow(start.target, start.azimuth, config.elevation)
    const zoom = clampZoom(frameZoom(start, v.size.width, v.size.height))
    v.cur = { az: start.azimuth, x, z, zoom }
    v.des = { ...v.cur }
    v.ready = true
    apply()
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // the window resized: the same framing in the new size (a zoom on top of it kept)
  const lastSize = useRef(size)
  useLayoutEffect(() => {
    const was = lastSize.current
    if (was.width === size.width && was.height === size.height) return
    const ratio = frameZoom(home, size.width, size.height) / frameZoom(home, was.width, was.height)
    lastSize.current = size
    v.cur.zoom = clampZoom(v.cur.zoom * ratio)
    v.des.zoom = clampZoom(v.des.zoom * ratio)
    apply()
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height])

  /** Puts the three.js camera where the pose says: the only place the camera is positioned or turned */
  function apply() {
    const { az, x, z, zoom } = v.cur
    const off = cameraOffset(az, config.elevation, config.distance)
    camera.position.set(x + off[0], off[1], z + off[2])
    camera.up.set(0, 1, 0)
    camera.lookAt(x, 0, z)
    if (camera.zoom !== zoom) {
      camera.zoom = zoom
      camera.updateProjectionMatrix()
    }
    camera.updateMatrixWorld()
  }

  const bounds = (p: Pose) => {
    const L = config.pan.limit
    p.x = clamp(p.x, v.home.x - L, v.home.x + L)
    p.z = clamp(p.z, v.home.z - L, v.home.z + L)
  }
  const stop = () => {
    v.anchor = null
    v.inertia = null
    v.des = { ...v.cur }
  }

  // eased motion toward the destination, after the controller has had its say (before the scene reads the camera)
  useFrame((_, delta) => {
    if (!v.ready) return
    const dt = Math.min(delta, 0.05)
    let moving = false
    if (v.inertia) {
      const speed = Math.hypot(v.inertia.vx, v.inertia.vy)
      if (speed < config.pan.minInertiaSpeed) v.inertia = null
      else {
        panPixels(-v.inertia.vx * dt * 1000, -v.inertia.vy * dt * 1000)
        const decay = Math.exp(-dt * config.pan.inertiaPerSecond)
        v.inertia.vx *= decay
        v.inertia.vy *= decay
        moving = true
      }
    }
    const { cur, des } = v
    const kRot = 1 - Math.exp(-dt * config.rotate.damping)
    const kZoom = 1 - Math.exp(-dt * config.zoom.damping)
    const kPan = 1 - Math.exp(-dt * config.pan.damping)
    if (cur.az !== des.az) {
      cur.az += (des.az - cur.az) * kRot
      if (Math.abs(des.az - cur.az) < 0.01) cur.az = des.az
      moving = true
    }
    if (cur.zoom !== des.zoom) {
      cur.zoom = Math.exp(Math.log(cur.zoom) + (Math.log(des.zoom) - Math.log(cur.zoom)) * kZoom)
      if (Math.abs(Math.log(des.zoom / cur.zoom)) < 0.0004) cur.zoom = des.zoom
      moving = true
    }
    if (v.anchor) {
      // zooming toward a point: the ground under it stays under it
      const a = v.anchor
      ;[cur.x, cur.z] = lookAtFor(a.g, pose(cur), a.px, a.py, v.size.width, v.size.height)
      ;[des.x, des.z] = lookAtFor(a.g, pose(des), a.px, a.py, v.size.width, v.size.height)
      bounds(cur)
      bounds(des)
      if (cur.zoom === des.zoom && cur.az === des.az) v.anchor = null
    } else if (cur.x !== des.x || cur.z !== des.z) {
      cur.x += (des.x - cur.x) * kPan
      cur.z += (des.z - cur.z) * kPan
      if (Math.hypot(des.x - cur.x, des.z - cur.z) < 0.005) {
        cur.x = des.x
        cur.z = des.z
      }
      moving = true
    }
    if (!moving && !v.dirty) return
    v.dirty = false
    apply()
    if (moving) invalidate()
  }, -1)

  // a pan by pixels, as if the world were dragged by them (the destination moves with it: no easing behind a drag)
  function panPixels(dx: number, dy: number) {
    const [gx, gz] = groundOffsetAt(pose(v.cur), v.size.width / 2 + dx, v.size.height / 2 + dy, v.size.width, v.size.height)
    v.cur.x -= gx
    v.cur.z -= gz
    bounds(v.cur)
    v.des.x = v.cur.x
    v.des.z = v.cur.z
    v.dirty = true
  }

  // the controls
  useEffect(() => {
    const el = gl.domElement
    const pointers = new Map<number, Pointer>()
    const previous = { touchAction: el.style.touchAction, cursor: el.style.cursor }
    el.style.touchAction = 'none'
    let pinch: { d0: number; angle0: number; g: [number, number]; zoom0: number; az0: number; twisting: boolean; base: number } | null = null
    let lastWheel = 0
    let wheelMode: 'zoom' | 'pan' = 'zoom'

    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const ground = (px: number, py: number, p: Pose = v.cur) => groundPointAt(pose(p), px, py, v.size.width, v.size.height)
    const touches = () => [...pointers.values()].filter((p) => p.type !== 'mouse')
    /** Zooms toward a screen point: the ground under it stays under it as the zoom eases */
    const zoomAt = (px: number, py: number, factor: number) => {
      v.anchor = { g: ground(px, py), px, py }
      v.des.zoom = clampZoom(v.des.zoom * factor)
      invalidate()
    }
    const turnTo = (az: number) => {
      v.cur.az = v.des.az = az
      v.dirty = true
      invalidate()
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button > 2) return
      if (e.button === 1) e.preventDefault()
      stop()
      const { x, y } = local(e)
      pointers.set(e.pointerId, {
        x,
        y,
        type: e.pointerType,
        intent: e.pointerType === 'mouse' && (e.button === 2 || (e.button === 0 && (e.altKey || e.ctrlKey))) ? 'rotate' : 'pan',
        mode: 'pending',
        startX: x,
        startY: y,
        ground: [0, 0],
        az0: v.cur.az,
        lastX: x,
        lastY: y,
        lastT: e.timeStamp,
        vx: 0,
        vy: 0
      })
      const t = touches()
      if (t.length === 2) {
        const [a, b] = t
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        pinch = {
          d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          angle0: Math.atan2(b.y - a.y, b.x - a.x) / DEG,
          g: ground(mx, my),
          zoom0: v.cur.zoom,
          az0: v.cur.az,
          twisting: false,
          base: 0
        }
        a.mode = b.mode = 'pinch'
      }
      if (pointers.size === 1) {
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', onUp)
      }
    }

    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId)
      if (!p) return
      const { x, y } = local(e)
      p.x = x
      p.y = y
      const t = touches()
      if (pinch && t.length >= 2 && p.type !== 'mouse') {
        const [a, b] = t
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1
        const twist = shortestTurn(0, Math.atan2(b.y - a.y, b.x - a.x) / DEG - pinch.angle0)
        if (!pinch.twisting && Math.abs(twist) > config.rotate.twistDeadZone) {
          pinch.twisting = true
          pinch.base = twist
        }
        const az = pinch.twisting ? pinch.az0 + (twist - pinch.base) : pinch.az0
        const zoom = clampZoom(pinch.zoom0 * (d / pinch.d0))
        const next: Pose = { az, x: 0, z: 0, zoom }
        ;[next.x, next.z] = lookAtFor(pinch.g, pose(next), mx, my, v.size.width, v.size.height)
        bounds(next)
        v.cur = next
        v.des = { ...next }
        v.dirty = true
        invalidate()
        return
      }
      if (p.mode === 'ignored') return
      if (p.mode === 'pending') {
        if (Math.hypot(x - p.startX, y - p.startY) < config.pan.dragThreshold) return
        // a drag that begins on the gizmo is the gizmo's
        if (api.current.gizmoBusy?.()) {
          p.mode = 'ignored'
          return
        }
        // the grab is where the press was (the camera hasn't moved since), so the drag follows the pointer 1:1
        // from there rather than from where it crossed the threshold
        p.mode = p.intent
        p.az0 = v.cur.az
        p.ground = ground(p.startX, p.startY)
        p.lastX = x
        p.lastY = y
        p.lastT = e.timeStamp
        el.style.cursor = 'grabbing'
      }
      if (p.mode === 'pan') {
        const next: Pose = { ...v.cur }
        ;[next.x, next.z] = lookAtFor(p.ground, pose(v.cur), x, y, v.size.width, v.size.height)
        bounds(next)
        v.cur = next
        v.des = { ...next }
        const dt = Math.max(1, e.timeStamp - p.lastT)
        p.vx = p.vx * 0.5 + ((x - p.lastX) / dt) * 0.5
        p.vy = p.vy * 0.5 + ((y - p.lastY) / dt) * 0.5
        p.lastX = x
        p.lastY = y
        p.lastT = e.timeStamp
        v.dirty = true
        invalidate()
      } else if (p.mode === 'rotate') {
        // dragging right carries the near side of the world right
        turnTo(p.az0 - (x - p.startX) * config.rotate.degreesPerPixel)
      }
    }

    const onUp = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId)
      if (!p) return
      pointers.delete(e.pointerId)
      if (p.mode === 'pan' && e.type === 'pointerup' && e.timeStamp - p.lastT < 80) {
        const speed = Math.hypot(p.vx, p.vy)
        if (speed > 0.15) {
          v.inertia = { vx: p.vx, vy: p.vy }
          invalidate()
        }
      }
      if (pinch && touches().length < 2) {
        pinch = null
        // a finger left on the glass goes on panning from where it is
        for (const q of pointers.values()) {
          q.mode = 'pending'
          q.intent = 'pan'
          q.startX = q.x
          q.startY = q.y
        }
      }
      if (!pointers.size) {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        el.style.cursor = previous.cursor
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? v.size.height : 1
      const dx = e.deltaX * unit
      const dy = e.deltaY * unit
      const { x, y } = local(e)
      if (e.ctrlKey) {
        // a trackpad pinch (or ctrl + wheel)
        zoomAt(x, y, Math.exp(-clamp(dy, -60, 60) * config.zoom.pinchRate))
        return
      }
      if (e.altKey) {
        v.anchor = null
        v.inertia = null
        v.des.az -= (Math.abs(dx) > Math.abs(dy) ? dx : dy) * config.rotate.scrollDegreesPerPixel
        v.cur.az = v.des.az
        v.dirty = true
        invalidate()
        return
      }
      // a gesture is one thing from start to end: a scroll with a sideways part (only a trackpad has one) pans, a
      // plain wheel zooms
      if (e.timeStamp - lastWheel > 120)
        wheelMode = dx !== 0 || e.shiftKey || (e.deltaMode === 0 && !Number.isInteger(dy)) ? 'pan' : 'zoom'
      lastWheel = e.timeStamp
      if (wheelMode === 'pan') {
        v.anchor = null
        v.inertia = null
        panPixels(-dx, -dy)
        v.des = { ...v.cur }
        invalidate()
      } else zoomAt(x, y, Math.exp(-clamp(dy, -240, 240) * config.zoom.wheelRate))
    }

    // Safari reports a trackpad pinch and twist as gesture events, not wheel events
    let gesture = { zoom0: 1, az0: 0 }
    const onGestureStart = (e: Event) => {
      e.preventDefault()
      stop()
      gesture = { zoom0: v.cur.zoom, az0: v.cur.az }
    }
    const onGestureChange = (e: Event) => {
      e.preventDefault()
      if (touches().length) return
      const g = e as Event & { scale: number; rotation: number; clientX: number; clientY: number }
      const { x, y } = local(g)
      const twist = Math.abs(g.rotation) > config.rotate.twistDeadZone ? g.rotation : 0
      v.cur.az = v.des.az = gesture.az0 + twist
      v.anchor = { g: ground(x, y), px: x, py: y }
      v.des.zoom = v.cur.zoom = clampZoom(gesture.zoom0 * g.scale)
      v.dirty = true
      invalidate()
    }

    const onContextMenu = (e: Event) => e.preventDefault()

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('contextmenu', onContextMenu)
    el.addEventListener('gesturestart', onGestureStart)
    el.addEventListener('gesturechange', onGestureChange)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('contextmenu', onContextMenu)
      el.removeEventListener('gesturestart', onGestureStart)
      el.removeEventListener('gesturechange', onGestureChange)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      el.style.touchAction = previous.touchAction
      el.style.cursor = previous.cursor
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, api])

  // centring on a point: the ground it appears over, eased to
  useEffect(() => {
    if (!focus) return
    stop()
    const [x, z] = groundBelow(focus.point, v.cur.az, config.elevation)
    v.des.x = x
    v.des.z = z
    bounds(v.des)
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce])

  // what the editor's panels ask of the camera
  api.current.viewTarget = () => [round(v.cur.x), 0, round(v.cur.z)]
  api.current.currentView = () => {
    const w = v.size.width / v.cur.zoom
    const h = v.size.height / v.cur.zoom
    return {
      // the approved view is a framing: it's always kept at the default direction, which "Reset camera" returns to
      azimuth: config.defaultAzimuth,
      elevation: round(config.elevation, 3),
      target: [round(v.cur.x), 0, round(v.cur.z)],
      width: round(v.size.width / v.size.height > v.home.aspect ? h * v.home.aspect : w),
      aspect: v.home.aspect
    }
  }
  api.current.rotateBy = (degrees: number) => {
    v.anchor = null
    v.inertia = null
    v.des = { ...v.cur, az: v.des.az + degrees }
    // off the unwrapped number line once it's grown, so it can't drift
    if (Math.abs(v.cur.az) > 720) {
      const w = wrapDegrees(v.cur.az) - v.cur.az
      v.cur.az += w
      v.des.az += w
    }
    invalidate()
  }
  api.current.resetCamera = () => {
    v.anchor = null
    v.inertia = null
    v.des = {
      az: v.cur.az + shortestTurn(v.cur.az, config.defaultAzimuth),
      x: v.home.x,
      z: v.home.z,
      zoom: clampZoom(v.home.zoom)
    }
    invalidate()
  }

  // for checking the camera from outside (development only: this whole page is)
  useEffect(() => {
    const w = window as unknown as { __harborCamera?: () => unknown }
    w.__harborCamera = () => {
      const dir = camera.getWorldDirection(new Vector3())
      return {
        orthographic: camera.isOrthographicCamera === true,
        azimuth: round(wrapDegrees(v.cur.az), 3),
        elevation: round(Math.asin(-dir.y) / DEG, 4),
        up: [round(camera.up.x), round(camera.up.y), round(camera.up.z)],
        target: [round(v.cur.x, 4), round(v.cur.z, 4)],
        zoom: round(v.cur.zoom, 4),
        viewWidth: round(v.size.width / v.cur.zoom, 3),
        moving: v.cur.az !== v.des.az || v.cur.zoom !== v.des.zoom || v.cur.x !== v.des.x || v.cur.z !== v.des.z,
        /** Where a world point lands on the canvas, in pixels */
        project: (x: number, y: number, z: number) => {
          const p = new Vector3(x, y, z).project(camera)
          return [round(((p.x + 1) / 2) * v.size.width, 2), round(((1 - p.y) / 2) * v.size.height, 2)]
        },
        /** The ground point shown at a canvas pixel */
        groundAt: (px: number, py: number) => groundPointAt(pose(v.cur), px, py, v.size.width, v.size.height).map((n) => round(n, 4))
      }
    }
    return () => {
      delete w.__harborCamera
    }
  }, [camera, v])

  return null
}
