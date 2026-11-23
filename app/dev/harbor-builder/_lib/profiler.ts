export type FrameRecord = { t: number; dt: number; tris: number; calls: number }

export type Pcts = { p5: number; p50: number; p95: number; mean: number }

export type SampleReport = {
  label: string
  frames: number
  fps: Pcts
  frameMs: Pcts
  tris: number
  calls: number
}

export type BenchmarkConfig = {
  label: string
  shadows: boolean
  ocean: boolean
  finish: boolean
}

export const BENCHMARK_CONFIGS: BenchmarkConfig[] = [
  { label: 'Full scene', shadows: true, ocean: true, finish: true },
  { label: 'No ocean', shadows: true, ocean: false, finish: true },
  { label: 'No shadows', shadows: false, ocean: true, finish: true },
  { label: 'No ocean/shadows', shadows: false, ocean: false, finish: true },
  { label: 'Minimal', shadows: false, ocean: false, finish: false },
]

function pct(sorted: number[], p: number): number {
  if (!sorted.length) return 0
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i)
  return lo === Math.ceil(i) ? sorted[lo] : sorted[lo] * (Math.ceil(i) - i) + sorted[Math.ceil(i)] * (i - lo)
}

function computePcts(values: number[]): Pcts {
  const s = [...values].sort((a, b) => a - b)
  if (!s.length) return { p5: 0, p50: 0, p95: 0, mean: 0 }
  return {
    p5: +pct(s, 0.05).toFixed(1),
    p50: +pct(s, 0.5).toFixed(1),
    p95: +pct(s, 0.95).toFixed(1),
    mean: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(1),
  }
}

export function summarize(label: string, raw: FrameRecord[]): SampleReport {
  const f = raw.slice(10)
  if (f.length < 10) return { label, frames: 0, fps: computePcts([]), frameMs: computePcts([]), tris: 0, calls: 0 }
  return {
    label,
    frames: f.length,
    fps: computePcts(f.map((r) => 1000 / r.dt)),
    frameMs: computePcts(f.map((r) => r.dt)),
    tris: Math.round(f.reduce((a, r) => a + r.tris, 0) / f.length),
    calls: Math.round(f.reduce((a, r) => a + r.calls, 0) / f.length),
  }
}

export type BenchmarkMeta = {
  scene: string
  source: string
  resolution: string
  nativeDpr: number
  texturesMB: number
  modelTris: number
  models: number
  instances: number
}

export function formatReport(meta: BenchmarkMeta, results: SampleReport[]): string {
  const lines: string[] = []
  lines.push('=== SCENE PROFILER ===')
  lines.push(`Scene: ${meta.scene} (${meta.source})`)
  lines.push(`Resolution: ${meta.resolution} @ 1× canvas DPR (native ${meta.nativeDpr}×)`)
  lines.push(`GPU textures: ~${meta.texturesMB.toFixed(0)} MB · ${meta.models} models · ${meta.instances} instances`)
  lines.push(`Model triangles: ${(meta.modelTris / 1e6).toFixed(2)}M`)
  lines.push('')

  const pad = (s: string | number, w: number) => String(s).padStart(w)
  lines.push(
    `${'Config'.padEnd(22)} ${pad('FPS p50', 8)} ${pad('FPS p5', 7)} ${pad('ms p95', 9)} ${pad('Tris', 12)} ${pad('Draws', 6)}`
  )
  lines.push('─'.repeat(66))

  for (const r of results) {
    lines.push(
      `${r.label.padEnd(22)} ${pad(r.fps.p50, 8)} ${pad(r.fps.p5, 7)} ${pad(r.frameMs.p95 + ' ms', 9)} ${pad(r.tris.toLocaleString(), 12)} ${pad(r.calls, 6)}`
    )
  }

  if (results.length >= 5) {
    const full = results[0]
    const noOcean = results[1]
    const noShadows = results[2]
    const noOceanShadows = results[3]
    const minimal = results[4]
    lines.push('')
    lines.push('Cost isolation (fps gained by disabling):')
    lines.push(`  Shadows:         +${(noShadows.fps.p50 - full.fps.p50).toFixed(0)} fps, −${full.calls - noShadows.calls} draws`)
    lines.push(`  Ocean:           +${(noOcean.fps.p50 - full.fps.p50).toFixed(0)} fps, −${full.calls - noOcean.calls} draws`)
    lines.push(
      `  Post-processing: +${(minimal.fps.p50 - noOceanShadows.fps.p50).toFixed(0)} fps`
    )
    lines.push(`  Base ceiling:    ${minimal.fps.p50} fps (p50)`)
  }

  return lines.join('\n')
}
