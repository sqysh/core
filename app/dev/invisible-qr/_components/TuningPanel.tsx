'use client'

import { ReactNode, useEffect, useState } from 'react'
import { balancedLayers } from '../_lib/chroma'
import {
  BLEND_MODES,
  BlendMode,
  BlueDirection,
  Encoding,
  PRESETS,
  PresetKey,
  QrSettings,
  TEST_VALUE
} from '../_lib/presets'

const field = 'grid gap-1 font-mono text-[11px] text-white/80'

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (n: number) => void
}) {
  return (
    <label className={field}>
      <span className="flex justify-between">
        {label}
        <span className="text-white">{value}%</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  )
}

function Colour({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (v: string) => void
}): ReactNode {
  return (
    <label className={`${field} grid-cols-[1fr_auto] items-center`}>
      {label}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-12 rounded border border-white/30 bg-transparent"
      />
    </label>
  )
}

/** What the balanced encoding does at its reference colour */
function BalancedReadout({ strength, reference }: { strength: number; reference: string }) {
  const c = balancedLayers(strength, reference)
  const base = parseInt(reference.slice(5, 7), 16)
  return (
    <>
      <dt className="text-white/60">Blue</dt>
      <dd className="m-0">
        {c.blueDark} dark / {c.blueLight} light (sea {base}), {c.blueLight - c.blueDark} apart
      </dd>
      <dt className="text-white/60">Luminance</dt>
      <dd className="m-0">off by {(c.residual * 100).toFixed(2)}% at the reference, as drawn</dd>
    </>
  )
}

/**
 * The tuning panel: presets, every setting, and the layer's numbers. "Hide" puts it away for testing; press H, or tap the
 * faint dot in the top-left corner, to bring it back.
 */
export function TuningPanel({
  s,
  set,
  preset,
  pick,
  modules
}: {
  s: QrSettings
  set: (patch: Partial<QrSettings>) => void
  preset: PresetKey | null
  pick: (k: PresetKey) => void
  /** Modules across the code, quiet zone included (read from the drawn code) */
  modules: number
}) {
  const [hidden, setHidden] = useState(false)
  const [viewport, setViewport] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const read = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    read()
    window.addEventListener('resize', read)
    const key = (e: KeyboardEvent) => e.key.toLowerCase() === 'h' && setHidden((v) => !v)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('resize', read)
      window.removeEventListener('keydown', key)
    }
  }, [])

  const px = Math.round((viewport.h * s.size) / 100)

  if (hidden)
    return (
      <button
        type="button"
        aria-label="Show the tuning panel"
        onClick={() => setHidden(false)}
        className="fixed left-1 top-1 z-10002 h-8 w-8 rounded-full bg-white/10"
      />
    )

  return (
    <div className="fixed bottom-2 left-2 top-2 z-10002 grid w-72 max-w-[calc(100vw-1rem)] content-start gap-3 overflow-y-auto overscroll-contain rounded-2xl border border-white/25 bg-[#06182c]/85 p-3 text-white backdrop-blur-md">
      <div className="flex items-center justify-between">
        <p className="m-0 font-sora text-[13px] font-bold">Invisible QR test</p>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="rounded-full border border-white/30 px-3 py-1 font-mono text-[11px]"
        >
          Hide (H)
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => pick(k)}
            title={PRESETS[k].note}
            className={`rounded-xl border px-1 py-2 font-sora text-[11px] font-bold ${preset === k ? 'border-sky-200/70 bg-sky-400/30' : 'border-white/25 bg-white/8'}`}
          >
            {PRESETS[k].label}
          </button>
        ))}
      </div>

      {/* the same code, size and place either way, so the two ways can be compared directly */}
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Encoding">
        {(['overlay', 'blue', 'balanced'] as Encoding[]).map((e) => (
          <button
            key={e}
            type="button"
            role="radio"
            aria-checked={s.encoding === e}
            onClick={() => set({ encoding: e })}
            className={`rounded-xl border px-1 py-2 font-mono text-[11px] ${s.encoding === e ? 'border-sky-200/70 bg-sky-400/30' : 'border-white/25 bg-white/8'}`}
          >
            {e === 'overlay' ? 'Opacity overlay' : e === 'blue' ? 'Blue channel' : 'Balanced chroma'}
          </button>
        ))}
      </div>

      {s.encoding === 'overlay' && (
        <>
          <Slider label="Opacity" value={s.opacity} min={0} max={100} onChange={(opacity) => set({ opacity })} />
          <Colour label="Foreground" value={s.foreground} onChange={(foreground) => set({ foreground })} />
          <Colour label="Background" value={s.background} onChange={(background) => set({ background })} />
          <Slider
            label="Background opacity"
            value={s.backgroundOpacity}
            min={0}
            max={100}
            onChange={(backgroundOpacity) => set({ backgroundOpacity })}
          />
          <label className={field}>
            Blend mode
            <select
              value={s.blend}
              onChange={(e) => set({ blend: e.target.value as BlendMode })}
              className="h-9 rounded border border-white/30 bg-[#06182c] px-2 text-white"
            >
              {BLEND_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {s.encoding === 'blue' && (
        <>
          <Slider
            label="Encoding strength"
            value={s.strength}
            min={0}
            max={100}
            step={0.5}
            onChange={(strength) => set({ strength })}
          />
          <label className={field}>
            Blue direction
            <select
              value={s.direction}
              onChange={(e) => set({ direction: e.target.value as BlueDirection })}
              className="h-9 rounded border border-white/30 bg-[#06182c] px-2 text-white"
            >
              <option value="darken">Darken the dark modules</option>
              <option value="lighten">Lighten everything else</option>
            </select>
          </label>
        </>
      )}
      {s.encoding === 'balanced' && (
        <>
          <Slider
            label="Encoding strength"
            value={s.strength}
            min={0}
            max={50}
            step={0.5}
            onChange={(strength) => set({ strength })}
          />
          <Colour
            label="Luminance reference (sea colour)"
            value={s.reference}
            onChange={(reference) => set({ reference })}
          />
        </>
      )}
      <Slider label="Size (of viewport height)" value={s.size} min={10} max={90} onChange={(size) => set({ size })} />
      <Slider label="Horizontal" value={s.x} min={0} max={100} onChange={(x) => set({ x })} />
      <Slider label="Vertical" value={s.y} min={0} max={100} onChange={(y) => set({ y })} />

      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-t border-white/15 pt-2 font-mono text-[11px]">
        <dt className="text-white/60">Value</dt>
        <dd className="m-0 break-all">{TEST_VALUE}</dd>
        <dt className="text-white/60">Size</dt>
        <dd className="m-0">
          {px}×{px} px ({s.size}% of {viewport.h})
        </dd>
        <dt className="text-white/60">Modules</dt>
        <dd className="m-0">{modules ? `${modules} across, ${(px / modules).toFixed(1)} px each` : '…'}</dd>
        {s.encoding === 'balanced' ? (
          <BalancedReadout strength={s.strength} reference={s.reference} />
        ) : s.encoding === 'overlay' ? (
          <>
            <dt className="text-white/60">Opacity</dt>
            <dd className="m-0">{s.opacity}%</dd>
          </>
        ) : (
          <>
            <dt className="text-white/60">Encoding</dt>
            <dd className="m-0">
              blue {s.direction === 'darken' ? '−' : '+'}
              {Math.round((255 * s.strength) / 100)}/255 ({s.strength}%), red and green untouched
            </dd>
          </>
        )}
      </dl>
    </div>
  )
}
