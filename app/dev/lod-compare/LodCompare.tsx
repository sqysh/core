'use client'

import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useLayoutEffect, useState } from 'react'
import { Material, NeutralToneMapping, OrthographicCamera, PCFShadowMap, Vector3 } from 'three'
import { FrameStats, RenderStats } from '@/app/dev/harbor-builder/_components/RenderStats'
import { StudioLighting } from '@/components/lighthouse/StudioLighting'
import { LoadedModel, loadModel } from '@/app/dev/harbor-builder/_lib/models'

type LODLevel = 'high' | 'medium' | 'low'
const LEVELS: LODLevel[] = ['high', 'medium', 'low']

const TEST_MODELS = [
  { id: 'lighthouse', name: 'Lighthouse', file: 'structures/lighthouse-tall-01.glb', worldSize: 13.5, by: 'height' as const },
  { id: 'cliff', name: 'Cliff plateau', file: 'terrain/03-cliff-plateau.glb', worldSize: 12, by: 'width' as const },
  { id: 'pine', name: 'Pine tree', file: 'trees/pine-tall-bright-01.glb', worldSize: 5.2, by: 'height' as const },
  { id: 'oak', name: 'Ornamental oak', file: 'trees/ornamental-compact-01.glb', worldSize: 3.5, by: 'height' as const },
  { id: 'bridge', name: 'Stone bridge', file: 'structures/stone-bridge.glb', worldSize: 8, by: 'width' as const },
  { id: 'overhang', name: 'Grassy overhang', file: 'terrain/grassy-cliff-overhang-01.glb', worldSize: 10, by: 'width' as const },
  { id: 'jetty-cliff', name: 'Wooden jetty to cliff', file: 'terrain/jetti-connector-cliff-01.glb', worldSize: 8, by: 'width' as const },
  { id: 'sandy-connector', name: 'Sandy jetty to cliff', file: 'terrain/sandy-jetti-connector-01.glb', worldSize: 8, by: 'width' as const },
  { id: 'sandy-strip', name: 'Sandy jetty strip', file: 'islands/sandy-jetti.glb', worldSize: 8, by: 'width' as const }
]

const ENV = '/models/environment'
const LOD = '/models/environment-derived/lod'

function computeScale(model: LoadedModel, worldSize: number, by: 'height' | 'width') {
  const s = model.box.getSize(new Vector3())
  return worldSize / (by === 'height' ? s.y : Math.max(s.x, s.z))
}

function computePivot(model: LoadedModel): [number, number, number] {
  const b = model.box
  return [-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2]
}

type ModelSet = { high: LoadedModel; medium: LoadedModel; low: LoadedModel }

function ModelInstance({
  model,
  highMaterial,
  s,
  piv
}: {
  model: LoadedModel
  highMaterial: Material
  s: number
  piv: [number, number, number]
}) {
  return (
    <group scale={[s, s, s]}>
      <mesh geometry={model.geometry} material={highMaterial} position={piv} castShadow receiveShadow />
    </group>
  )
}

function zoomTo(camera: OrthographicCamera, zoom: number) {
  camera.zoom = zoom
  camera.updateProjectionMatrix()
}

function CameraFit({ worldSize }: { worldSize: number }) {
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const width = useThree((s) => s.size.width)
  useLayoutEffect(() => {
    zoomTo(camera, width / (worldSize * 7))
  }, [worldSize, width, camera])
  return null
}

function Scene({
  models,
  worldSize,
  by,
  onStats
}: {
  models: ModelSet
  worldSize: number
  by: 'height' | 'width'
  onStats: (s: FrameStats) => void
}) {
  const s = computeScale(models.high, worldSize, by)
  const piv = computePivot(models.high)
  const spacing = worldSize * 1.5

  return (
    <>
      <StudioLighting focus={[0, worldSize * 0.3, 0]} shadowRange={worldSize * 2} shadowSoftness={4} shadowMapSize={1024} backdrop={false} />

      {/* Original (left) */}
      <group position={[-spacing, 0, 0]}>
        <ModelInstance model={models.high} highMaterial={models.high.material} s={s} piv={piv} />
      </group>

      {/* Medium (center) — uses High's material for textures */}
      <group position={[0, 0, 0]}>
        <ModelInstance model={models.medium} highMaterial={models.high.material} s={s} piv={piv} />
      </group>

      {/* Low (right) — uses High's material for textures */}
      <group position={[spacing, 0, 0]}>
        <ModelInstance model={models.low} highMaterial={models.high.material} s={s} piv={piv} />
      </group>

      {/* Ground plane for shadow reception */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[worldSize * 10, worldSize * 10]} />
        <meshStandardMaterial color="#2d5577" />
      </mesh>

      <CameraFit worldSize={worldSize} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} zoomToCursor />
      <RenderStats onStats={onStats} />
    </>
  )
}

const LEVEL_COLORS: Record<LODLevel, string> = { high: '#6ee7b7', medium: '#fbbf24', low: '#f87171' }

function triCount(model: LoadedModel) {
  return model.triangles.toLocaleString()
}

export default function LODCompare() {
  const [selected, setSelected] = useState(0)
  const [loaded, setLoaded] = useState<Record<string, ModelSet>>({})
  // the model whose load has finished (loaded or not), until the selection moves on
  const [finished, setFinished] = useState<string | null>(null)
  const [frame, setFrame] = useState<FrameStats | null>(null)

  const model = TEST_MODELS[selected]

  useEffect(() => {
    if (loaded[model.id]) return
    Promise.all([
      loadModel(`${ENV}/${model.file}`, true),
      loadModel(`${LOD}/medium/${model.file}`, true).catch(() => null),
      loadModel(`${LOD}/low/${model.file}`, true).catch(() => null)
    ]).then(([high, medium, low]) => {
      if (high) {
        setLoaded((prev) => ({
          ...prev,
          [model.id]: { high, medium: medium ?? high, low: low ?? high }
        }))
      }
      setFinished(model.id)
    })
    return () => setFinished(null)
  }, [model.id])

  const modelSet = loaded[model.id]
  const loading = !modelSet && finished !== model.id

  return (
    <div className="fixed inset-0 bg-[#1b4466]">
      {modelSet && !loading && (
        <Canvas
          style={{ position: 'absolute', inset: 0 }}
          orthographic
          shadows={{ type: PCFShadowMap }}
          frameloop="always"
          camera={{ position: [80, 60, 80], zoom: 30, near: 1, far: 600 }}
          gl={{ antialias: false }}
          onCreated={({ gl }) => { gl.toneMapping = NeutralToneMapping }}
        >
          <Scene models={modelSet} worldSize={model.worldSize} by={model.by} onStats={setFrame} />
        </Canvas>
      )}

      {/* UI overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        {/* Model selector */}
        <div className="pointer-events-auto flex justify-center gap-2 p-4">
          {TEST_MODELS.map((m, i) => (
            <button
              key={m.id}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                i === selected
                  ? 'border-sky-300/60 bg-sky-400/25 text-white'
                  : 'border-white/15 bg-[#0d1727]/85 text-white/75 hover:bg-white/10'
              }`}
              onClick={() => setSelected(i)}
            >
              {m.name}
            </button>
          ))}
        </div>

        {/* Labels over each model */}
        {modelSet && (
          <div className="flex items-start justify-around px-8 pt-1">
            {LEVELS.map((level) => {
              const m = modelSet[level]
              return (
                <div key={level} className="rounded-xl border border-white/15 bg-[#0d1727]/85 px-4 py-2 text-center backdrop-blur-md">
                  <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: LEVEL_COLORS[level] }}>
                    {level === 'high' ? 'Original' : level}
                  </p>
                  <p className="mt-0.5 font-mono text-sm text-white/85">
                    {triCount(m)} <span className="text-white/45 text-xs">tris</span>
                  </p>
                  {level !== 'high' && (
                    <p className="font-mono text-[10px] text-white/40">
                      {((1 - m.triangles / modelSet.high.triangles) * 100).toFixed(0)}% reduction
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats bar */}
        <div className="flex justify-center p-3">
          <div className="pointer-events-auto rounded-2xl border border-white/15 bg-[#0d1727]/85 px-5 py-2.5 backdrop-blur-md flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-white/75">
            {frame && (
              <>
                <span><span className="text-white/40">fps</span> <span className="font-mono font-semibold text-white">{frame.fps}</span></span>
                <span><span className="text-white/40">rendered tris</span> <span className="font-mono">{frame.triangles.toLocaleString()}</span></span>
                <span><span className="text-white/40">draw calls</span> <span className="font-mono">{frame.calls}</span></span>
              </>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-[#0d1727]">
          <p className="text-sm text-white/60 animate-pulse">Loading model...</p>
        </div>
      )}
    </div>
  )
}
