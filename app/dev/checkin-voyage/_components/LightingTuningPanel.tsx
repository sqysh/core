'use client'

import { useState } from 'react'
import {
  APPROVED_LIGHT,
  GOLDEN_LIGHT,
  LightParams,
  setLight,
  TONE_MAPPINGS,
  ToneMap,
  useLight
} from '../_lib/lightLook'

// TEMPORARY dev panel, beside the Water tuning panel: live sliders for the harbor's lighting and colour grading. Reset
// restores the approved configuration the scene had before this panel; Golden is the warmer experimental proposal.

type NumKey = { [K in keyof LightParams]: LightParams[K] extends number ? K : never }[keyof LightParams]
const GROUPS: { title: string; sliders: { key: NumKey; label: string; min: number; max: number; step: number }[] }[] = [
  {
    title: 'Sun',
    sliders: [
      { key: 'sunIntensity', label: 'Sun intensity', min: 0, max: 8, step: 0.05 },
      { key: 'sunAzimuth', label: 'Sun direction (°)', min: -180, max: 180, step: 1 },
      { key: 'sunElevation', label: 'Sun height (°)', min: 10, max: 85, step: 1 },
      { key: 'shadowSoftness', label: 'Shadow softness', min: 0, max: 24, step: 0.5 }
    ]
  },
  {
    title: 'Ambient and fill',
    sliders: [
      { key: 'ambient', label: 'Ambient (sky/ground)', min: 0, max: 3, step: 0.05 },
      { key: 'fillIntensity', label: 'Cool fill', min: 0, max: 2, step: 0.05 },
      { key: 'reflections', label: 'Reflections', min: 0, max: 2, step: 0.05 },
      { key: 'exposure', label: 'Exposure', min: 0.5, max: 1.8, step: 0.01 }
    ]
  },
  {
    title: 'Contact shadows and glow',
    sliders: [
      { key: 'aoIntensity', label: 'Contact shadow strength', min: 0, max: 5, step: 0.1 },
      { key: 'aoRadius', label: 'Contact shadow radius', min: 0.2, max: 2, step: 0.05 },
      { key: 'bloom', label: 'Bloom', min: 0, max: 1.5, step: 0.05 },
      { key: 'bloomThreshold', label: 'Bloom threshold', min: 0.6, max: 1.2, step: 0.01 }
    ]
  },
  {
    title: 'Colour grade',
    sliders: [
      { key: 'saturation', label: 'Saturation', min: -0.5, max: 0.6, step: 0.01 },
      { key: 'contrast', label: 'Contrast', min: -0.3, max: 0.4, step: 0.01 },
      { key: 'brightness', label: 'Brightness', min: -0.2, max: 0.2, step: 0.005 },
      { key: 'vignette', label: 'Vignette', min: 0, max: 0.6, step: 0.01 }
    ]
  }
]
const COLOURS: { key: 'sunColor' | 'skyColor' | 'groundColor' | 'fillColor'; label: string }[] = [
  { key: 'sunColor', label: 'Sun colour' },
  { key: 'skyColor', label: 'Sky (ambient top)' },
  { key: 'groundColor', label: 'Ground bounce' },
  { key: 'fillColor', label: 'Fill colour' }
]

export function LightingTuningPanel() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const p = useLight()
  const btn = 'rounded bg-white/15 px-2 py-1 text-xs text-white hover:bg-white/25'
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(p, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('Copy the configuration:', JSON.stringify(p))
    }
  }
  return (
    <div className="absolute right-[17.5rem] top-3 z-10 w-64 select-none rounded-lg bg-black/65 p-2 font-mono text-[11px] text-white backdrop-blur">
      <button
        className="flex w-full items-center justify-between text-left text-xs font-semibold"
        onClick={() => setOpen((o) => !o)}
      >
        <span>Lighting tuning</span>
        <span>{open ? '–' : '+'}</span>
      </button>
      {open && (
        <div className="mt-2 flex max-h-[80vh] flex-col gap-1.5 overflow-y-auto pr-1">
          <div className="flex gap-2">
            <button className={btn} onClick={() => setLight({ ...APPROVED_LIGHT })}>
              Reset (approved)
            </button>
            <button className={btn} onClick={() => setLight({ ...GOLDEN_LIGHT })}>
              Golden
            </button>
          </div>
          {GROUPS.map((g) => (
            <div key={g.title} className="flex flex-col gap-1.5">
              <p className="m-0 mt-1 text-white/55">{g.title}</p>
              {g.title === 'Sun' && (
                <label className="flex items-center justify-between">
                  <span>Sun colour</span>
                  <input type="color" value={p.sunColor} onChange={(e) => setLight({ sunColor: e.target.value })} />
                </label>
              )}
              {g.title === 'Ambient and fill' &&
                COLOURS.filter((c) => c.key !== 'sunColor').map((c) => (
                  <label key={c.key} className="flex items-center justify-between">
                    <span>{c.label}</span>
                    <input type="color" value={p[c.key]} onChange={(e) => setLight({ [c.key]: e.target.value })} />
                  </label>
                ))}
              {g.sliders.map((s) => (
                <label key={s.key} className="flex flex-col">
                  <span className="flex justify-between">
                    <span>{s.label}</span>
                    <span className="tabular-nums text-white/70">{Math.round(p[s.key] * 1000) / 1000}</span>
                  </span>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={p[s.key]}
                    onChange={(e) => setLight({ [s.key]: Number(e.target.value) })}
                  />
                </label>
              ))}
            </div>
          ))}
          <label className="flex items-center justify-between">
            <span>Tone mapping</span>
            <select
              value={p.tone}
              onChange={(e) => setLight({ tone: e.target.value as ToneMap })}
              className="rounded bg-[#1a1f24] px-1 py-0.5"
            >
              {TONE_MAPPINGS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-1 flex gap-2">
            <button className={btn} onClick={copy}>
              {copied ? 'Copied' : 'Copy Configuration'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
