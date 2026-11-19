'use client'

import { useCallback, useEffect, useState } from 'react'
import { ISLAND_LAYERS, SCENE_H, SCENE_W } from '../../_lib/harborMap'
import { WATERLINE } from '../../_lib/boats'
import { FleetBoat } from '../../_hooks/useHarbor'
import { HarborBoat, Nameplate } from './HarborBoat'
import { LighthouseCutout, LighthouseLight, SCENE_SRC } from './Lighthouse'
import { DriftingClouds, Seabirds } from './Sky'
import { Water } from './Water'
import './harbor.css'

/** The picture's own top row, stretched up to fill taller screens, deepening a touch toward the top */
const SKY =
  'linear-gradient(to bottom, rgba(20,60,150,0.35), rgba(20,60,150,0) 70%), url(/images/harbor/sky-top.webp) 0 0 / 100% 100%'

/** Fit the picture to the screen's width, anchored to the bottom; anything taller gets more sky */
function useSceneScale() {
  const [view, setView] = useState({ w: 1920, h: 1080 })
  useEffect(() => {
    const onResize = () => setView({ w: window.innerWidth, h: window.innerHeight })
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const scale = view.w / SCENE_W
  return { scale, top: view.h - SCENE_H * scale }
}

// Layers, back to front, all in the picture's own pixels: the picture, drifting clouds, the tower cut out so clouds
// pass behind it, the lamp and beam, gulls, moving water, then one depth-sorted layer where boats, their wakes and
// slices of the island stack by how far away they are, and finally the nameplates.
export function HarborScene({ fleet }: { fleet: FleetBoat[] }) {
  const { scale, top } = useSceneScale()
  const [depthLayer, setDepthLayer] = useState<HTMLDivElement | null>(null)
  const [plates, setPlates] = useState<Record<string, HTMLDivElement>>({})

  const registerPlate = useCallback((id: string, el: HTMLDivElement | null) => {
    if (!el) return
    setPlates((prev) => (prev[id] === el ? prev : { ...prev, [id]: el }))
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: SKY }}>
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <clipPath id="harbor-above-water" clipPathUnits="userSpaceOnUse">
            <rect x="-40" y="-40" width="320" height={WATERLINE + 41} />
          </clipPath>
        </defs>
      </svg>

      <div
        className="absolute left-0"
        style={{ top, width: SCENE_W, height: SCENE_H, transform: `scale(${scale})`, transformOrigin: '0 0' }}
      >
        <img
          src={SCENE_SRC}
          alt="A lighthouse on a rocky island in a calm blue sea"
          className="absolute left-0 top-0 h-full w-full"
        />
        <DriftingClouds />
        <LighthouseCutout />
        <LighthouseLight />
        <Seabirds />
        <Water />

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

        <div className="pointer-events-none absolute inset-0">
          {fleet.map((b) => (
            <Nameplate key={b.id} boat={b} register={registerPlate} />
          ))}
        </div>
      </div>
    </div>
  )
}
