'use client'

import { createRoot, extend, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Group, NeutralToneMapping, OrthographicCamera, PCFShadowMap, Vector3, WebGLRenderer } from 'three'
import { RenderBoundary } from '@/components/_shared/RenderBoundary'
import { reportError } from '@/lib/utils/reportError'
import { partsOf, VesselConfig } from '@/lib/vessel/catalog'
import { coastShore, seabed } from './_lib/coast'
import { at } from '../lighthouse/_lib/world'
import { StudioLighting } from '../lighthouse/_components/StudioLighting'
import { Boat } from './_components/boats/Boats'
import type { Rig } from './_lib/store'
import { lookOf } from './_lib/vessel/look'
import { Collar } from './_components/HarborFleet'
import { CHECK_IN_URL } from './_components/HarborStage'
import { HarborWorld } from './_components/HarborWorld'
import type { BoatRuntime } from './_lib/store'
import type { VesselClassSpec } from './_lib/vessel/classes'
import { specOf } from './_lib/vessel/modular'
import { VIEW } from './_lib/view'
import { MOOR_HEADING } from './_lib/harbor'
import { floatOnSwell } from './_lib/vessel/motion'
import { VESSEL_CLASS_SPECS } from './_lib/vessel/classes'
import { STAGE_IDS } from '@/lib/vessel/catalog'
import { setStage } from '@/lib/vessel/items'
import { seaTime } from './_lib/vessel/submerged'

// The Garage's sea: the member's own boat, the very model the TV's harbor sails (Boats.tsx), dressed from their config
// and floating on the approved Check-in Voyage water (the same shader and settings, unchanged) out in open sea, riding
// the shared swell with the harbor's own buoyancy, with foam where the hull meets the water and its keel, rudder and
// propeller showing down through it.
//
// She is moored in the harbor itself: the very world the TV and the phones draw (HarborWorld: the lighthouse island,
// the coast, the rock islet with its pines, the beaches, the baked seabed under the approved sea), just below the
// islet, where its rocks, trees and turquoise shallows frame her from behind and the open water lies in front.
//
// It is seen exactly as the TV sees its harbor: the meeting camera's orthographic projection and its fixed view
// direction (view.ts, VIEW: 45° round, 35° down), with the boat lying at the harbor's moored heading, so she looks just
// as she does riding at anchor on the TV. The one difference is scale: the TV's (34 px a unit at 1080p) would make a
// skiff a speck on a phone, so the Garage brings her close: a skiff fills a good part of her side of the screen and
// bigger boats fill more of it, up to the biggest, which still fits. The camera never moves: dragging turns the boat
// about her mast, and reset turns her back.
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

/** The stretch of shore she lies off, and the way out from it (screen-aligned: u right, v toward the viewer) */
const GARAGE_SHORE = { u: 1.5, v: 3.5, du: 0.35, dv: 1 }

/**
 * Where the Garage moors her: off a stretch of the harbor's shore, as close in as she safely can be, so a little coast
 * frames her from behind (up and to the left on screen) at any size. Searched outward from the shore, in screen-aligned
 * (u, v), for the first spot with water deeper than her draft under her middle and open water all round her ends,
 * however she's turned. A bigger boat simply lies further off.
 */
const SHORE = { u: GARAGE_SHORE.u, v: GARAGE_SHORE.v, du: GARAGE_SHORE.du, dv: GARAGE_SHORE.dv }
type Spot = { x: number; z: number }
const moorings = new Map<string, Spot>()
function mooringFor(dims: VesselClassSpec['dims'], draft: number): Spot {
  const key = `${dims.length.toFixed(2)}:${dims.beam.toFixed(2)}:${draft.toFixed(2)}`
  const hit = moorings.get(key)
  if (hit) return hit
  const reach = Math.hypot(dims.length / 2, dims.beam / 2) + 0.15
  const n = Math.hypot(SHORE.du, SHORE.dv)
  let spot: Spot | null = null
  for (let s = 0.5; s < 14 && !spot; s += 0.1) {
    const [x, z] = at(SHORE.u + (SHORE.du / n) * s, SHORE.v + (SHORE.dv / n) * s)
    let ok = true
    for (let a = 0; a < 16 && ok; a++)
      for (const f of [0, 0.3, 0.6, 1]) {
        const r = reach * f
        const px = x + Math.cos((a / 16) * Math.PI * 2) * r
        const pz = z + Math.sin((a / 16) * Math.PI * 2) * r
        const floor = seabed(px, pz)
        // her middle needs the depth of her keel; her ends, water under them and no land
        if ((f <= 0.3 && floor > -draft) || (f > 0.3 && (floor > -0.3 || coastShore(px, pz) < 0.2))) {
          ok = false
          break
        }
      }
    if (ok) spot = { x, z }
  }
  const found = spot ?? { x: 4.95, z: -14.14 }
  moorings.set(key, found)
  return found
}
/**
 * How far below the waterline she reaches: her hull (less the lift she floats at) and her outboard leg or skeg, or a
 * sailboat's fin keel and bulb, with a little water to spare
 */
const draftOf = (config: VesselConfig, spec: VesselClassSpec) => {
  const rigged =
    config.vesselClass === 'sloop' || (config.vesselClass === 'modular' && partsOf(config).includes('top:mast'))
  return spec.hull.depth - spec.lift + (rigged ? 0.55 * (spec.dims.length / 2.25) + 0.12 : 0.14)
}
/** The meeting camera's distance (orthographic: it only keeps the boat in front of it) */
const CAM_DISTANCE = 30
/** The meeting camera's view direction (VIEW), from the boat toward the camera: never changes */
const VIEW_DIRECTION = new Vector3(
  Math.cos(VIEW.elevation) * Math.sin(VIEW.azimuth),
  Math.sin(VIEW.elevation),
  Math.cos(VIEW.elevation) * Math.cos(VIEW.azimuth)
)

/** What a boat covers on screen in this view, in world units, at any heading: its width, and keel to masthead */
const screenSize = (d: VesselClassSpec['dims']) => ({
  width: 0.78 * (d.length + d.beam) + 0.3,
  height: 0.82 * (d.top + 0.5) + 0.42 * (d.length + d.beam)
})
/** Where the camera aims: the middle of the boat, between its keel and its highest point */
const aimY = (d: VesselClassSpec['dims']) => (d.top - 0.5) / 2

/** Every boat there can be (each vessel level, each heritage class): the scale is set so the biggest of them fits */
const ALL_DIMS: VesselClassSpec['dims'][] = [
  ...STAGE_IDS.map(
    (stage) =>
      specOf(
        setStage(
          {
            vesselClass: 'modular',
            hullColor: '#000000',
            trimColor: '#000000',
            accentColor: '#000000',
            sailColor: '#000000',
            sailPattern: 'plain',
            accessories: [],
            details: { parts: ['fun:garden', 'deck:radar', 'deck:antenna'] }
          },
          stage
        ).config
      ).dims
  ),
  ...Object.values(VESSEL_CLASS_SPECS).map((s) => s.dims)
]

/** How much of her part of the screen a boat fills: the starter skiff, and the biggest boat there is */
const FILL = { smallest: 0.62, biggest: 0.88 }

/** Pixels per world unit at which a boat of these dimensions would just fill her part of the screen */
const fitZoom = (d: VesselClassSpec['dims'], frame: PreviewFrame, width: number, height: number) => {
  const s = screenSize(d)
  return Math.min((width * frame.width) / s.width, (height * frame.height) / s.height)
}

/**
 * The Garage's scale for a boat (pixels per world unit): close enough that she's the main character, and growing on
 * screen as she grows, from the skiff at FILL.smallest of her area to the biggest boat at FILL.biggest, so a bigger
 * boat always looks bigger and none ever crowds the edges or the panel.
 */
const garageZoom = (d: VesselClassSpec['dims'], frame: PreviewFrame, width: number, height: number) => {
  const fit = fitZoom(d, frame, width, height)
  const small = 1 / fitZoom(ALL_DIMS[0], frame, width, height)
  const big = Math.max(...ALL_DIMS.map((x) => 1 / fitZoom(x, frame, width, height)))
  const t = Math.min(1, Math.max(0, (1 / fit - small) / (big - small)))
  return fit * (FILL.smallest + (FILL.biggest - FILL.smallest) * t)
}

/**
 * Where on screen the boat sits and how much of the screen it has, as fractions: held sideways the menu takes the
 * right, so the boat has the left; upright the panel is at the bottom, so the boat has the top.
 */
export type PreviewFrame = { x: number; y: number; width: number; height: number }
const CENTRED: PreviewFrame = { x: 0.5, y: 0.5, width: 1, height: 1 }

/** How the boat is turned by the member: drag sets it, reset brings it back to 0 (the TV's moored heading) */
export type Turn = { yaw: number; spin: number; dragging: boolean; home: boolean }

/** A boat that isn't going anywhere: just enough state for the harbor's buoyancy to float it */
function floater(config: VesselConfig, spec: VesselClassSpec): BoatRuntime {
  return {
    id: 'garage',
    who: { boat: config.vesselClass, spec } as BoatRuntime['who'],
    berth: { x: 0, z: 0 },
    phase: 'moored',
    x: 0,
    z: 0,
    heading: MOOR_HEADING,
    speed: 0,
    turnRate: 0,
    settled: 0,
    y: 0,
    vy: 0,
    roll: 0,
    vRoll: 0,
    pitch: 0,
    vPitch: 0
  } as unknown as BoatRuntime
}

/** Keeps the sea's clock for the boat's under-water parts, as the TV's fleet does */
function SeaClock() {
  useFrame(({ clock }) => {
    seaTime.value = clock.elapsedTime
  })
  return null
}

/** The member's boat afloat: the harbor's buoyancy on the shared swell, a lazy swing, and foam where hull meets water */
function Afloat({
  config,
  look,
  spec,
  name,
  turn,
  spot
}: {
  config: VesselConfig
  look: ReturnType<typeof lookOf>
  spec: VesselClassSpec
  name?: string
  turn: Turn
  spot: Spot
}) {
  const outer = useRef<Group>(null)
  const inner = useRef<Group>(null)
  // one floating boat for the whole visit; a change of build only changes how it rides
  const boat = useMemo(() => floater(config, spec), []) // eslint-disable-line react-hooks/exhaustive-deps
  boat.who = { ...boat.who, boat: config.vesselClass, spec }
  const dims = spec.dims
  useFrame(({ clock }, rawDt) => {
    const t = clock.elapsedTime
    const dt = Math.min(rawDt, 0.05)
    // a flick keeps her turning a moment; reset turns her back the short way to the moored heading
    if (turn.home) {
      turn.yaw = Math.atan2(Math.sin(turn.yaw), Math.cos(turn.yaw))
      turn.yaw *= Math.exp(-6 * dt)
      turn.spin = 0
      if (Math.abs(turn.yaw) < 1e-3) {
        turn.yaw = 0
        turn.home = false
      }
    } else if (!turn.dragging) {
      turn.yaw += turn.spin * dt
      turn.spin *= Math.exp(-4 * dt)
    }
    // lying as the harbor's boats lie at anchor, with the same lazy swing, turned by the member
    boat.heading = MOOR_HEADING + turn.yaw + Math.sin(t * 0.21) * 0.05
    boat.x = spot.x
    boat.z = spot.z
    floatOnSwell(boat, t, dt)
    outer.current?.position.set(boat.x, boat.y, boat.z)
    outer.current?.rotation.set(0, boat.heading - Math.PI / 2, 0)
    inner.current?.rotation.set(boat.roll, 0, boat.pitch)
  })
  return (
    <group ref={outer} position={[spot.x, 0, spot.z]}>
      <Collar length={dims.length} beam={dims.beam} />
      <group ref={inner}>
        <Boat kind={config.vesselClass} look={look} rig={SHOWROOM_RIG} name={name} showroom />
      </group>
    </group>
  )
}

/**
 * The camera: the meeting camera's projection and direction, fixed, aimed at the middle of the boat; one scale for
 * every boat; a view offset puts the boat in its part of the screen. Nothing the member does moves it.
 */
function Framing({ frame, dims, spot }: { frame: PreviewFrame; dims: VesselClassSpec['dims']; spot: Spot }) {
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const width = useThree((s) => Math.round(s.size.width))
  const height = useThree((s) => Math.round(s.size.height))
  useEffect(() => {
    if (width < 2 || height < 2) return
    camera.setViewOffset(width, height, (0.5 - frame.x) * width, (0.5 - frame.y) * height, width, height)
    const target = new Vector3(spot.x, aimY(dims), spot.z)
    camera.position.copy(target).addScaledVector(VIEW_DIRECTION, CAM_DISTANCE)
    camera.lookAt(target)
    camera.zoom = garageZoom(dims, frame, width, height)
    camera.updateProjectionMatrix()
  }, [camera, dims, spot, frame.x, frame.y, frame.width, frame.height, width, height])
  return null
}

function Stage({
  config,
  frame,
  turn,
  name
}: {
  config: VesselConfig
  frame: PreviewFrame
  turn: Turn
  name?: string
}) {
  const look = useMemo(() => lookOf(config), [config])
  const spec = useMemo(() => specOf(config), [config])
  const spot = useMemo(() => mooringFor(spec.dims, draftOf(config, spec)), [config, spec])
  return (
    <>
      <StudioLighting
        focus={[spot.x, 0.6, spot.z]}
        backdrop={false}
        // the phones' shadow map, over the patch of harbor the Garage shows
        shadowRange={8}
        shadowSoftness={6}
        shadowMapSize={1024}
      />
      {/* the harbor's own world and sea, exactly as the TV and the phones draw them */}
      <HarborWorld checkInUrl={CHECK_IN_URL} />
      <SeaClock />
      <Afloat config={config} look={look} spec={spec} name={name} turn={turn} spot={spot} />
      <Framing frame={frame} dims={spec.dims} spot={spot} />
    </>
  )
}

/**
 * Reports once, after the scene has drawn its first frame. It sits beside the stage inside the Suspense boundary, so it
 * only mounts once everything the stage needs has loaded; useFrame runs just before a frame is drawn, so the report
 * waits one more animation frame, until that one has been.
 */
function FirstFrame({ onBuilt, onReady }: { onBuilt: () => void; onReady: () => void }) {
  const reported = useRef(false)
  useFrame(() => {
    if (reported.current) return
    reported.current = true
    // the scene is built and mounted; the frame about to be drawn compiles its shaders
    onBuilt()
    requestAnimationFrame(onReady)
  })
  return null
}

/** What can be measured of the scene coming up (the rest is `onReady`) */
export type SceneLoad = {
  /** The WebGL context and renderer exist */
  engine?: true
  /** The scene is built and mounted (everything it needs has loaded) */
  built?: true
  /** Files the loaders have fetched so far, of those they have been asked for */
  assets?: { loaded: number; total: number }
}

type Root = ReturnType<typeof createRoot<HTMLCanvasElement>>

export default function BoatPreview({
  config,
  frame = CENTRED,
  home = 0,
  name,
  onReady,
  onLoad,
  onUnsupported
}: {
  config: VesselConfig
  /** Where the boat sits on screen (the menu covers the rest) */
  frame?: PreviewFrame
  /** Bump this to turn the boat back to the harbor's moored heading */
  home?: number
  /** The name on the boat's nameplate */
  name?: string
  /** The scene (the sea, the harbor and the boat) has drawn its first frame */
  onReady?: () => void
  /** Measured progress towards the first frame, stage by stage */
  onLoad?: (progress: SceneLoad) => void
  /** No usable WebGL context could be made (already reported): show something else */
  onUnsupported?: () => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const [root, setRoot] = useState<Root | null>(null)
  const latest = useRef({ onReady, onLoad, onUnsupported })
  latest.current = { onReady, onLoad, onUnsupported }
  // files fetched through three's loaders, as they are (the default manager counts every loader that isn't given its own)
  useEffect(() => {
    const m = THREE.DefaultLoadingManager
    const before = { onStart: m.onStart, onProgress: m.onProgress, onLoad: m.onLoad }
    const report = (loaded: number, total: number) => latest.current.onLoad?.({ assets: { loaded, total } })
    m.onStart = (url, loaded, total) => {
      before.onStart?.(url, loaded, total)
      report(loaded, total)
    }
    m.onProgress = (url, loaded, total) => {
      before.onProgress?.(url, loaded, total)
      report(loaded, total)
    }
    m.onLoad = () => {
      before.onLoad?.()
      report(1, 1)
    }
    return () => {
      Object.assign(m, before)
    }
  }, [])
  // the member turns the boat by dragging across her (one finger or the mouse); nothing zooms or pans
  const turn = useRef<Turn>({ yaw: 0, spin: 0, dragging: false, home: false }).current
  const drag = useRef<{ id: number; x: number; t: number } | null>(null)
  const fingers = useRef(new Set<number>())
  const firstHome = useRef(home)
  useEffect(() => {
    if (home !== firstHome.current) turn.home = true
  }, [home, turn])

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
      // three.js writes the canvas's CSS size in pixels on every resize, from a measured rectangle that can be a
      // fraction short of the container's, which leaves a bare strip at its edge. Leave the CSS to the layout (the
      // canvas is 100% of its container, from makeContext) and let three size only the drawing buffer.
      const setBufferSize = renderer.setSize.bind(renderer)
      renderer.setSize = (w, h) => setBufferSize(w, h, false)
      const r = createRoot(canvas)
      const rect = el.getBoundingClientRect()
      r.configure({
        gl: renderer,
        dpr: [1, 1.75],
        shadows: { type: PCFShadowMap },
        orthographic: true,
        camera: {
          position: [20, 17, 20],
          zoom: 120,
          near: 0.1,
          far: 200
        },
        size: { width: rect.width || 1, height: rect.height || 1, top: 0, left: 0 },
        onCreated: ({ gl: g }) => {
          g.toneMapping = NeutralToneMapping
        }
      })
      // the engine is up. Say so now and let the browser draw that before the scene is built, which keeps the main
      // thread busy for a while: the stage and its status are then on screen while it works, not after
      latest.current.onLoad?.({ engine: true })
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
      else
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (!cancelled) setRoot(r)
          })
        )
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
          <Stage config={config} frame={frame} turn={turn} name={name} />
          <FirstFrame
            onBuilt={() => latest.current.onLoad?.({ built: true })}
            onReady={() => latest.current.onReady?.()}
          />
        </Suspense>
      </RenderBoundary>
    )
  }, [root, config, frame, turn, name])

  // a full turn for a drag across about half the screen; a second finger (a pinch) is ignored
  const RADIANS_PER_PX = 0.012
  return (
    <div
      ref={host}
      className="absolute inset-0 touch-none select-none"
      onPointerDown={(e) => {
        fingers.current.add(e.pointerId)
        // a second finger (a pinch) stops the turn: pinching does nothing here
        if (fingers.current.size > 1) {
          drag.current = null
          Object.assign(turn, { dragging: false, spin: 0 })
          return
        }
        drag.current = { id: e.pointerId, x: e.clientX, t: performance.now() }
        e.currentTarget.setPointerCapture(e.pointerId)
        Object.assign(turn, { dragging: true, home: false, spin: 0 })
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d || d.id !== e.pointerId || fingers.current.size > 1) return
        const now = performance.now()
        const dyaw = (e.clientX - d.x) * RADIANS_PER_PX
        turn.yaw += dyaw
        turn.spin = dyaw / Math.max((now - d.t) / 1000, 1 / 120)
        drag.current = { ...d, x: e.clientX, t: now }
      }}
      onPointerUp={(e) => {
        fingers.current.delete(e.pointerId)
        const d = drag.current
        if (!d || d.id !== e.pointerId) return
        drag.current = null
        turn.dragging = false
        // only a flick that was still moving when the finger lifted carries on
        if (performance.now() - d.t > 80) turn.spin = 0
      }}
      onPointerCancel={(e) => {
        fingers.current.delete(e.pointerId)
        drag.current = null
        Object.assign(turn, { dragging: false, spin: 0 })
      }}
    />
  )
}
