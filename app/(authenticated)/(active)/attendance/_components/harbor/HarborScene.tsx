'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { EXTEND_H, ISLAND_LAYERS, SCENE_H, SCENE_W } from '@/app/(authenticated)/(active)/attendance/_lib/harborMap'
import { WATERLINE } from '@/app/(authenticated)/(active)/attendance/_lib/boats'
import { FleetBoat } from '@/app/(authenticated)/(active)/attendance/_hooks/useHarbor'
import { HarborBoat, Nameplate } from './HarborBoat'
import { LighthouseCutout, LighthouseLight, SCENE_SRC } from './Lighthouse'
import { DriftingClouds, Seabirds } from './Sky'
import { Water } from './Water'
import { Storm } from './Storm'
import { Swells } from './Swells'
import { SkyRenderer, StormSky } from './StormSky'
import './harbor.css'

/** Open sea carried below the picture, overlapping its last rows so the two blend with no seam */
const SEA_OVERLAP = 90
const SEA_SRC = '/images/harbor/sea-extension.webp'

/** Fit the picture to the screen's width and hang it from the top; the rest of the screen is sea */
function useSceneScale() {
  const [view, setView] = useState({ w: 1920, h: 1080 })
  useEffect(() => {
    const onResize = () => setView({ w: window.innerWidth, h: window.innerHeight })
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const scale = view.w / SCENE_W
  return { scale }
}

// Layers, back to front, all in the picture's own pixels: the picture, drifting clouds, the tower cut out so clouds
// pass behind it, the lamp and beam, gulls, moving water, then one depth-sorted layer where boats, their wakes and
// slices of the island stack by how far away they are, and finally the nameplates.
export function HarborScene({
  fleet,
  honks = {},
  stormKey = 0,
  swellKey = 0
}: {
  fleet: FleetBoat[]
  honks?: Record<string, number>
  /** Counts up each time a storm should start */
  stormKey?: number
  /** Counts up to send a swell through now */
  swellKey?: number
}) {
  const root = useRef<HTMLDivElement>(null)
  const skyRef = useRef<SkyRenderer | null>(null)
  const { scale } = useSceneScale()
  const [depthLayer, setDepthLayer] = useState<HTMLDivElement | null>(null)
  const [plates, setPlates] = useState<Record<string, HTMLDivElement>>({})

  const registerPlate = useCallback((id: string, el: HTMLDivElement | null) => {
    if (!el) return
    setPlates((prev) => (prev[id] === el ? prev : { ...prev, [id]: el }))
  }, [])

  return (
    <div ref={root} className="absolute inset-0 overflow-hidden" style={{ background: '#0a56a8' }}>
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <clipPath id="harbor-above-water" clipPathUnits="userSpaceOnUse">
            <rect x="-40" y="-40" width="320" height={WATERLINE + 41} />
          </clipPath>
        </defs>
      </svg>

      <div
        className="absolute left-0"
        style={{
          top: 0,
          width: SCENE_W,
          height: SCENE_H + EXTEND_H,
          transform: `scale(${scale})`,
          transformOrigin: '0 0'
        }}
      >
        <img
          src={SCENE_SRC}
          alt="A lighthouse on a rocky island in a calm blue sea"
          className="absolute left-0 top-0"
          style={{ width: SCENE_W, height: SCENE_H }}
        />
        <img
          src={SEA_SRC}
          alt=""
          className="pointer-events-none absolute left-0"
          style={{ top: SCENE_H - SEA_OVERLAP, width: SCENE_W, height: EXTEND_H }}
        />
        <DriftingClouds />
        <StormSky skyRef={skyRef} />
        <LighthouseCutout />
        <LighthouseLight />
        <Seabirds />
        <Water />
        <Swells depthLayer={depthLayer} triggerKey={swellKey} />

        <div ref={setDepthLayer} className="absolute inset-0 isolate">
          {ISLAND_LAYERS.map((l) => (
            <img
              key={l.src}
              src={l.src}
              alt=""
              className="pointer-events-none absolute"
              style={{ left: l.x, top: l.y, width: l.w, height: l.h, zIndex: l.z }}
            />
          ))}
          {fleet.map((b) => (
            <HarborBoat key={b.id} boat={b} depthLayer={depthLayer} plateEl={plates[b.id] ?? null} />
          ))}
        </div>

        {/* the storm darkens everything under the nameplates, which stay readable */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: '#0b1530', opacity: 'calc(var(--storm, 0) * 0.5)' }}
          aria-hidden="true"
        />

        <div className="pointer-events-none absolute inset-0">
          {fleet.map((b) => (
            <Nameplate key={b.id} boat={b} register={registerPlate} honk={honks[b.id] ?? 0} />
          ))}
        </div>
      </div>
      <Storm runKey={stormKey} root={root} skyRef={skyRef} />
    </div>
  )
}
