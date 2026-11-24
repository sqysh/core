'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { FrameStats } from './RenderStats'
import { type BenchmarkMeta, formatReport, type SampleReport } from '../_lib/profiler'

export const panel =
  'pointer-events-auto max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-white/15 bg-[#0d1727]/85 p-4 text-white shadow-xl backdrop-blur-md'
export const label = 'font-mono text-[10px] uppercase tracking-[0.18em] text-white/50'
export const chip = (on: boolean) =>
  `rounded-lg border px-2.5 py-1 text-xs transition-colors disabled:opacity-35 ${on ? 'border-sky-300/60 bg-sky-400/25 text-white' : 'border-white/15 bg-white/5 text-white/75 hover:bg-white/10'}`
export const mb = (b: number) => `${(b / 1024 / 1024).toFixed(b < 1024 * 1024 * 10 ? 1 : 0)} MB`
export const count = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : `${Math.round(n)}`

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="flex items-center justify-between gap-2">
        <p className={label}>{title}</p>
        {right}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

export function Slider({
  name,
  value,
  shown,
  min,
  max,
  step,
  onChange
}: {
  name: string
  value: number
  shown: string
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="mt-2 block text-xs text-white/80">
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
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-sky-300"
      />
    </label>
  )
}

/** A number typed in: it commits on Enter or leaving the field (Escape puts it back), arrows step it */
export function NumberField({
  value,
  step,
  digits,
  onCommit,
  prefix
}: {
  value: number
  step: number
  digits: number
  onCommit: (v: number) => void
  prefix?: string
}) {
  // what's typed while editing; otherwise the field shows the value as it is
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(false)
  const shown = editing ? text : value.toFixed(digits)
  const commit = () => {
    setEditing(false)
    const v = Number(text)
    if (Number.isFinite(v) && v !== value) onCommit(v)
  }
  return (
    <label className="flex min-w-0 items-center gap-1 rounded-md border border-white/10 bg-black/25 px-1.5 py-0.5 focus-within:border-sky-300/60">
      {prefix && <span className="font-mono text-[10px] text-white/40">{prefix}</span>}
      <input
        value={shown}
        inputMode="decimal"
        onFocus={() => {
          setText(value.toFixed(digits))
          setEditing(true)
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          else if (e.key === 'Escape') {
            setEditing(false)
            ;(e.target as HTMLInputElement).blur()
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const v = Number(((Number(text) || 0) + (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1)).toFixed(digits))
            setText(v.toFixed(digits))
            onCommit(v)
          }
        }}
        className="w-full min-w-0 bg-transparent font-mono text-[11px] text-white outline-none"
      />
    </label>
  )
}

export function BenchmarkOverlay({
  results,
  scene,
  source,
  textures,
  modelTris,
  models,
  instances,
  onClose,
}: {
  results: SampleReport[]
  scene: string
  source: string
  textures: number
  modelTris: number
  models: number
  instances: number
  onClose: () => void
}) {
  const preRef = useRef<HTMLPreElement>(null)
  const meta: BenchmarkMeta = {
    scene,
    source,
    resolution: `${window.innerWidth}×${window.innerHeight}`,
    nativeDpr: window.devicePixelRatio,
    texturesMB: textures / (1024 * 1024),
    modelTris,
    models,
    instances,
  }
  const report = formatReport(meta, results)
  // eslint-disable-next-line no-console
  useEffect(() => console.log(report), [report])
  const copy = () => {
    navigator.clipboard.writeText(report).catch(() => {})
  }
  return (
    <div className="pointer-events-auto absolute inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`${panel} max-w-[52rem] overflow-auto`}>
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className={label}>Scene profiler</p>
          <div className="flex gap-2">
            <button className={chip(false)} onClick={copy}>Copy</button>
            <button className={chip(false)} onClick={onClose}>Close</button>
          </div>
        </div>
        <pre ref={preRef} className="whitespace-pre text-[11px] leading-relaxed text-white/85 font-mono">{report}</pre>
      </div>
    </div>
  )
}

/** The renderer's own counters for the last frame */
export function FrameBar({ frame, extra }: { frame: FrameStats | null; extra?: ReactNode }) {
  if (!frame) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4">
      <div className={`${panel} flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-2 text-xs`}>
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
        {extra}
      </div>
    </div>
  )
}
