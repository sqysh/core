'use client'

import { useEffect, useState } from 'react'
import { applySea, SEA_DEFAULTS, SeaParams } from '../_lib/seaLook'

// TEMPORARY dev panel: live sliders for the sea. Every control writes straight to the shader's uniform objects
// (see applySea in _lib/seaLook.ts), so nothing recompiles and nothing reloads. "Copy" puts the values on the
// clipboard as JSON, ready to paste back as the new SEA_DEFAULTS.

type NumKey = { [K in keyof SeaParams]: SeaParams[K] extends number ? K : never }[keyof SeaParams]
const SLIDERS: { key: NumKey; label: string; min: number; max: number; step: number }[] = [
  { key: 'waveSpeed', label: 'Wave speed', min: 0, max: 3, step: 0.05 },
  { key: 'waveHeight', label: 'Wave height', min: 0, max: 3, step: 0.05 },
  { key: 'waveFrequency', label: 'Wave frequency', min: 0.3, max: 2.5, step: 0.05 },
  { key: 'waveDirection', label: 'Wave direction (°)', min: -180, max: 180, step: 1 },
  { key: 'textureIntensity', label: 'Surface texture', min: 0, max: 1.5, step: 0.01 },
  { key: 'normalStrength', label: 'Normal strength', min: 0, max: 3, step: 0.05 },
  { key: 'reflection', label: 'Reflection', min: 0, max: 3, step: 0.05 },
  { key: 'sparkle', label: 'Sparkle', min: 0, max: 4, step: 0.05 },
  { key: 'roughness', label: 'Water roughness', min: 0.02, max: 0.8, step: 0.01 },
  { key: 'transparency', label: 'Transparency (opacity)', min: 0.3, max: 1.3, step: 0.01 },
  { key: 'sandVisibility', label: 'Sand visibility (depth)', min: 0.5, max: 8, step: 0.1 },
  { key: 'caustic', label: 'Caustics', min: 0, max: 0.4, step: 0.005 },
  { key: 'foam', label: 'Shoreline foam', min: 0, max: 2, step: 0.05 }
]

export function SeaTuningPanel() {
  const [open, setOpen] = useState(false)
  const [p, setP] = useState<SeaParams>({ ...SEA_DEFAULTS })
  const [copied, setCopied] = useState(false)
  useEffect(() => applySea(p), [p])
  const set = <K extends keyof SeaParams>(k: K, v: SeaParams[K]) => setP((o) => ({ ...o, [k]: v }))
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(p, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('Copy the configuration:', JSON.stringify(p))
    }
  }
  const btn = 'rounded bg-white/15 px-2 py-1 text-xs text-white hover:bg-white/25'
  return (
    <div className="absolute right-3 top-3 z-10 w-64 select-none rounded-lg bg-black/65 p-2 font-mono text-[11px] text-white backdrop-blur">
      <button className="flex w-full items-center justify-between text-left text-xs font-semibold" onClick={() => setOpen((o) => !o)}>
        <span>Water tuning</span>
        <span>{open ? '–' : '+'}</span>
      </button>
      {open && (
        <div className="mt-2 flex max-h-[80vh] flex-col gap-1.5 overflow-y-auto pr-1">
          {SLIDERS.map((s) => (
            <label key={s.key} className="flex flex-col">
              <span className="flex justify-between">
                <span>{s.label}</span>
                <span className="tabular-nums text-white/70">{p[s.key]}</span>
              </span>
              <input type="range" min={s.min} max={s.max} step={s.step} value={p[s.key]} onChange={(e) => set(s.key, Number(e.target.value))} />
            </label>
          ))}
          {(['shallowColor', 'deepColor'] as const).map((k) => (
            <label key={k} className="flex items-center justify-between">
              <span>{k === 'shallowColor' ? 'Shallow-water colour' : 'Deep-water colour'}</span>
              <input type="color" value={p[k]} onChange={(e) => set(k, e.target.value)} />
            </label>
          ))}
          <div className="mt-1 flex gap-2">
            <button className={btn} onClick={() => setP({ ...SEA_DEFAULTS })}>
              Reset Defaults
            </button>
            <button className={btn} onClick={copy}>
              {copied ? 'Copied' : 'Copy Configuration'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
