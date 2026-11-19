import { getAudioContext } from '@/lib/audio/audioContext'

// Every boat sounds like itself: its type decides the engine's character and the horn's shape, and its place among
// the members (0-14) nudges the pitch so no two boats share a voice. All of it is synthesized, so there are no
// sound files to carry around.

interface EngineSpec {
  /** Idle pitch in Hz of the engine's firing note */
  base: number
  /** Cylinder beat at idle, in pulses a second */
  chug: number
  /** How rough the exhaust is: depth of the beat */
  rough: number
  /** Water and exhaust hiss, 0-1 */
  hiss: number
  wave: OscillatorType
}

interface HornSpec {
  wave: OscillatorType
  /** Second note as a frequency ratio of the first */
  interval: number
  /** [start, length] in seconds for each blast */
  blasts: [number, number][]
  octave: number
}

const ENGINES: Record<string, EngineSpec> = {
  sloop: { base: 72, chug: 14, rough: 0.4, hiss: 0.25, wave: 'sawtooth' }, // auxiliary diesel
  schooner: { base: 56, chug: 11, rough: 0.5, hiss: 0.3, wave: 'sawtooth' },
  trawler: { base: 46, chug: 8, rough: 0.7, hiss: 0.35, wave: 'square' }, // slow, heavy chug
  lobster: { base: 62, chug: 17, rough: 0.55, hiss: 0.3, wave: 'sawtooth' },
  yacht: { base: 54, chug: 26, rough: 0.2, hiss: 0.2, wave: 'triangle' }, // smooth and quick
  tug: { base: 38, chug: 6.5, rough: 0.8, hiss: 0.4, wave: 'square' }, // deep and labouring
  dinghy: { base: 92, chug: 40, rough: 0.35, hiss: 0.15, wave: 'sawtooth' } // little outboard buzz
}

const HORNS: Record<string, HornSpec> = {
  sloop: {
    wave: 'triangle',
    interval: 1.5,
    blasts: [
      [0, 0.32],
      [0.42, 0.32]
    ],
    octave: 1
  },
  schooner: { wave: 'sawtooth', interval: 1.25, blasts: [[0, 0.9]], octave: 1 },
  trawler: { wave: 'sawtooth', interval: 1.5, blasts: [[0, 1.3]], octave: 0.5 }, // foghorn
  lobster: {
    wave: 'square',
    interval: 1.335,
    blasts: [
      [0, 0.28],
      [0.36, 0.7]
    ],
    octave: 1
  },
  yacht: { wave: 'triangle', interval: 1.26, blasts: [[0, 0.85]], octave: 1 },
  tug: {
    wave: 'sawtooth',
    interval: 1.5,
    blasts: [
      [0, 1.1],
      [1.25, 0.45]
    ],
    octave: 0.5
  },
  dinghy: {
    wave: 'square',
    interval: 1.5,
    blasts: [
      [0, 0.14],
      [0.22, 0.14],
      [0.44, 0.22]
    ],
    octave: 2
  }
}

export interface BoatVoice {
  engine: EngineSpec & { f0: number }
  horn: HornSpec & { f0: number }
}

/** index is the member's place (0-14) among everyone on the roster, spreading pitches over fifteen distinct steps */
export function voiceFor(kindKey: string, index: number): BoatVoice {
  const engine = ENGINES[kindKey] ?? ENGINES.sloop
  const horn = HORNS[kindKey] ?? HORNS.sloop
  const step = (index * 4) % 15 // 4 and 15 share no factor, so neighbours land far apart
  return {
    engine: { ...engine, f0: engine.base * Math.pow(2, (step - 7) / 40) },
    horn: { ...horn, f0: 146.8 * Math.pow(2, step / 12) * horn.octave }
  }
}

let noiseBuffer: AudioBuffer | null = null
function noise(ctx: AudioContext) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noiseBuffer.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  src.loop = true
  return src
}

export interface Engine {
  /** speed 0-1 (how hard it's working), pan -1..1 (left to right on screen), near 0-1 (how close it is to the viewer) */
  update: (speed: number, pan: number, near: number) => void
  /** Throttles down, bumps the dock and lets the water settle */
  stop: () => void
}

const MAX_ENGINES = 4
let running = 0

/** A burst of water: a short slap of filtered noise, the bow smacking a wave or the hull settling against the dock */
function slap(ctx: AudioContext, dest: AudioNode, freq: number, level: number, len: number) {
  const src = noise(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = freq
  bp.Q.value = 0.9
  const g = ctx.createGain()
  const t = ctx.currentTime
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(level, t + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t + len)
  src.connect(bp).connect(g).connect(dest)
  src.start(t, Math.random() * 1.5)
  src.stop(t + len + 0.05)
}

/**
 * A boat under way: the engine's firing note with a cylinder beat, wind rushing past, the bow wash and slapping waves.
 * All of it follows the boat's speed, so as the boat eases off the pitch drops, the wind dies away, the splashing
 * softens, and on arrival the motor throttles down and the hull bumps the dock.
 */
export function startEngine(voice: BoatVoice): Engine | null {
  const ctx = getAudioContext()
  if (!ctx || ctx.state !== 'running' || running >= MAX_ENGINES) return null
  running++

  const e = voice.engine
  const t = ctx.currentTime

  const out = ctx.createGain()
  out.gain.value = 0
  const pan = ctx.createStereoPanner()
  out.connect(pan).connect(ctx.destination)

  // the engine note: the body and a sub-octave, through a filter that opens as it revs
  const body = ctx.createOscillator()
  body.type = e.wave
  body.frequency.value = e.f0
  const sub = ctx.createOscillator()
  sub.type = 'sine'
  sub.frequency.value = e.f0 / 2
  const subGain = ctx.createGain()
  subGain.gain.value = 0.7
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 320
  lp.Q.value = 2

  // the cylinder beat: a low oscillator pulsing the engine's loudness
  const beat = ctx.createOscillator()
  beat.frequency.value = e.chug
  const beatDepth = ctx.createGain()
  beatDepth.gain.value = e.rough * 0.5
  const pulse = ctx.createGain()
  pulse.gain.value = 1 - e.rough * 0.5
  beat.connect(beatDepth).connect(pulse.gain)

  body.connect(lp)
  sub.connect(subGain).connect(lp)
  lp.connect(pulse).connect(out)

  // exhaust and water hiss
  const hiss = noise(ctx)
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 500
  band.Q.value = 0.7
  const hissGain = ctx.createGain()
  hissGain.gain.value = 0
  hiss.connect(band).connect(hissGain).connect(out)

  // wind: breathy noise that rises in pitch and loudness with speed, swelling in slow gusts
  const wind = noise(ctx)
  const windBand = ctx.createBiquadFilter()
  windBand.type = 'bandpass'
  windBand.frequency.value = 700
  windBand.Q.value = 0.4
  const windGain = ctx.createGain()
  windGain.gain.value = 0
  const gust = ctx.createOscillator()
  gust.frequency.value = 0.25 + Math.random() * 0.3
  const gustDepth = ctx.createGain()
  gustDepth.gain.value = 0.05
  gust.connect(gustDepth).connect(windGain.gain)
  wind.connect(windBand).connect(windGain).connect(out)

  // bow wash: a steady "sshh" that pulses like water folding off the bow, faster as the boat does
  const wash = noise(ctx)
  const washHp = ctx.createBiquadFilter()
  washHp.type = 'highpass'
  washHp.frequency.value = 1600
  const washGain = ctx.createGain()
  washGain.gain.value = 0
  const washPulse = ctx.createOscillator()
  washPulse.frequency.value = 1.4
  const washDepth = ctx.createGain()
  washDepth.gain.value = 0.05
  washPulse.connect(washDepth).connect(washGain.gain)
  wash.connect(washHp).connect(washGain).connect(out)

  for (const n of [body, sub, beat, hiss, gust, washPulse]) n.start(t)
  wind.start(t, Math.random() * 1.5)
  wash.start(t, Math.random() * 1.5)

  // a quick throaty start: the note cranks up from low as the motor catches
  body.frequency.setValueAtTime(e.f0 * 0.6, t)
  body.frequency.exponentialRampToValueAtTime(e.f0, t + 0.5)
  out.gain.setTargetAtTime(0.2, t, 0.1)
  slap(ctx, out, 1400, 0.5, 0.35) // the splash as it pushes off

  let stopped = false
  let nextSlap = 0
  let lastSpeed = 0
  return {
    update(speed, p, near) {
      if (stopped) return
      const now = ctx.currentTime
      const s = Math.min(1, Math.max(0, speed))
      // the pitch swings widely with speed, so easing into the berth is plainly heard as the motor winding down
      const f = e.f0 * (0.55 + 0.85 * s)
      body.frequency.setTargetAtTime(f, now, 0.12)
      sub.frequency.setTargetAtTime(f / 2, now, 0.12)
      beat.frequency.setTargetAtTime(e.chug * (0.5 + 1.1 * s), now, 0.12)
      lp.frequency.setTargetAtTime(220 + 950 * s, now, 0.12)
      band.frequency.setTargetAtTime(350 + 900 * s, now, 0.12)
      hissGain.gain.setTargetAtTime(e.hiss * 0.2 * s, now, 0.12)
      windBand.frequency.setTargetAtTime(500 + 1900 * s, now, 0.2)
      windGain.gain.setTargetAtTime(0.16 * s * s, now, 0.2)
      washPulse.frequency.setTargetAtTime(0.9 + 2.6 * s, now, 0.2)
      washGain.gain.setTargetAtTime(0.1 * s, now, 0.15)
      // louder as it nears the viewer, and a touch louder when it's working hard
      out.gain.setTargetAtTime((0.1 + 0.22 * near) * (0.6 + 0.4 * s), now, 0.15)
      pan.pan.setTargetAtTime(Math.max(-0.9, Math.min(0.9, p)), now, 0.1)

      // waves slapping the hull: more often and harder the faster it goes
      if (s > 0.12 && now > nextSlap) {
        slap(ctx, out, 1100 + Math.random() * 1800, 0.25 + 0.5 * s, 0.1 + Math.random() * 0.12)
        nextSlap = now + (0.35 + Math.random() * 0.6) / (0.25 + s)
      }
      lastSpeed = s
    },
    stop() {
      if (stopped) return
      stopped = true
      running--
      const now = ctx.currentTime
      // the throttle drops: the motor sputters down and dies, the wind drops away
      body.frequency.setTargetAtTime(e.f0 * 0.4, now, 0.3)
      sub.frequency.setTargetAtTime(e.f0 * 0.2, now, 0.3)
      beat.frequency.setTargetAtTime(e.chug * 0.35, now, 0.3)
      windGain.gain.setTargetAtTime(0, now, 0.15)
      washGain.gain.setTargetAtTime(0.03, now, 0.2)
      out.gain.setTargetAtTime(0, now + 0.5, 0.35)
      // the hull bumps the dock and the water laps against it
      const thump = ctx.createOscillator()
      const thumpGain = ctx.createGain()
      thump.type = 'sine'
      thump.frequency.setValueAtTime(95, now + 0.15)
      thump.frequency.exponentialRampToValueAtTime(42, now + 0.5)
      thumpGain.gain.setValueAtTime(0.0001, now + 0.15)
      thumpGain.gain.exponentialRampToValueAtTime(0.9, now + 0.18)
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6)
      thump.connect(thumpGain).connect(out)
      thump.start(now + 0.15)
      thump.stop(now + 0.7)
      slap(ctx, out, 900, 0.5 + lastSpeed * 0.1, 0.5)
      for (const n of [body, sub, beat, hiss, gust, washPulse, wind, wash]) n.stop(now + 1.8)
    }
  }
}

/** The boat's horn: one or two notes in its own shape and pitch, panned to where the boat sits */
export function playHorn(voice: BoatVoice, pan = 0, volume = 0.5) {
  const ctx = getAudioContext()
  if (!ctx || ctx.state !== 'running') return 0
  const h = voice.horn
  const t0 = ctx.currentTime + 0.02

  const p = ctx.createStereoPanner()
  p.pan.value = Math.max(-0.9, Math.min(0.9, pan))
  p.connect(ctx.destination)

  let end = 0
  for (const [at, len] of h.blasts) {
    const start = t0 + at
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(volume * 0.5, start + 0.04)
    g.gain.setValueAtTime(volume * 0.5, start + len - 0.08)
    g.gain.exponentialRampToValueAtTime(0.0001, start + len + 0.12)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = h.f0 * 7
    lp.connect(g).connect(p)
    for (const ratio of [1, h.interval]) {
      const osc = ctx.createOscillator()
      osc.type = h.wave
      osc.frequency.value = h.f0 * ratio
      // a horn's pitch sags a hair as it ends
      osc.frequency.setValueAtTime(h.f0 * ratio, start + len * 0.7)
      osc.frequency.exponentialRampToValueAtTime(h.f0 * ratio * 0.985, start + len + 0.1)
      osc.connect(lp)
      osc.start(start)
      osc.stop(start + len + 0.2)
    }
    end = Math.max(end, at + len + 0.12)
  }
  return end
}
