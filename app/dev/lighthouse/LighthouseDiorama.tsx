'use client'

import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useLayoutEffect, useMemo } from 'react'
import { OrthographicCamera, PCFShadowMap } from 'three'
import { LighthouseTile } from './_components/LighthouseTile'
import { StudioLighting } from './_components/StudioLighting'
import { SEA_DEPTH } from './_lib/world'

// The lighthouse diorama on a studio backdrop: orthographic three-quarter view from the tile's south-east corner,
// orbit and zoom with the mouse.

/** Point the camera looks at: midway up the composition */
const FOCUS: [number, number, number] = [0, 6.4, 0]
/** Elevation of the view above the water, and its distance (orthographic, so distance only sets clipping) */
const ELEVATION = (28 * Math.PI) / 180
const DISTANCE = 60
/** World-space height and width that must stay in frame */
const FRAME_H = 21.5 + SEA_DEPTH * 0.3
const FRAME_W = 15.5

const cameraPosition: [number, number, number] = [
  FOCUS[0] + DISTANCE * Math.cos(ELEVATION) * Math.SQRT1_2,
  FOCUS[1] + DISTANCE * Math.sin(ELEVATION),
  FOCUS[2] + DISTANCE * Math.cos(ELEVATION) * Math.SQRT1_2
]

/** Fit the diorama to the window, and keep zoom limits relative to that fit */
function FitToView() {
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const size = useThree((s) => s.size)
  const fit = useMemo(() => Math.min(size.height / FRAME_H, size.width / FRAME_W), [size])
  useLayoutEffect(() => {
    camera.zoom = fit
    camera.updateProjectionMatrix()
  }, [camera, fit])
  return (
    <OrbitControls
      makeDefault
      target={FOCUS}
      enableDamping
      dampingFactor={0.08}
      minZoom={fit * 0.6}
      maxZoom={fit * 5}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI / 2 - 0.08}
      zoomToCursor
    />
  )
}

export default function LighthouseDiorama() {
  return (
    <div className="fixed inset-0 z-9999 bg-[linear-gradient(#16191b,#2a2e31_45%,#5d6264)]">
      <Canvas
        orthographic
        shadows={{ type: PCFShadowMap }}
        dpr={[1, 2]}
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ position: cameraPosition, zoom: 30, near: 0.1, far: 300 }}
      >
        <StudioLighting />
        <LighthouseTile />
        <FitToView />
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO aoRadius={1.1} distanceFalloff={0.55} intensity={1.8} quality="high" color="#1d1712" halfRes={false} />
          <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.2} intensity={0.45} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <Vignette offset={0.28} darkness={0.35} />
          <SMAA />
        </EffectComposer>
      </Canvas>
      <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center font-mono text-[10px] tracking-[0.2em] uppercase text-white/35">
        Drag to rotate · scroll to zoom · right-drag to pan
      </p>
    </div>
  )
}
