'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { StudioLighting } from '../lighthouse/StudioLighting'
import { HarborStore } from '../../lib/harbor/store'
import { VIEW } from '../../lib/harbor/view'
import { AnchorField } from './AnchorField'
import { HarborFleet } from './HarborFleet'
import { HarborWorld } from './HarborWorld'
import { WakeField } from './WakeField'

// The harbor itself, as both the TV board and the phones draw it: the diorama's lighting, the world, the fleet, its
// wakes and anchors. Each screen adds its own camera and finish around it.

export const CHECK_IN_URL = 'https://coastalreferralxchange.com/check-in'

/** Reports once the harbor has painted a few frames, i.e. after the scene is built and its shaders are compiled */
function ReadySignal({ onReady }: { onReady?: () => void }) {
  const frames = useRef(0)
  useFrame(() => {
    if (++frames.current === 4) onReady?.()
  })
  return null
}

export function HarborStage({
  store,
  ids,
  shadowMapSize = 4096,
  onReady
}: {
  store: HarborStore
  ids: string[]
  shadowMapSize?: number
  onReady?: () => void
}) {
  return (
    <>
      {/* the diorama's own lighting rig over the whole harbor; no studio backdrop here */}
      <StudioLighting
        focus={[VIEW.target.x, 0, VIEW.target.z]}
        backdrop={false}
        shadowRange={40}
        shadowSoftness={10}
        shadowMapSize={shadowMapSize}
      />
      <ReadySignal onReady={onReady} />
      <HarborWorld checkInUrl={CHECK_IN_URL} />
      <HarborFleet store={store} ids={ids} />
      <WakeField store={store} />
      <AnchorField store={store} />
    </>
  )
}
