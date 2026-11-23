'use client'

import { Canvas } from '@react-three/fiber'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { NeutralToneMapping, PCFShadowMap } from 'three'
import { Level, LODS } from '@/lib/environment/core/types'
import { FrameStats } from '../_components/RenderStats'
import { CompositionScene, CompositionSettings, LIGHTHOUSE_ESTIMATE, Measured, ScreenSizes } from './CompositionScene'
import {
  COMPOSITION_VIEWS,
  CompositionItem,
  CompositionView,
  DEFAULT_ITEMS,
  ROLE_TARGETS,
  ScaleRole,
  VesselClass
} from './layout'

// Composition mode: the world's lighthouse, cottage and a vessel with the new model assets on one miniature island,
// to settle CORE's artistic scale. The lighthouse, measured as drawn, is the reference; each asset's size is a share
// of its height, with the proportional targets alongside. Each item can be moved, turned, sized, sunk into the sand
// and drawn at any level of detail, and its height on screen shows how much detail it actually needs at each view.
// The layout is kept in this browser while it's tuned, and can be copied out; it changes nothing in the world.

const STORAGE_KEY = 'core-environment-composition-v1'
const LEVELS: Level[] = ['original', ...LODS]

const panel =
  'pointer-events-auto max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border border-white/15 bg-[#0d1727]/80 p-4 text-white shadow-xl backdrop-blur-md'
const label = 'font-mono text-[10px] uppercase tracking-[0.18em] text-white/50'
const chip = (on: boolean) =>
  `rounded-lg border px-2.5 py-1 text-xs transition-colors ${on ? 'border-sky-300/60 bg-sky-400/25 text-white' : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'}`
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`

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
  shown,
  min,
  max,
  step,
  disabled,
  onChange
}: {
  name: string
  value: number
  shown: string
  min: number
  max: number
  step: number
  disabled?: boolean
  onChange: (v: number) => void
}) {
  return (
    <label className={`mt-2 block text-xs ${disabled ? 'text-white/35' : 'text-white/80'}`}>
      <span className="flex justify-between">
        <span>{name}</span>
        <span className="font-mono text-white/50">{shown}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-sky-300"
      />
    </label>
  )
}

/** The layout kept in this browser, if there is one (and it's for the same items) */
function stored(): CompositionItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_ITEMS
    const saved = JSON.parse(raw) as CompositionItem[]
    // keep saved tuning for items that still exist; anything new starts at its recommendation
    return DEFAULT_ITEMS.map((d) => ({
      ...d,
      ...(saved.find((s) => s.id === d.id) ?? {}),
      kind: saved.find((s) => s.id === d.id)?.kind ?? d.kind
    }))
  } catch {
    return DEFAULT_ITEMS
  }
}

/** An item's height as a share of the lighthouse's */
function shareOf(item: CompositionItem, measured: Measured, lighthouse: number) {
  if (item.kind.type === 'model') return item.size
  const m = measured[item.id]
  return m ? (m.height * item.size) / lighthouse : null
}

/** More is more detailed: low 0, medium 1, high 2, the original 3 */
const detail = (l: Level) => (l === 'original' ? 3 : 2 - LODS.indexOf(l))

/** How much detail an item needs at the view, from how tall it stands on screen (share of the view's height) */
function neededLevel(share: number): Level {
  if (share > 0.35) return 'high'
  if (share > 0.12) return 'medium'
  return 'low'
}

export default function Composition({ modeSwitch }: { modeSwitch: ReactNode }) {
  // the layout kept in this browser: read once, then kept as it's tuned (?reset=1 starts from the recommendation)
  const [items, setItems] = useState<CompositionItem[]>(() =>
    new URLSearchParams(window.location.search).get('reset') !== '1' ? stored() : DEFAULT_ITEMS
  )
  const [selected, setSelected] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('select') ?? 'pine'
  )
  const [view, setView] = useState<CompositionView>(() =>
    [...COMPOSITION_VIEWS.map((v) => v.id), 'focus'].includes(new URLSearchParams(window.location.search).get('view') ?? '')
      ? (new URLSearchParams(window.location.search).get('view') as CompositionView)
      : 'overview'
  )
  const [viewNonce, setViewNonce] = useState(0)
  const [settings, setSettings] = useState<CompositionSettings>({
    finish: true,
    shadows: true,
    wireframe: false,
    footprints: false
  })
  const [measured, setMeasured] = useState<Measured>({})
  const [screen, setScreen] = useState<ScreenSizes>({})
  const [frame, setFrame] = useState<FrameStats | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // private windows and blocked storage: the layout just isn't kept
    }
  }, [items])

  const lighthouseHeight = measured.lighthouse?.height ?? LIGHTHOUSE_ESTIMATE
  const update = (id: string, patch: Partial<CompositionItem>) =>
    setItems((all) => all.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  const current = items.find((i) => i.id === selected) ?? null
  const recommended = current ? DEFAULT_ITEMS.find((d) => d.id === current.id) : null
  const portrait = view === 'portrait'

  const layoutJson = useMemo(
    () =>
      JSON.stringify(
        {
          reference: { lighthouseHeight: Number(lighthouseHeight.toFixed(3)) },
          items: items.map((i) => ({
            id: i.id,
            kind: i.kind,
            role: i.role,
            heightOfLighthouse: Number((shareOf(i, measured, lighthouseHeight) ?? 0).toFixed(4)),
            size: i.size,
            u: i.u,
            v: i.v,
            yaw: i.yaw,
            embed: i.embed,
            level: i.level,
            visible: i.visible
          }))
        },
        null,
        2
      ),
    [items, measured, lighthouseHeight]
  )

  return (
    <div className="fixed inset-0 z-[60] bg-[#1d2124]">
      {/* the view: full window, or a phone-shaped portrait screen in the middle */}
      <div className={portrait ? 'absolute inset-0 flex items-center justify-center p-4' : 'absolute inset-0'}>
        <div
          className={
            portrait
              ? 'relative aspect-[9/19.5] h-full overflow-hidden rounded-[2.2rem] ring-4 ring-black/70 shadow-2xl'
              : 'absolute inset-0'
          }
        >
          <Canvas
            key={portrait ? 'portrait' : 'wide'}
            style={{ position: 'absolute', inset: 0 }}
            orthographic
            shadows={{ type: PCFShadowMap }}
            dpr={portrait ? [1, 1.5] : [1, 2]}
            camera={{ position: [40, 30, 40], zoom: 50, near: 0.1, far: 400 }}
            gl={{ antialias: true }}
            onCreated={({ gl }) => {
              gl.toneMapping = NeutralToneMapping
            }}
          >
            <CompositionScene
              items={items}
              settings={settings}
              view={view}
              viewNonce={viewNonce}
              selected={selected}
              lighthouseHeight={lighthouseHeight}
              measured={measured}
              onSelect={setSelected}
              onMeasure={(m) => setMeasured((prev) => ({ ...prev, ...m }))}
              onScreen={setScreen}
              onStats={setFrame}
            />
          </Canvas>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-start justify-between gap-4 p-4">
        {/* left: the items and their scale */}
        <div className={`${panel} w-[22rem]`}>
          {modeSwitch}
          <Section title="Scale reference">
            <p className="text-xs leading-relaxed text-white/70">
              Lighthouse, measured as drawn:{' '}
              <span className="font-mono text-white">
                {measured.lighthouse ? `${lighthouseHeight.toFixed(2)} u` : 'measuring…'}
              </span>{' '}
              tall = 100%.
              {measured.cottage && (
                <>
                  {' '}
                  Cottage{' '}
                  <span className="font-mono text-white">{pct(measured.cottage.height / lighthouseHeight, 0)}</span>
                </>
              )}
              {measured.vessel && (
                <>
                  , vessel{' '}
                  <span className="font-mono text-white">
                    {pct(Math.max(measured.vessel.width, measured.vessel.depth) / lighthouseHeight, 0)}
                  </span>{' '}
                  long
                </>
              )}
              .
            </p>
          </Section>

          <Section title="Items">
            <table className="w-full text-[11px]">
              <thead className="text-[10px] text-white/40">
                <tr>
                  <th className="pb-1 text-left font-normal" />
                  <th className="pb-1 text-left font-normal">item</th>
                  <th className="pb-1 text-right font-normal">height</th>
                  <th className="pb-1 text-right font-normal">on screen</th>
                  <th className="pb-1 text-right font-normal">level</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const share = shareOf(i, measured, lighthouseHeight)
                  const target = ROLE_TARGETS[i.role]
                  const inRange =
                    share !== null && target ? share >= target[0] - 1e-6 && share <= target[1] + 1e-6 : null
                  const onScreen = screen[i.id] ?? null
                  const need = onScreen !== null ? neededLevel(onScreen) : null
                  return (
                    <tr
                      key={i.id}
                      onClick={() => setSelected(i.id)}
                      className={`cursor-pointer ${selected === i.id ? 'bg-sky-400/20' : 'hover:bg-white/5'} ${i.visible ? '' : 'opacity-40'}`}
                    >
                      <td className="py-1 pl-1">
                        <button
                          title={i.visible ? 'Hide' : 'Show'}
                          onClick={(e) => {
                            e.stopPropagation()
                            update(i.id, { visible: !i.visible })
                          }}
                          className="text-white/60 hover:text-white"
                        >
                          {i.visible ? '●' : '○'}
                        </button>
                      </td>
                      <td className="py-1 pr-2">
                        <span className="text-white/90">{i.name}</span>
                        <span className="block text-[9px] text-white/40">{i.role}</span>
                      </td>
                      <td
                        className={`py-1 text-right font-mono ${inRange === false ? 'text-amber-300' : inRange ? 'text-emerald-300' : 'text-white/70'}`}
                      >
                        {share === null ? '…' : pct(share)}
                      </td>
                      <td className="py-1 text-right font-mono text-white/60">
                        {onScreen === null ? '—' : pct(onScreen, 0)}
                      </td>
                      <td className="py-1 pr-1 text-right font-mono">
                        {i.kind.type === 'model' ? (
                          <span className={need && detail(i.level) < detail(need) ? 'text-amber-300' : ''}>
                            {i.level[0].toUpperCase()}
                            {need && <span className="text-white/35"> /{need[0].toUpperCase()}</span>}
                          </span>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mt-1.5 text-[10px] leading-relaxed text-white/40">
              Height: green inside its role&apos;s target, amber outside. On screen: share of the view&apos;s height.
              Level: drawn / needed at this view (above 35% of the view high, 12–35% medium, below that low), amber when
              it&apos;s drawn with less.
            </p>
          </Section>

          {current && (
            <Section title={current.name}>
              {current.kind.type === 'model' ? (
                <Slider
                  name="Height (of the lighthouse)"
                  value={current.size}
                  shown={`${pct(current.size)} · ${(current.size * lighthouseHeight).toFixed(2)} u`}
                  min={0.005}
                  max={0.4}
                  step={0.0025}
                  onChange={(v) => update(current.id, { size: v })}
                />
              ) : (
                <Slider
                  name={
                    current.kind.type === 'lighthouse'
                      ? 'Scale (the reference: fixed)'
                      : 'Scale (1 = as built in the world)'
                  }
                  value={current.size}
                  shown={`${current.size.toFixed(2)}×`}
                  min={0.5}
                  max={1.8}
                  step={0.05}
                  disabled={current.kind.type === 'lighthouse'}
                  onChange={(v) => update(current.id, { size: v })}
                />
              )}
              <Slider
                name="Turn"
                value={current.yaw}
                shown={`${current.yaw}°`}
                min={-180}
                max={180}
                step={5}
                onChange={(v) => update(current.id, { yaw: v })}
              />
              <Slider
                name="Left · right"
                value={current.u}
                shown={current.u.toFixed(2)}
                min={-5}
                max={5}
                step={0.05}
                onChange={(v) => update(current.id, { u: v })}
              />
              <Slider
                name="Back · front"
                value={current.v}
                shown={current.v.toFixed(2)}
                min={-5}
                max={5}
                step={0.05}
                onChange={(v) => update(current.id, { v: v })}
              />
              {current.kind.type !== 'vessel' && (
                <Slider
                  name="Sunk into the ground (of its height)"
                  value={current.embed}
                  shown={pct(current.embed)}
                  min={0}
                  max={0.2}
                  step={0.0025}
                  onChange={(v) => update(current.id, { embed: v })}
                />
              )}
              {current.kind.type === 'model' && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      className={chip(current.level === l)}
                      onClick={() => update(current.id, { level: l })}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
              {current.kind.type === 'vessel' && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(['lobster', 'runabout', 'sloop'] as VesselClass[]).map((c) => (
                    <button
                      key={c}
                      className={chip(current.kind.type === 'vessel' && current.kind.vessel === c)}
                      onClick={() =>
                        update(current.id, {
                          kind: { type: 'vessel', vessel: c },
                          name: `${c[0].toUpperCase()}${c.slice(1)} boat`
                        })
                      }
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              {recommended && (
                <button
                  className={`${chip(false)} mt-3`}
                  onClick={() => update(current.id, { ...recommended, visible: current.visible })}
                >
                  Recommended
                </button>
              )}
            </Section>
          )}

          <Section title="Composition">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-white/50">Every model at</span>
              {LEVELS.map((l) => (
                <button
                  key={l}
                  className={chip(false)}
                  onClick={() => setItems((all) => all.map((i) => (i.kind.type === 'model' ? { ...i, level: l } : i)))}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button className={chip(false)} onClick={() => setItems(DEFAULT_ITEMS)}>
                Recommended layout
              </button>
              <button
                className={chip(copied)}
                onClick={() => {
                  navigator.clipboard?.writeText(layoutJson).then(
                    () => {
                      setCopied(true)
                      window.setTimeout(() => setCopied(false), 1500)
                    },
                    () => {}
                  )
                }}
              >
                {copied ? 'Copied' : 'Copy layout'}
              </button>
            </div>
          </Section>
        </div>

        {/* right: how to look at it, and the targets */}
        <div className={`${panel} w-72`}>
          <Section title="Camera">
            <div className="flex flex-wrap gap-1.5">
              {COMPOSITION_VIEWS.map((v) => (
                <button
                  key={v.id}
                  className={chip(view === v.id)}
                  onClick={() => {
                    setView(v.id)
                    setViewNonce((n) => n + 1)
                  }}
                >
                  {v.name}
                </button>
              ))}
            </div>
            <button
              className={`${chip(view === 'focus')} mt-1.5`}
              disabled={!selected}
              onClick={() => {
                setView('focus')
                setViewNonce((n) => n + 1)
              }}
            >
              Close on the selected item
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-white/45">
              {view === 'focus'
                ? 'Down where it meets the ground: its embedding and contact shadow'
                : COMPOSITION_VIEWS.find((v) => v.id === view)?.note}
            </p>
          </Section>
          <Section title="View">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['finish', 'World finish'],
                  ['shadows', 'Shadows'],
                  ['wireframe', 'Wireframe'],
                  ['footprints', 'Footprints']
                ] as [keyof CompositionSettings, string][]
              ).map(([k, name]) => (
                <button
                  key={k}
                  className={chip(settings[k])}
                  onClick={() => setSettings((s) => ({ ...s, [k]: !s[k] }))}
                >
                  {name}
                </button>
              ))}
            </div>
          </Section>
          <Section title="Proportion targets">
            <table className="w-full text-[11px] text-white/75">
              <tbody>
                {(Object.entries(ROLE_TARGETS) as [ScaleRole, [number, number]][]).map(([role, [lo, hi]]) => (
                  <tr key={role}>
                    <td className="py-0.5">{role}</td>
                    <td className="py-0.5 text-right font-mono">
                      {pct(lo, 0)}–{pct(hi, 0)}
                    </td>
                    <td className="py-0.5 text-right font-mono text-white/45">
                      {(lo * lighthouseHeight).toFixed(2)}–{(hi * lighthouseHeight).toFixed(2)} u
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1.5 text-[10px] leading-relaxed text-white/40">
              Of the lighthouse&apos;s height: artistic starting points for a miniature world, not real-world sizes. No
              grass asset yet.
            </p>
          </Section>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
        {frame && (
          <div className={`${panel} flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-2.5 text-xs`}>
            {(
              [
                ['fps', frame.fps],
                ['draw calls', frame.calls],
                ['frame tris', frame.triangles],
                ['geometries', frame.geometries],
                ['textures', frame.textures],
                ['shaders', frame.programs]
              ] as [string, number][]
            ).map(([k, v]) => (
              <span key={k} className="whitespace-nowrap">
                <span className="text-white/45">{k}</span> <span className="font-mono">{v.toLocaleString()}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
