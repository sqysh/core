'use client'

import { OrbitControls } from '@react-three/drei'
import { createRoot, extend, useFrame, useThree } from '@react-three/fiber'
import { ReactNode, RefObject, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  Box3,
  CircleGeometry,
  Group,
  MeshStandardMaterial,
  NeutralToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  RingGeometry,
  Sphere,
  Vector3,
  WebGLRenderer
} from 'three'
import { RenderBoundary } from '@/components/_shared/RenderBoundary'
import { reportError } from '@/lib/utils/reportError'
import { VesselConfig } from '@/lib/vessel/catalog'
import { StudioLighting } from '../lighthouse/_components/StudioLighting'
import { Boat } from './_components/boats/Boats'
import type { Rig } from './_lib/store'
import { lookOf } from './_lib/vessel/look'

// One boat in the Garage: the very model the TV's harbor sails (Boats.tsx), in the same studio lighting, dressed from
// the member's config, on a display platform. None of the coastal world loads. The boat is held above the platform as
// if in a showroom, which also keeps it clear of the waterline the models use to draw their submerged parts, so the
// whole hull, keel, rudder and propeller show. Drag to turn it; it turns itself slowly until touched.
//
// The WebGL context is made here, not by a <Canvas>. On iOS (WebKit) a context can be handed over already lost, and
// then three.js dies inside its constructor (getShaderPrecisionFormat returns null on a lost context). So this
// component makes ONE canvas, after a tick (so React Strict Mode's discarded first mount never opens a context), gets
// a context from it, and checks that it is live before three.js sees it. If it isn't, it tries again on a fresh canvas
// with plainer settings. Only when every attempt fails does it report why and tell its parent (`onUnsupported`), which
// shows its fallback; nothing throws, so a genuinely unsupported device is handled, not crashed.

// <Canvas> registers three's classes for JSX (<mesh>, <hemisphereLight>...); a bare root doesn't, so do it once here
extend(THREE as unknown as Record<string, never>)

/** Sails up and fenders in, as it sails; propeller still */
const SHOWROOM_RIG: Rig = { hoist: 1, moored: false, prop: 0 }
/** Height the boat is held at, clear of the waterline (and of the deepest keel) */
const RAISE = 1.15

/**
 * What to ask the browser for, richest first: each attempt is on a fresh canvas. All WebGL 2: three.js dropped WebGL 1
 * support in r163, so a WebGL 1 context can't run this scene (a device with only that gets the fallback).
 */
const ATTEMPTS: { api: 'webgl2'; attrs: WebGLContextAttributes }[] = [
  { api: 'webgl2', attrs: { antialias: true, alpha: true, depth: true, stencil: false, powerPreference: 'default' } },
  { api: 'webgl2', attrs: { antialias: false, alpha: true, depth: true, stencil: false, powerPreference: 'default' } },
  { api: 'webgl2', attrs: { antialias: false, alpha: true, depth: true, stencil: false, powerPreference: 'low-power' } }
]
/** Waits between attempts (ms): long enough for WebKit to settle after a context is lost */
const RETRY_AFTER = [0, 200, 700]

type Made = { canvas: HTMLCanvasElement; gl: WebGL2RenderingContext }

/** A canvas and a context from it that is genuinely usable (not lost, with real shader precision), or why not */
function makeContext(attempt: (typeof ATTEMPTS)[number], host: HTMLElement): Made | string {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none'
  host.appendChild(canvas)
  let note = ''
  try {
    const gl = canvas.getContext(attempt.api, attempt.attrs) as WebGL2RenderingContext | null
    if (!gl) note = `${attempt.api}: no context`
    else if (gl.isContextLost()) note = `${attempt.api}: context lost at creation`
    else if (!gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT)) note = `${attempt.api}: no shader precision`
    else return { canvas, gl }
  } catch (e) {
    note = `${attempt.api}: ${e instanceof Error ? e.message : String(e)}`
  }
  canvas.remove()
  return note
}

function Platform() {
  const { disc, ring, deck, rim } = useMemo(
    () => ({
      disc: new CircleGeometry(2.4, 72),
      ring: new RingGeometry(2.36, 2.44, 96),
      deck: new MeshStandardMaterial({ color: '#0d2236', roughness: 0.35, metalness: 0.25 }),
      rim: new MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#38bdf8',
        emissiveIntensity: 1.6,
        toneMapped: false
      })
    }),
    []
  )
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={disc} material={deck} receiveShadow />
      <mesh geometry={ring} material={rim} position={[0, 0, 0.002]} />
    </group>
  )
}

/** A slow float, so it feels alive on the stand */
function Floating({ children, innerRef }: { children: ReactNode; innerRef: RefObject<Group | null> }) {
  const ref = innerRef
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = RAISE + Math.sin(clock.elapsedTime * 1.1) * 0.03
  })
  // starts at its height, so the framing (measured on the first frame) already has it on the stand
  return (
    <group ref={ref} position={[0, RAISE, 0]}>
      {children}
    </group>
  )
}

/**
 * Frames the boat: measures its bounding sphere, then sets the camera's distance from the field of view and the view's
 * own aspect ratio (so a long boat fits a narrow portrait screen and a tall mast fits too) and aims the orbit at its
 * centre. Runs again when the class changes or the view changes size; keeps whatever angle the player has turned to.
 */
function AutoFrame({ boat, kind }: { boat: RefObject<Group | null>; kind: string }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const controls = useThree((s) => s.controls) as unknown as { target: Vector3; update: () => void } | null
  const width = useThree((s) => Math.round(s.size.width))
  const height = useThree((s) => Math.round(s.size.height))
  useEffect(() => {
    // after the boat has mounted and its world matrices exist
    const t = window.setTimeout(() => {
      const group = boat.current
      if (!group || !controls || width < 2 || height < 2) return
      const sphere = new Box3().setFromObject(group).getBoundingSphere(new Sphere())
      const vfov = (camera.fov * Math.PI) / 180
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (width / height))
      const distance = (sphere.radius * 1.1) / Math.sin(Math.min(vfov, hfov) / 2)
      const direction = camera.position.clone().sub(controls.target).normalize()
      controls.target.copy(sphere.center)
      camera.position.copy(sphere.center).addScaledVector(direction, distance)
      camera.updateProjectionMatrix()
      controls.update()
    }, 50)
    return () => window.clearTimeout(t)
  }, [boat, camera, controls, kind, width, height])
  return null
}

function Stage({ config }: { config: VesselConfig }) {
  const look = useMemo(() => lookOf(config), [config])
  const kind = config.vesselClass
  const [spinning, setSpinning] = useState(true)
  const boatRef = useRef<Group>(null)
  return (
    <>
      <StudioLighting focus={[0, RAISE, 0]} backdrop={false} shadowRange={4} shadowSoftness={4} shadowMapSize={1024} />
      <Platform />
      <Floating innerRef={boatRef}>
        <Boat kind={kind} look={look} rig={SHOWROOM_RIG} />
      </Floating>
      <AutoFrame boat={boatRef} kind={kind} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        enableDamping
        autoRotate={spinning}
        autoRotateSpeed={0.9}
        minPolarAngle={0.35}
        maxPolarAngle={1.45}
        onStart={() => setSpinning(false)}
      />
    </>
  )
}

type Root = ReturnType<typeof createRoot<HTMLCanvasElement>>

export default function BoatPreview({
  config,
  onReady,
  onUnsupported
}: {
  config: VesselConfig
  /** The first frame is up */
  onReady?: () => void
  /** No usable WebGL context could be made (already reported): show something else */
  onUnsupported?: () => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const [root, setRoot] = useState<Root | null>(null)
  const latest = useRef({ onReady, onUnsupported })
  latest.current = { onReady, onUnsupported }

  // make the canvas, the context and the renderer: once, after a tick, torn down completely when it unmounts
  useEffect(() => {
    const el = host.current
    if (!el) return
    let cancelled = false
    let timer = 0
    let disposeAll = () => {}

    const start = (n: number) => {
      const made = makeContext(ATTEMPTS[n], el)
      if (typeof made === 'string') {
        notes.push(made)
        if (n + 1 < ATTEMPTS.length) timer = window.setTimeout(() => start(n + 1), RETRY_AFTER[n + 1])
        else {
          reportError(
            'garage:preview',
            new Error(`WebGL unavailable after ${ATTEMPTS.length} attempts: ${notes.join('; ')}`)
          )
          latest.current.onUnsupported?.()
        }
        return
      }
      const { canvas, gl } = made
      let renderer: WebGLRenderer
      try {
        renderer = new WebGLRenderer({ canvas, context: gl, alpha: true })
      } catch (e) {
        notes.push(`renderer: ${e instanceof Error ? e.message : String(e)}`)
        canvas.remove()
        if (n + 1 < ATTEMPTS.length) timer = window.setTimeout(() => start(n + 1), RETRY_AFTER[n + 1])
        else {
          reportError(
            'garage:preview',
            new Error(`WebGL unavailable after ${ATTEMPTS.length} attempts: ${notes.join('; ')}`)
          )
          latest.current.onUnsupported?.()
        }
        return
      }
      const r = createRoot(canvas)
      const rect = el.getBoundingClientRect()
      r.configure({
        gl: renderer,
        dpr: [1, 1.75],
        shadows: { type: PCFShadowMap },
        camera: { position: [4.5, 3.2, 5.5], fov: 32, near: 0.1, far: 100 },
        size: { width: rect.width || 1, height: rect.height || 1, top: 0, left: 0 },
        onCreated: ({ gl: g }) => {
          g.toneMapping = NeutralToneMapping
          latest.current.onReady?.()
        }
      })
      // follow the container (rotation, the keyboard, the address bar)
      const ro = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) r.configure({ size: { width, height, top: 0, left: 0 } })
      })
      ro.observe(el)
      disposeAll = () => {
        ro.disconnect()
        r.unmount() // releases the scene and the context
        canvas.remove()
      }
      if (cancelled) disposeAll()
      else setRoot(r)
    }

    const notes: string[] = []
    // after a tick: React Strict Mode's throwaway first mount is cleaned up before this runs, so it never opens a context
    timer = window.setTimeout(() => start(0), 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      disposeAll()
      setRoot(null)
    }
  }, [])

  // dress the boat: render again whenever the config changes
  useEffect(() => {
    if (!root) return
    root.render(
      <RenderBoundary label="garage:scene" onFail={() => latest.current.onUnsupported?.()}>
        <Suspense fallback={null}>
          <Stage config={config} />
        </Suspense>
      </RenderBoundary>
    )
  }, [root, config])

  return <div ref={host} className="absolute inset-0 touch-none" />
}
