import { getAudioContext } from './audioContext'

// A bright two-note "payment accepted" chime: a quick rising pair of bell tones, each a sine with a quiet octave
// and a shimmer on top, decaying like a struck glass.
const NOTES = [
  { freq: 1318.5, at: 0, len: 0.55 }, // E6
  { freq: 1975.5, at: 0.11, len: 0.95 } // B6
]

export function playCheckInChime(volume = 0.5) {
  const ctx = getAudioContext()
  // a suspended context would queue the chime and blurt it out at the next tap, so only play when it's running
  if (!ctx || ctx.state !== 'running') return false
  const t0 = ctx.currentTime + 0.02

  const master = ctx.createGain()
  master.gain.value = volume
  master.connect(ctx.destination)

  for (const n of NOTES) {
    const start = t0 + n.at
    for (const [mult, level] of [
      [1, 1],
      [2, 0.28],
      [3.01, 0.08]
    ] as const) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = n.freq * mult
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(level * 0.55, start + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0001, start + n.len)
      osc.connect(g).connect(master)
      osc.start(start)
      osc.stop(start + n.len + 0.05)
    }
  }
  return true
}
