'use client'

import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NeutralToneMapping, PCFShadowMap } from 'three'
import { FrameStats } from '@/app/dev/environment-kit/_components/RenderStats'
import { CompareScene } from './_components/CompareScene'
import { BuilderSettings } from './_components/HarborScene'
import { chip, count, FrameBar, label, mb, panel, Section } from './_components/ui'
import { EXHIBITS, ExhibitId, MERGED, MergeReport, sourceFile } from './_lib/compare'
import { LoadedModel, loadModel, setLessGloss } from './_lib/models'

// The terrain comparison (?compare=1): the two back cliffs as exported, cleaned, and merged into one formation in
// Blender (scripts/environment/sculpt-merge.py), side by side over the sea.

type LoadState = { status: 'loading' | 'ready' | 'failed'; progress: number; error?: string }

const query = () => new URLSearchParams(window.location.search)

export default function CompareView() {
  const [loaded, setLoaded] = useState<Record<string, LoadedModel | undefined>>({})
  const [loads, setLoads] = useState<Record<string, LoadState>>({})
  const [report, setReport] = useState<MergeReport | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)
  const [shown, setShown] = useState<Record<ExhibitId, boolean>>({ original: true, cleaned: true, merged: true })
  // ?focus=original|cleaned|merged frames one exhibit
  const [focus, setFocus] = useState<ExhibitId | null>(
    () => EXHIBITS.find((e) => e.id === query().get('focus'))?.id ?? null
  )
  const [settings, setSettings] = useState<BuilderSettings>({
    wireframe: false,
    lessGloss: true,
    shadows: true,
    finish: true
  })
  const [viewNonce, setViewNonce] = useState(0)
  const [turn, setTurn] = useState(() => Number(query().get('turn')) || 0)
  const [frame, setFrame] = useState<FrameStats | null>(null)
  const [panels, setPanels] = useState(() => query().get('panels') !== '0')
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h' && !(e.target instanceof HTMLInputElement)) setPanels((v) => !v)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  const requested = useRef(new Set<string>())
  const request = useCallback((url: string) => {
    if (requested.current.has(url)) return
    requested.current.add(url)
    setLoads((l) => ({ ...l, [url]: { status: 'loading', progress: 0 } }))
    loadModel(url, true, (got, total) =>
      setLoads((l) =>
        l[url]?.status === 'loading' ? { ...l, [url]: { status: 'loading', progress: total ? got / total : 0 } } : l
      )
    ).then(
      (model) => {
        setLoaded((ms) => ({ ...ms, [url]: model }))
        setLoads((l) => ({ ...l, [url]: { status: 'ready', progress: 1 } }))
      },
      (e: Error) => setLoads((l) => ({ ...l, [url]: { status: 'failed', progress: 0, error: e.message } }))
    )
  }, [])
  useEffect(() => {
    fetch(MERGED.report)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${MERGED.report}: ${r.status}`))))
      .then(setReport, (e: Error) => setReportError(e.message))
  }, [])
  useEffect(() => {
    if (!report) return
    for (const src of report.sources) {
      request(sourceFile(src, 'original'))
      request(sourceFile(src, 'cleaned'))
    }
    request(MERGED.file)
  }, [report, request])
  useEffect(() => setLessGloss(settings.lessGloss), [settings.lessGloss, loaded])

  const exhibits = useMemo(() => {
    if (!report) return null
    const files: Record<ExhibitId, string[]> = {
      original: report.sources.map((src) => sourceFile(src, 'original')),
      cleaned: report.sources.map((src) => sourceFile(src, 'cleaned')),
      merged: [MERGED.file]
    }
    return EXHIBITS.map((e) => {
      const ms = files[e.id].map((f) => loaded[f])
      return {
        ...e,
        ready: ms.every(Boolean),
        failed: files[e.id].some((f) => loads[f]?.status === 'failed'),
        progress: files[e.id].reduce((n, f) => n + (loads[f]?.progress ?? 0), 0) / files[e.id].length,
        triangles: ms.reduce((n, m) => n + (m?.triangles ?? 0), 0),
        bytes: ms.reduce((n, m) => n + (m?.bytes ?? 0), 0),
        textures: ms.reduce((n, m) => n + (m?.textureGpuBytes ?? 0), 0)
      }
    })
  }, [report, loaded, loads])

  return (
    <div className="fixed inset-0 z-[60] bg-[#2a7fb0]">
      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        orthographic
        shadows={{ type: PCFShadowMap }}
        dpr={[1, 1.5]}
        camera={{ position: [80, 80, 80], zoom: 30, near: 1, far: 400 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = NeutralToneMapping
        }}
      >
        <CompareScene
          report={report}
          loaded={loaded}
          shown={shown}
          settings={settings}
          focus={focus}
          viewNonce={viewNonce}
          turn={turn}
          onStats={setFrame}
        />
      </Canvas>

      {panels && (
        <div className="pointer-events-none absolute inset-0 flex items-start justify-between gap-4 p-4">
          <div className={`${panel} w-[21rem]`}>
            <p className="font-sora text-lg font-black tracking-tight">
              Terrain comparison<span className="text-sky-300">.</span>
            </p>
            <a href="/dev/harbor-builder" className={`${chip(false)} mt-2 inline-block`}>
              ← Harbor editor
            </a>
            <Section title="Exhibits">
              {reportError && (
                <p className="text-[11px] leading-relaxed text-amber-300">
                  No merged formation yet ({reportError}). Run scripts/environment/sculpt-merge.py in Blender.
                </p>
              )}
              {!report && !reportError && <p className="text-[11px] text-white/50">Reading the merge report…</p>}
              <ul className="space-y-0.5 text-[11px]">
                {exhibits?.map((e) => (
                  <li
                    key={e.id}
                    onClick={() => {
                      setFocus(e.id)
                      setViewNonce((n) => n + 1)
                    }}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 ${focus === e.id ? 'bg-sky-400/20' : 'hover:bg-white/5'} ${shown[e.id] ? '' : 'opacity-40'}`}
                  >
                    <button
                      title={shown[e.id] ? 'Hide' : 'Show'}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        setShown((s) => ({ ...s, [e.id]: !s[e.id] }))
                      }}
                      className="text-white/60 hover:text-white"
                    >
                      {shown[e.id] ? '●' : '○'}
                    </button>
                    <span className="flex-1 text-white/90">{e.name}</span>
                    <span className="font-mono text-white/45">
                      {e.ready ? `${count(e.triangles)} tris` : e.failed ? 'failed' : `${Math.round(e.progress * 100)}%`}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                className={`${chip(focus === null)} mt-2`}
                onClick={() => {
                  setFocus(null)
                  setViewNonce((n) => n + 1)
                }}
              >
                All three
              </button>
            </Section>
            {report && exhibits && (
              <Section title="Cost">
                <table className="w-full text-[11px] text-white/75">
                  <thead>
                    <tr className="text-white/40">
                      <td />
                      <td className="text-right">tris</td>
                      <td className="text-right">file</td>
                      <td className="text-right">GPU tex</td>
                    </tr>
                  </thead>
                  <tbody>
                    {exhibits.map((e) => (
                      <tr key={e.id}>
                        <td>{e.name}</td>
                        <td className="text-right font-mono">{e.ready ? count(e.triangles) : '…'}</td>
                        <td className="text-right font-mono">{e.ready ? mb(e.bytes) : '…'}</td>
                        <td className="text-right font-mono">{e.ready ? mb(e.textures) : '…'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}
            {report && (
              <Section title="The merge">
                <p className="text-[11px] leading-relaxed text-white/55">
                  {report.sources.map((src) => src.file.replace('-01.glb', '')).join(' + ')}: fused as one volume
                  (voxel remesh at {report.voxelSize} u), cut at the sea floor ({report.seaFloorCut} u), the junction
                  filleted ({report.fillet.vertices.toLocaleString()} vertices within {report.fillet.reach} u),
                  decimated {count(report.trianglesBeforeDecimation)} → {count(report.triangles)} tris, unwrapped, and
                  colour, roughness and normals baked from the two originals ({report.atlas.color}² atlas).
                </p>
              </Section>
            )}
          </div>

          <div className={`${panel} w-64`}>
            <Section title="Camera">
              <div className="flex flex-wrap gap-1.5">
                <button
                  className={chip(turn === 0)}
                  onClick={() => {
                    setTurn(0)
                    setViewNonce((n) => n + 1)
                  }}
                >
                  Isometric
                </button>
                <button className={chip(false)} onClick={() => setTurn((t) => t - 45)}>
                  ↺ 45°
                </button>
                <button className={chip(false)} onClick={() => setTurn((t) => t + 45)}>
                  ↻ 45°
                </button>
              </div>
            </Section>
            <Section title="View">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['finish', 'World finish'],
                    ['shadows', 'Shadows'],
                    ['wireframe', 'Wireframe'],
                    ['lessGloss', 'Less gloss']
                  ] as [keyof BuilderSettings, string][]
                ).map(([k, name]) => (
                  <button key={k} className={chip(settings[k])} onClick={() => setSettings((s) => ({ ...s, [k]: !s[k] }))}>
                    {name}
                  </button>
                ))}
              </div>
              <p className={`${label} mt-3 normal-case tracking-normal`}>H hides the panels.</p>
            </Section>
          </div>
        </div>
      )}
      <FrameBar frame={frame} />
    </div>
  )
}
