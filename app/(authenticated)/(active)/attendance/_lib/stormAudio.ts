import { getAudioContext } from '@/lib/audio/audioContext'

// The storm's soundtrack: wind and rain that follow the weather, and thunder that rolls in after each flash.

export interface StormAudio {
  /** rain and storm are 0-1 */
  set: (rain: number, storm: number) => void
  /** A clap of thunder; closer is louder and sharper */
  thunder: (closeness: number) => void
  stop: () => void
}

function noiseSource(ctx: AudioContext) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate)
  const d = buf.getChannelData(0)
  // a little brown in the noise: it sounds like air and water rather than static
  let last = 0
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1
    last = (last + 0.04 * w) / 1.04
    d[i] = w * 0.55 + last * 5
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  return src
}

export function startStormAudio(): StormAudio | null {
  const ctx = getAudioContext()
  if (!ctx || ctx.state !== 'running') return null
  const t = ctx.currentTime

  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  // rain: a broad hiss
  const rain = noiseSource(ctx)
  const rainBand = ctx.createBiquadFilter()
  rainBand.type = 'bandpass'
  rainBand.frequency.value = 3200
  rainBand.Q.value = 0.35
  const rainGain = ctx.createGain()
  rainGain.gain.value = 0
  rain.connect(rainBand).connect(rainGain).connect(master)

  // wind: low and moving, swelling in gusts
  const wind = noiseSource(ctx)
  const windLp = ctx.createBiquadFilter()
  windLp.type = 'lowpass'
  windLp.frequency.value = 420
  const windGain = ctx.createGain()
  windGain.gain.value = 0
  const gust = ctx.createOscillator()
  gust.frequency.value = 0.18
  const gustDepth = ctx.createGain()
  gustDepth.gain.value = 0.05
  gust.connect(gustDepth).connect(windGain.gain)
  wind.connect(windLp).connect(windGain).connect(master)

  rain.start(t, Math.random() * 2)
  wind.start(t, Math.random() * 2)
  gust.start(t)
  master.gain.setTargetAtTime(1, t, 1.5)

  let stopped = false
  return {
    set(r, s) {
      if (stopped) return
      const now = ctx.currentTime
      rainGain.gain.setTargetAtTime(0.28 * r, now, 0.4)
      rainBand.frequency.setTargetAtTime(2400 + 1800 * r, now, 0.5)
      windGain.gain.setTargetAtTime(0.5 * s, now, 0.6)
      windLp.frequency.setTargetAtTime(260 + 500 * s, now, 0.6)
      gustDepth.gain.setTargetAtTime(0.05 + 0.2 * s, now, 0.6)
    },
    thunder(closeness) {
      if (stopped) return
      const now = ctx.currentTime + 0.02
      const c = Math.min(1, Math.max(0.15, closeness))
      const len = 2.2 + 3.2 * (1 - c * 0.5)

      // the rumble: low noise that swells and rolls away
      const src = noiseSource(ctx)
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(260 + 420 * c, now)
      lp.frequency.exponentialRampToValueAtTime(70, now + len)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, now)
      g.gain.exponentialRampToValueAtTime(1.1 * c, now + 0.12 + 0.5 * (1 - c))
      // a ragged tail: it rolls, dips, and rolls again
      g.gain.setTargetAtTime(0.55 * c, now + 0.7, 0.4)
      g.gain.setTargetAtTime(0.8 * c, now + 1.3, 0.3)
      g.gain.exponentialRampToValueAtTime(0.0001, now + len)
      src.connect(lp).connect(g).connect(master)
      src.start(now, Math.random() * 2)
      src.stop(now + len + 0.1)

      // the crack, only when it's close
      if (c > 0.55) {
        const crack = noiseSource(ctx)
        const hp = ctx.createBiquadFilter()
        hp.type = 'highpass'
        hp.frequency.value = 900
        const cg = ctx.createGain()
        cg.gain.setValueAtTime(0.9 * c, now)
        cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)
        crack.connect(hp).connect(cg).connect(master)
        crack.start(now, Math.random() * 2)
        crack.stop(now + 0.3)
      }

      // sub-bass you feel more than hear
      const sub = ctx.createOscillator()
      const sg = ctx.createGain()
      sub.type = 'sine'
      sub.frequency.setValueAtTime(58, now)
      sub.frequency.exponentialRampToValueAtTime(32, now + len * 0.8)
      sg.gain.setValueAtTime(0.0001, now)
      sg.gain.exponentialRampToValueAtTime(0.7 * c, now + 0.25)
      sg.gain.exponentialRampToValueAtTime(0.0001, now + len * 0.8)
      sub.connect(sg).connect(master)
      sub.start(now)
      sub.stop(now + len)
    },
    stop() {
      if (stopped) return
      stopped = true
      const now = ctx.currentTime
      master.gain.setTargetAtTime(0, now, 1.2)
      for (const n of [rain, wind, gust]) n.stop(now + 5)
    }
  }
}

/** A big swell rolling through: a low wash that builds as it nears and spills away as it passes, size 0-1 */
export function playWash(size: number, seconds: number) {
  const ctx = getAudioContext()
  if (!ctx || ctx.state !== 'running') return
  const t = ctx.currentTime + 0.02
  const src = noiseSource(ctx)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(180, t)
  lp.frequency.linearRampToValueAtTime(380 + 500 * size, t + seconds * 0.6)
  lp.frequency.exponentialRampToValueAtTime(140, t + seconds)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.12 + 0.3 * size, t + seconds * 0.6)
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
  src.connect(lp).connect(g).connect(ctx.destination)
  src.start(t, Math.random() * 2)
  src.stop(t + seconds + 0.1)
}
