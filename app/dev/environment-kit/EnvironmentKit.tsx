'use client'

import { Canvas } from '@react-three/fiber'
import { ReactNode, useState } from 'react'
import { NeutralToneMapping, PCFShadowMap } from 'three'
import { useAssetBuild } from '@/lib/environment/EnvironmentAsset'
import { AssetBuild, AssetCategory, AssetRecipe, Level, LODS } from '@/lib/environment/core/types'
import { ASSETS } from '@/lib/environment/registry'
import { CAMERA_VIEWS, CameraLink, cameraLink, CameraView } from './_components/CameraRig'
import { AssetPanel, CompareLabel, StatsBar, ViewPanel } from './_components/Panels'
import { FrameStats } from './_components/RenderStats'
import { DEFAULT_SETTINGS, GroundKind, WorkshopSettings } from './_components/settings'
import { WorkshopScene } from './_components/WorkshopScene'
import Composition from './_composition/Composition'

// The environment asset workshop: pick an asset and a variation, look at it from anywhere on test ground made to show
// whether it sits naturally, under adjustable light, and see what it costs to draw. Assets are built here exactly as
// the world will build them (lib/environment), so what's approved here is what goes in. Assets made from a master model
// can be shown side by side with the master: two views of the same ground under the same light, one camera.
// Composition mode (?mode=composition) sets them all together with the world's own lighthouse, cottage and a vessel,
// to settle the world's scale.

type Mode = 'workshop' | 'composition'

function ModeSwitch({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) {
  return (
    <div className="mb-4 flex rounded-xl border border-white/15 bg-white/5 p-0.5 text-xs">
      {(['workshop', 'composition'] as Mode[]).map((m) => (
        <button
          key={m}
          onClick={() => onMode(m)}
          className={`flex-1 rounded-[0.6rem] px-3 py-1.5 capitalize transition-colors ${mode === m ? 'bg-sky-400/30 text-white' : 'text-white/60 hover:text-white'}`}
        >
          {m}
        </button>
      ))}
    </div>
  )
}

export default function EnvironmentKit() {
  const [mode, setMode] = useState<Mode>(() => (new URLSearchParams(window.location.search).get('mode') === 'composition' ? 'composition' : 'workshop'))
  const onMode = (m: Mode) => {
    setMode(m)
    const q = new URLSearchParams(window.location.search)
    if (m === 'composition') q.set('mode', m)
    else q.delete('mode')
    window.history.replaceState(null, '', `${window.location.pathname}${q.size ? `?${q}` : ''}`)
  }
  const modeSwitch = <ModeSwitch mode={mode} onMode={onMode} />
  return mode === 'composition' ? <Composition modeSwitch={modeSwitch} /> : <Workshop modeSwitch={modeSwitch} />
}

/** A starting setup from the address (?asset=…&seed=3&lod=high&view=close&ground=uneven&finish=0&compare=1), so a view can be shared */
function fromUrl() {
  const q = new URLSearchParams(window.location.search)
  const recipe = ASSETS.find((a) => a.id === q.get('asset') && a.status === 'ready') ?? ASSETS.find((a) => a.status === 'ready') ?? null
  const asked = q.get('lod') ?? ''
  const level: Level = (LODS as string[]).includes(asked) ? (asked as Level) : asked === 'original' && recipe?.original ? 'original' : 'medium'
  const view = CAMERA_VIEWS.some((v) => v.id === q.get('view')) ? (q.get('view') as CameraView) : 'overview'
  const ground = q.get('ground') ?? q.get('terrain') ?? ''
  return {
    recipe,
    seed: Math.max(1, Math.floor(Number(q.get('seed')) || 1)),
    level,
    view,
    compare: q.get('compare') === '1' && Boolean(recipe?.original),
    settings: {
      ...DEFAULT_SETTINGS,
      ground: ['diorama', 'flat', 'uneven', 'shoreline'].includes(ground) ? (ground as GroundKind) : DEFAULT_SETTINGS.ground,
      finish: q.get('finish') !== '0',
      wireframe: q.get('wireframe') === '1'
    }
  }
}

function Viewport({
  build,
  settings,
  view,
  viewNonce,
  camera,
  onStats
}: {
  build: AssetBuild | null
  settings: WorkshopSettings
  view: CameraView
  viewNonce: number
  camera?: { lead?: CameraLink; follow?: CameraLink }
  onStats?: (s: FrameStats) => void
}) {
  return (
    <Canvas
      style={{ position: 'absolute', inset: 0 }}
      orthographic
      shadows={{ type: PCFShadowMap }}
      dpr={[1, 2]}
      camera={{ position: [30, 22, 30], zoom: 60, near: 0.1, far: 300 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping
      }}
    >
      <WorkshopScene build={build} settings={settings} view={view} viewNonce={viewNonce} camera={camera} onStats={onStats} />
    </Canvas>
  )
}

function Workshop({ modeSwitch }: { modeSwitch: ReactNode }) {
  const [start] = useState(fromUrl)
  const [category, setCategory] = useState<AssetCategory>(start.recipe?.category ?? 'granite')
  const [recipe, setRecipe] = useState<AssetRecipe | null>(start.recipe)
  const [seed, setSeed] = useState(start.seed)
  const [level, setLevel] = useState<Level>(start.level)
  const [compare, setCompare] = useState(start.compare)
  const [settings, setSettings] = useState<WorkshopSettings>(start.settings)
  const [view, setView] = useState<CameraView>(start.view)
  const [viewNonce, setViewNonce] = useState(0)
  const [frame, setFrame] = useState<FrameStats | null>(null)
  const [link] = useState(cameraLink)

  const comparing = compare && Boolean(recipe?.original)
  // side by side: the master on the left, the chosen level (high, if the master itself is chosen) on the right
  const shown: Level = comparing && level === 'original' ? 'high' : level
  const { build, building } = useAssetBuild(recipe, seed, shown)
  const original = useAssetBuild(comparing ? recipe : null, seed, 'original')

  return (
    <div className="fixed inset-0 z-[60] bg-[#1d2124]">
      {comparing ? (
        <div className="absolute inset-0 flex">
          <div className="relative h-full w-1/2 border-r border-white/10">
            <Viewport build={original.build} settings={settings} view={view} viewNonce={viewNonce} camera={{ lead: link }} />
            <CompareLabel level="original" recipe={recipe} build={original.build} building={original.building} />
          </div>
          <div className="pointer-events-none relative h-full w-1/2">
            <Viewport build={build} settings={settings} view={view} viewNonce={viewNonce} camera={{ follow: link }} onStats={setFrame} />
            <CompareLabel level={shown} recipe={recipe} build={build} building={building} />
          </div>
        </div>
      ) : (
        <Viewport build={build} settings={settings} view={view} viewNonce={viewNonce} onStats={setFrame} />
      )}

      <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-4">
        <AssetPanel
          header={modeSwitch}
          category={category}
          onCategory={(c) => {
            setCategory(c)
            setRecipe(ASSETS.find((a) => a.category === c && a.status === 'ready') ?? null)
            setSeed(1)
          }}
          recipe={recipe}
          onRecipe={(r) => {
            setRecipe(r)
            setSeed(1)
            if (level === 'original' && !r.original) setLevel('medium')
          }}
          seed={seed}
          onSeed={setSeed}
          level={level}
          onLevel={setLevel}
          compare={comparing}
          onCompare={setCompare}
        />
        <ViewPanel
          settings={settings}
          onChange={(p) => setSettings((s) => ({ ...s, ...p }))}
          view={view}
          onView={(v) => {
            setView(v)
            setViewNonce((n) => n + 1)
          }}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
        <StatsBar recipe={recipe} level={shown} build={build} building={building} frame={frame} />
      </div>
    </div>
  )
}
