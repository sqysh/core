'use client'

import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PCFShadowMap } from 'three'
import { CoastalTile } from '../lighthouse/_components/CoastalTile'
import { LighthouseTile } from '../lighthouse/_components/LighthouseTile'
import { StudioLighting } from '../lighthouse/_components/StudioLighting'
import { tileOrigin } from '../lighthouse/_lib/world'
import { CameraMode, CameraRig } from './_components/CameraRig'
import { Fleet } from './_components/Fleet'
import { WorldTerrain } from './_components/WorldTerrain'
import { createFleetState } from './_lib/fleet'
import { routeClearance } from './_lib/route'
import { TILES, WORLD_CENTER } from './_lib/worldMap'

// A 2 × 2 connected stretch of the CORE world with a test fleet sailing a loop through it.
// Temporary development controls along the bottom.

const ZOOM_MIN = 0.6
const ZOOM_MAX = 2.5

function World() {
  return (
    <>
      {TILES.map((t) =>
        t.lighthouse ? (
          <LighthouseTile key={t.key} col={t.col} row={t.row} sides={t.sides} shore={t.shore} />
        ) : (
          <CoastalTile
            key={t.key}
            position={tileOrigin(t.col, t.row)}
            shore={t.shore}
            sides={t.sides}
            beachDetail={150}
          />
        )
      )}
      <WorldTerrain />
    </>
  )
}

export default function Voyage() {
  const fleet = useMemo(() => createFleetState(), [])
  const view = useRef({ zoom: 1, orbit: 0 })
  const [playing, setPlaying] = useState(false)
  const [mode, setMode] = useState<CameraMode>('overview')
  const [zoom, setZoom] = useState(1)
  const [resetKey, setResetKey] = useState(0)
  const [seek] = useState(() =>
    typeof window === 'undefined' ? 0 : Number(new URLSearchParams(window.location.search).get('seek')) || 0
  )
  const drag = useRef<{ x: number; orbit: number } | null>(null)

  useEffect(() => {
    // ?play=1 and ?cam=follow start the voyage straight away (handy on the TV, where there's no mouse);
    // ?seek=20 starts 20 units along the route, already under way
    const q = new URLSearchParams(window.location.search)
    if (q.get('play') === '1') setPlaying(true)
    if (q.get('cam') === 'follow') setMode('follow')
    // dev guard: the route must keep clear of every shore, lanes included
    const c = routeClearance(0.3)
    if (c.min < 0.5)
      console.warn(
        `[voyage] route passes within ${c.min.toFixed(2)} of shore near (${c.x.toFixed(1)}, ${c.z.toFixed(1)})`
      )
  }, [])

  const applyZoom = (z: number) => {
    const v = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))
    view.current.zoom = v
    setZoom(v)
  }
  const switchMode = (m: CameraMode) => {
    view.current.orbit = 0
    applyZoom(1)
    setMode(m)
  }

  return (
    <div
      className="fixed inset-0 z-9999 touch-none select-none bg-[linear-gradient(#16191b,#2a2e31_45%,#5d6264)]"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('[data-controls]')) return
        drag.current = { x: e.clientX, orbit: view.current.orbit }
      }}
      onPointerMove={(e) => {
        if (drag.current) view.current.orbit = drag.current.orbit - (e.clientX - drag.current.x) * 0.006
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => (drag.current = null)}
      onWheel={(e) => applyZoom(view.current.zoom * Math.exp(-e.deltaY * 0.0012))}
    >
      <Canvas
        orthographic
        shadows={{ type: PCFShadowMap }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ position: [WORLD_CENTER[0] + 40, 40, WORLD_CENTER[1] + 40], zoom: 20, near: 0.1, far: 220 }}
      >
        <StudioLighting focus={[WORLD_CENTER[0], 0, WORLD_CENTER[1]]} />
        <World />
        <Fleet state={fleet} playing={playing} resetKey={resetKey} seek={resetKey === 0 ? seek : 0} />
        <CameraRig state={fleet} mode={mode} view={view.current} />
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO
            aoRadius={1.0}
            distanceFalloff={0.55}
            intensity={1.8}
            quality="medium"
            color="#1d1712"
            halfRes={false}
          />
          <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.2} intensity={0.45} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <Vignette offset={0.28} darkness={0.35} />
          <SMAA />
        </EffectComposer>
      </Canvas>

      <div
        data-controls
        className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-white/80 backdrop-blur-md"
      >
        <Btn active={playing} onClick={() => setPlaying(true)}>
          Start
        </Btn>
        <Btn active={!playing} onClick={() => setPlaying(false)}>
          Pause
        </Btn>
        <Btn
          onClick={() => {
            setPlaying(false)
            setResetKey((k) => k + 1)
          }}
        >
          Reset
        </Btn>
        <span className="mx-1 h-5 w-px bg-white/15" />
        <Btn active={mode === 'overview'} onClick={() => switchMode('overview')}>
          Overview
        </Btn>
        <Btn active={mode === 'follow'} onClick={() => switchMode('follow')}>
          Follow
        </Btn>
        <span className="mx-1 h-5 w-px bg-white/15" />
        <Btn onClick={() => applyZoom(zoom / 1.2)}>−</Btn>
        <input
          aria-label="Camera zoom"
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.01}
          value={zoom}
          onChange={(e) => applyZoom(Number(e.target.value))}
          className="w-28 accent-teal-300"
        />
        <Btn onClick={() => applyZoom(zoom * 1.2)}>+</Btn>
      </div>
      <p className="pointer-events-none absolute left-0 right-0 top-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
        Voyage prototype · drag to turn · scroll to zoom
      </p>
    </div>
  )
}

function Btn({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`h-8 min-w-8 rounded-full px-3 transition-colors ${active ? 'bg-white/90 text-[#16191b]' : 'hover:bg-white/10'}`}
    >
      {children}
    </button>
  )
}
