'use client'

import { ReactNode } from 'react'
import {
  AssetBuild,
  AssetCategory,
  AssetRecipe,
  Level,
  LODS,
  ModelInfo,
  ModelLevelInfo
} from '@/lib/environment/core/types'
import { ASSET_BUDGETS } from '@/lib/environment/budgets'
import { ASSETS, CATEGORIES } from '@/lib/environment/registry'
import { CAMERA_VIEWS, CameraView } from './CameraRig'
import { FrameStats } from './RenderStats'
import { DEFAULT_SETTINGS, GroundKind, WorkshopSettings } from './settings'

// The workshop's controls: what to look at (left), how to look at it (right) and what it costs (bottom).

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`
const count = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n.toLocaleString())
const levelName = (l: Level) => (l === 'original' ? 'Original' : l[0].toUpperCase() + l.slice(1))

const panel =
  'pointer-events-auto max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-white/15 bg-[#0d1727]/80 p-4 text-white shadow-xl backdrop-blur-md'
const label = 'font-mono text-[10px] uppercase tracking-[0.18em] text-white/50'
const chip = (on: boolean) =>
  `rounded-lg border px-2.5 py-1 text-xs transition-colors ${on ? 'border-sky-300/60 bg-sky-400/25 text-white' : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'}`

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <p className={label}>{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function Slider({
  name,
  value,
  min,
  max,
  step,
  unit = '',
  onChange
}: {
  name: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <label className="mt-2 block text-xs text-white/80">
      <span className="flex justify-between">
        <span>{name}</span>
        <span className="font-mono text-white/50">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-sky-300"
      />
    </label>
  )
}

export function AssetPanel({
  header,
  category,
  onCategory,
  recipe,
  onRecipe,
  seed,
  onSeed,
  level,
  onLevel,
  compare,
  onCompare
}: {
  header?: ReactNode
  category: AssetCategory
  onCategory: (c: AssetCategory) => void
  recipe: AssetRecipe | null
  onRecipe: (r: AssetRecipe) => void
  seed: number
  onSeed: (s: number) => void
  level: Level
  onLevel: (l: Level) => void
  compare: boolean
  onCompare: (on: boolean) => void
}) {
  const levels: Level[] = recipe?.original ? ['original', ...LODS] : LODS
  return (
    <div className={`${panel} w-72`}>
      {header}
      <p className="font-sora text-lg font-black tracking-tight">
        Environment kit<span className="text-sky-300">.</span>
      </p>
      <p className="mt-0.5 text-xs text-white/50">Manchester-by-the-Sea · Coolidge Point</p>

      <Section title="Category">
        <div className="flex gap-1.5">
          {CATEGORIES.map((c) => (
            <button key={c.id} className={chip(c.id === category)} onClick={() => onCategory(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Assets">
        <ul className="space-y-1">
          {ASSETS.filter((a) => a.category === category).map((a) => (
            <li key={a.id}>
              <button
                disabled={a.status !== 'ready'}
                onClick={() => onRecipe(a)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs ${
                  recipe?.id === a.id
                    ? 'bg-sky-400/25 text-white'
                    : a.status === 'ready'
                      ? 'text-white/80 hover:bg-white/10'
                      : 'cursor-not-allowed text-white/35'
                }`}
              >
                <span>{a.name}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider">
                  {a.status === 'ready' ? 'ready' : 'planned'}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {recipe && <p className="mt-2 text-xs leading-relaxed text-white/55">{recipe.description}</p>}
      </Section>

      {recipe && (
        <>
          {recipe.variations > 1 && (
            <Section title="Variation">
              <div className="flex items-center gap-1.5">
                <button className={chip(false)} onClick={() => onSeed(Math.max(1, seed - 1))}>
                  ‹
                </button>
                <input
                  type="number"
                  min={1}
                  value={seed}
                  onChange={(e) => onSeed(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                  className="w-16 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-center font-mono text-xs"
                />
                <button className={chip(false)} onClick={() => onSeed(seed + 1)}>
                  ›
                </button>
                <button className={chip(false)} onClick={() => onSeed(1 + Math.floor(Math.random() * 9999))}>
                  Random
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {Array.from({ length: recipe.variations }, (_, i) => i + 1).map((n) => (
                  <button key={n} className={`${chip(seed === n)} min-w-7 px-1.5`} onClick={() => onSeed(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </Section>
          )}
          <Section title="Level of detail">
            <div className="flex flex-wrap gap-1.5">
              {levels.map((l) => (
                <button key={l} className={chip(l === level)} onClick={() => onLevel(l)}>
                  {l}
                </button>
              ))}
            </div>
            {recipe.original && (
              <button className={`${chip(compare)} mt-2`} onClick={() => onCompare(!compare)}>
                Side by side with the original
              </button>
            )}
          </Section>
          {recipe.model && <ModelComparison model={recipe.model} level={level} />}
        </>
      )}
    </div>
  )
}

/** What each level of a model asset costs against its master, and how far it strays from it */
function ModelComparison({ model, level }: { model: ModelInfo; level: Level }) {
  const rows: [Level, ModelLevelInfo][] = [
    ['original', model.original],
    ...LODS.map((l) => [l, model.levels[l]] as [Level, ModelLevelInfo])
  ]
  const cell = 'py-1 pr-2 text-right font-mono'
  return (
    <Section title="Original vs optimised">
      <table className="w-full text-[10px] text-white/75">
        <thead className="text-white/40">
          <tr>
            <th className="py-1 text-left font-normal" />
            <th className={`${cell} font-normal`}>tris</th>
            <th className={`${cell} font-normal`}>file</th>
            <th className={`${cell} font-normal`}>tex GPU</th>
            <th className="py-1 text-right font-normal">mean dev</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([l, r]) => (
            <tr key={l} className={l === level ? 'text-sky-200' : ''}>
              <td className="py-1 pr-2">{levelName(l)}</td>
              <td className={cell}>{count(r.triangles)}</td>
              <td className={cell}>{mb(r.bytes)}</td>
              <td className={cell}>{mb(r.textureBytes)}</td>
              <td className="py-1 text-right font-mono">
                {r.deviation ? `${(r.deviation.mean * 1000).toFixed(1)} mm` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1.5 text-[10px] leading-relaxed text-white/40">
        Deviation: mean distance from the master&apos;s surface at world size. Texture memory is uncompressed RGBA with
        mipmaps.
      </p>
    </Section>
  )
}

/** Names one side of a side-by-side comparison */
export function CompareLabel({
  level,
  recipe,
  build,
  building
}: {
  level: Level
  recipe: AssetRecipe | null
  build: AssetBuild | null
  building: boolean
}) {
  const info = level === 'original' ? recipe?.model?.original : recipe?.model?.levels[level]
  return (
    <div
      className={`pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 text-center rounded-xl border border-white/15 bg-[#0d1727]/80 px-3 py-2 text-xs text-white backdrop-blur-md`}
    >
      <p className="font-semibold">{levelName(level)}</p>
      <p className="mt-0.5 font-mono text-[10px] text-white/55">
        {building || !build
          ? level === 'original'
            ? 'Loading the master…'
            : 'Loading…'
          : `${count(build.stats.triangles)} tris · ${build.stats.buildMs} ms to load`}
        {info ? ` · ${mb(info.bytes)}` : ''}
      </p>
    </div>
  )
}

export function ViewPanel({
  settings: s,
  onChange,
  view,
  onView
}: {
  settings: WorkshopSettings
  onChange: (p: Partial<WorkshopSettings>) => void
  view: CameraView
  onView: (v: CameraView) => void
}) {
  const toggle = (key: keyof WorkshopSettings, name: string) => (
    <button className={chip(Boolean(s[key]))} onClick={() => onChange({ [key]: !s[key] } as Partial<WorkshopSettings>)}>
      {name}
    </button>
  )
  return (
    <div className={`${panel} w-72`}>
      <Section title="Ground">
        <div className="flex flex-wrap gap-1.5">
          {(['diorama', 'shoreline', 'uneven', 'flat'] as GroundKind[]).map((t) => (
            <button key={t} className={chip(s.ground === t)} onClick={() => onChange({ ground: t })}>
              {t}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5">
          {s.ground !== 'diorama' && (
            <button className={chip(false)} onClick={() => onChange({ terrainSeed: s.terrainSeed + 1 })}>
              New ground
            </button>
          )}
          {toggle('anchors', 'Footprint')}
        </div>
        <Slider
          name="Turn"
          value={s.yaw}
          min={-180}
          max={180}
          step={5}
          unit="°"
          onChange={(v) => onChange({ yaw: v })}
        />
      </Section>
      <Section title="Camera">
        <div className="flex gap-1.5">
          {CAMERA_VIEWS.map((v) => (
            <button key={v.id} className={chip(view === v.id)} onClick={() => onView(v.id)}>
              {v.name}
            </button>
          ))}
        </div>
      </Section>
      <Section title="View">
        <div className="flex flex-wrap gap-1.5">
          {toggle('finish', 'World finish')}
          {toggle('shadows', 'Shadows')}
          {toggle('wireframe', 'Wireframe')}
          {toggle('autoRotate', 'Turntable')}
        </div>
      </Section>
      <Section title="Lighting">
        <p className="text-[11px] leading-relaxed text-white/45">
          The CORE world&apos;s lighting rig, adjusted from where it stands.
        </p>
        <Slider
          name="Sun direction"
          value={s.sunAzimuth}
          min={0}
          max={360}
          step={5}
          unit="°"
          onChange={(v) => onChange({ sunAzimuth: v })}
        />
        <Slider
          name="Sun height"
          value={s.sunElevation}
          min={8}
          max={85}
          step={1}
          unit="°"
          onChange={(v) => onChange({ sunElevation: v })}
        />
        <Slider
          name="Sun strength"
          value={s.sunStrength}
          min={0}
          max={2}
          step={0.05}
          unit="×"
          onChange={(v) => onChange({ sunStrength: v })}
        />
        <Slider
          name="Sky light"
          value={s.skyLight}
          min={0}
          max={2}
          step={0.05}
          unit="×"
          onChange={(v) => onChange({ skyLight: v })}
        />
        <Slider
          name="Reflections"
          value={s.reflections}
          min={0}
          max={2}
          step={0.05}
          onChange={(v) => onChange({ reflections: v })}
        />
        <Slider
          name="Exposure"
          value={s.exposure}
          min={0.5}
          max={1.6}
          step={0.05}
          unit="×"
          onChange={(v) => onChange({ exposure: v })}
        />
        <button
          className={`${chip(false)} mt-3`}
          onClick={() =>
            onChange({
              sunAzimuth: DEFAULT_SETTINGS.sunAzimuth,
              sunElevation: DEFAULT_SETTINGS.sunElevation,
              sunStrength: 1,
              skyLight: 1,
              reflections: DEFAULT_SETTINGS.reflections,
              exposure: 1
            })
          }
        >
          World lighting
        </button>
      </Section>
    </div>
  )
}

export function StatsBar({
  recipe,
  level,
  build,
  building,
  frame
}: {
  recipe: AssetRecipe | null
  level: Level
  build: AssetBuild | null
  building: boolean
  frame: FrameStats | null
}) {
  const item = (name: string, value: string | number, warn = false) => (
    <span className="whitespace-nowrap">
      <span className="text-white/45">{name}</span>{' '}
      <span className={`font-mono ${warn ? 'text-amber-300' : ''}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </span>
  )
  const budget = recipe && level !== 'original' ? ASSET_BUDGETS[recipe.id]?.[level] : undefined
  return (
    <div className={`${panel} flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-2.5 text-xs`}>
      {building ? <span className="text-sky-200">Building…</span> : null}
      {build && (
        <>
          {item(
            'asset tris',
            budget ? `${build.stats.triangles.toLocaleString()} / ${budget.toLocaleString()}` : build.stats.triangles,
            budget ? build.stats.triangles > budget : false
          )}
          {item('verts', build.stats.vertices)}
          {build.stats.sourceTriangles ? item('from source', build.stats.sourceTriangles) : null}
          {build.stats.error !== undefined ? item('deviation', `${(build.stats.error * 100).toFixed(1)} cm`) : null}
          {build.stats.file ? item('file', mb(build.stats.file.bytes)) : null}
          {build.stats.file
            ? item('textures', `${build.stats.file.textures} · ${mb(build.stats.file.textureBytes)} GPU`)
            : null}
          {item(build.stats.file ? 'load' : 'build', `${build.stats.buildMs} ms`)}
        </>
      )}
      {frame && (
        <>
          <span className="h-4 w-px bg-white/15" />
          {item('fps', frame.fps)}
          {item('draw calls', frame.calls)}
          {item('frame tris', frame.triangles)}
          {item('geometries', frame.geometries)}
          {item('textures', frame.textures)}
          {item('shaders', frame.programs)}
        </>
      )}
    </div>
  )
}
