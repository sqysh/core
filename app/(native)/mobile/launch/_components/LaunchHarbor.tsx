'use client'

import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import { NeutralToneMapping, PCFShadowMap } from 'three'
import { HarborStage } from '@/components/harbor/HarborStage'
import { createStore } from '@/lib/harbor/store'
import { LanternStyle } from '@/lib/lighthouse/lanternStyle'
import { LaunchCamera } from './LaunchCamera'
import { LaunchLook } from './LaunchLook'
import { GraniteCliff } from './granite/GraniteCliff'

// The Check-in Voyage harbor as the launch screen's backdrop: the same world, sea and approved lighting, with no fleet,
// framed by its own camera and given its own warmer light and sea (LaunchLook), with the lighthouse's
// Fresnel lantern. Phone weight, like PhoneHarbor: no post-processing, a small shadow map, capped resolution.

const NO_BOATS: string[] = []

export default function LaunchHarbor({ signingIn, onReady }: { signingIn: boolean; onReady?: () => void }) {
  const store = useMemo(() => createStore(), [])
  return (
    <Canvas
      orthographic
      shadows={{ type: PCFShadowMap }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping
      }}
    >
      {/* the lighthouse here has the glazed lantern with its turning Fresnel lens */}
      <LanternStyle.Provider value="fresnel">
        <HarborStage store={store} ids={NO_BOATS} shadowMapSize={1024} onReady={onReady} />
      </LanternStyle.Provider>
      {/* North Shore granite on the cliff under the lighthouse, seen from the sign-in view behind the island */}
      <GraniteCliff />
      <LaunchLook />
      <LaunchCamera signingIn={signingIn} />
    </Canvas>
  )
}
