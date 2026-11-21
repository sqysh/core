import { getAudioContext } from '@/lib/audio/audioContext'
import { HeritageClassId as BoatClass } from '@/lib/vessel/catalog'

// Arrival sounds: one short, natural cue per arrival (about 2–4 seconds, faded out), never a running engine.
//
// If licensed recordings are dropped into /public/sound-effects/boats/ — runabout.mp3 (a motorboat pass),
// lobster.mp3 (a marine diesel), sloop.mp3 (water, wind and sailcloth) — those are used, trimmed and faded to fit.
// Until then each class has a carefully shaped synthesized cue:
//  - runabout: an outboard's throaty purr opening up and easing off as it passes, with spray
//  - lobster boat: a slow, deep diesel thump under a muffled exhaust rumble
//  - sloop: no engine — a bow wave, a breath of wind and a soft luff of sailcloth
// At most two cues play at once, under one master volume and mute.

/** Boat audio is switched off for now (to be reworked with the boats): no cue plays and no recordings are requested */
export const BOAT_AUDIO = false

const SAMPLE = (boat: BoatClass) => `/sound-effects/boats/${boat}.mp3`
const LENGTH: Record<BoatClass, number> = { runabout: 2.9, lobster: 3.6, sloop: 3.2 }
const MAX_AT_ONCE = 2
const STORE_KEY = 'checkin-voyage:audio'

type Settings = { volume: number; muted: boolean }
let settings: Settings = { volume: 0.7, muted: false }
try {
  if (typeof window !== 'undefined') settings = { ...settings, ...JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') }
} catch {}

let master: GainNode | null = null
function out(ctx: AudioContext) {
  if (!master) {
    master = ctx.createGain()
    // a gentle compressor lets the cues sit up front and full without clipping when two overlap
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 3
    comp.attack.value = 0.005
    comp.release.value = 0.2
    master.connect(comp).connect(ctx.destination)
  }
  master.gain.value = settings.muted ? 0 : settings.volume
  return master
}

export const audioSettings = () => settings
export function setAudio(next: Partial<Settings>) {
  settings = { ...settings, ...next }
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(settings))
  } catch {}
  const ctx = getAudioContext()
  if (ctx && master) master.gain.setTargetAtTime(settings.muted ? 0 : settings.volume, ctx.currentTime, 0.05)
}

// ─── samples ───────────────────────────────────────────────────────────────────

const samples = new Map<BoatClass, AudioBuffer | null | Promise<AudioBuffer | null>>()
function sample(ctx: AudioContext, boat: BoatClass) {
  const hit = samples.get(boat)
  if (hit !== undefined) return hit
  const p = fetch(SAMPLE(boat))
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .then((b) => (b ? ctx.decodeAudioData(b) : null))
    .catch(() => null)
    .then((buf) => {
      samples.set(boat, buf)
      return buf
    })
  samples.set(boat, p)
  return p
}
/** Look for the recordings early, so the first arrival doesn't wait on the network */
export function preloadBoatSamples() {
  const ctx = getAudioContext()
  if (BOAT_AUDIO && ctx) for (const b of ['runabout', 'lobster', 'sloop'] as BoatClass[]) void sample(ctx, b)
}

function playSample(ctx: AudioContext, buf: AudioBuffer, boat: BoatClass, pan: number, rate: number) {
  const t = ctx.currentTime
  const len = Math.min(LENGTH[boat], buf.duration / rate)
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = rate
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(1.0, t + 0.08)
  g.gain.setValueAtTime(1.0, t + len * 0.5)
  g.gain.exponentialRampToValueAtTime(0.0001, t + len)
  const p = ctx.createStereoPanner()
  p.pan.value = pan
  src.connect(g).connect(p).connect(out(ctx))
  src.start(t)
  src.stop(t + len + 0.05)
  return len
}

// ─── synthesized cues ──────────────────────────────────────────────────────────

let noiseBuffer: AudioBuffer | null = null
function noise(ctx: AudioContext) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noiseBuffer.getChannelData(0)
    // pinkish noise: softer than white, closer to water and wind
    let b0 = 0
    let b1 = 0
    let b2 = 0
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99765 * b0 + w * 0.099046
      b1 = 0.963 * b1 + w * 0.2965164
      b2 = 0.57 * b2 + w * 1.0526913
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2
    }
  }
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  src.loop = true
  return src
}

/** A swell envelope: in, hold, then a long natural fade */
function envelope(g: AudioParam, t: number, peak: number, attack: number, len: number) {
  g.setValueAtTime(0.0001, t)
  g.exponentialRampToValueAtTime(peak, t + attack)
  g.setTargetAtTime(peak * 0.75, t + attack, len * 0.25)
  g.setTargetAtTime(0.0001, t + len * 0.55, len * 0.16)
}

/**
 * Outboard: firing pulses (a sharp-edged low oscillator) drive a resonant body; the revs rise as it opens up, then
 * ease off as it slows toward the berth. Spray hiss rides on top.
 */
function runabout(ctx: AudioContext, dest: AudioNode, pitch: number) {
  const t = ctx.currentTime
  const len = LENGTH.runabout
  const f = 52 * pitch
  const fire = ctx.createOscillator()
  fire.type = 'sawtooth'
  fire.frequency.setValueAtTime(f * 0.8, t)
  fire.frequency.linearRampToValueAtTime(f * 1.35, t + 0.7)
  fire.frequency.setTargetAtTime(f * 0.95, t + 1.3, 0.6)
  const shape = ctx.createWaveShaper()
  const curve = new Float32Array(256)
  for (let i = 0; i < 256; i++) curve[i] = Math.tanh(((i / 255) * 2 - 1) * 3)
  shape.curve = curve
  const body = ctx.createBiquadFilter()
  body.type = 'bandpass'
  body.Q.value = 2.2
  body.frequency.setValueAtTime(420, t)
  body.frequency.linearRampToValueAtTime(820, t + 0.7)
  body.frequency.setTargetAtTime(520, t + 1.3, 0.6)
  const warm = ctx.createBiquadFilter()
  warm.type = 'lowpass'
  warm.frequency.value = 3400
  const eg = ctx.createGain()
  envelope(eg.gain, t, 0.85, 0.12, len)
  fire.connect(shape).connect(body).connect(warm).connect(eg).connect(dest)

  const spray = noise(ctx)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 2200
  const sg = ctx.createGain()
  envelope(sg.gain, t, 0.22, 0.2, len * 0.9)
  spray.connect(hp).connect(sg).connect(dest)

  fire.start(t)
  spray.start(t, Math.random())
  fire.stop(t + len + 0.2)
  spray.stop(t + len + 0.2)
}

/** Marine diesel: slow, heavy thumps through a muffled exhaust, a low hull rumble under it */
function lobster(ctx: AudioContext, dest: AudioNode, pitch: number) {
  const t = ctx.currentTime
  const len = LENGTH.lobster
  const rumble = noise(ctx)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 420
  lp.Q.value = 1.2
  const thump = ctx.createGain()
  thump.gain.value = 0.25
  // the cylinders: a slow pulse that opens and closes the exhaust
  const beat = ctx.createOscillator()
  beat.type = 'square'
  beat.frequency.setValueAtTime(7.5 * pitch, t)
  beat.frequency.setTargetAtTime(6.2 * pitch, t + 1.5, 0.8)
  const depth = ctx.createGain()
  depth.gain.value = 0.22
  beat.connect(depth).connect(thump.gain)
  const tone = ctx.createOscillator()
  tone.type = 'triangle'
  tone.frequency.setValueAtTime(46 * pitch, t)
  tone.frequency.setTargetAtTime(40 * pitch, t + 1.5, 0.8)
  const toneGain = ctx.createGain()
  toneGain.gain.value = 0.5
  const eg = ctx.createGain()
  envelope(eg.gain, t, 1.2, 0.18, len)
  rumble.connect(lp).connect(thump)
  tone.connect(toneGain).connect(thump)
  thump.connect(eg).connect(dest)

  const wash = noise(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 700
  bp.Q.value = 0.6
  const wg = ctx.createGain()
  envelope(wg.gain, t, 0.16, 0.3, len)
  wash.connect(bp).connect(wg).connect(dest)

  for (const n of [beat, tone]) n.start(t)
  rumble.start(t, Math.random())
  wash.start(t, Math.random())
  for (const n of [beat, tone, rumble, wash]) n.stop(t + len + 0.3)
}

/** Under sail: a bow wave folding over, a breath of wind, and the sail luffing softly as it rounds up */
function sloop(ctx: AudioContext, dest: AudioNode) {
  const t = ctx.currentTime
  const len = LENGTH.sloop
  const wave = noise(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.setValueAtTime(900, t)
  bp.frequency.setTargetAtTime(600, t + 1.2, 0.6)
  bp.Q.value = 0.5
  const wg = ctx.createGain()
  envelope(wg.gain, t, 0.55, 0.2, len)
  wave.connect(bp).connect(wg).connect(dest)

  const wind = noise(ctx)
  const wbp = ctx.createBiquadFilter()
  wbp.type = 'bandpass'
  wbp.frequency.value = 380
  wbp.Q.value = 0.8
  const wind2 = ctx.createGain()
  envelope(wind2.gain, t, 0.2, 0.5, len)
  wind.connect(wbp).connect(wind2).connect(dest)

  // two soft luffs of the sail, late in the cue as it slows
  for (const at of [1.3, 2.1]) {
    const s = noise(ctx)
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 300 + Math.random() * 120
    f.Q.value = 1.6
    const g = ctx.createGain()
    const flutter = ctx.createOscillator()
    flutter.frequency.value = 11 + Math.random() * 5
    const fd = ctx.createGain()
    fd.gain.value = 0.1
    flutter.connect(fd).connect(g.gain)
    g.gain.setValueAtTime(0.0001, t + at)
    g.gain.exponentialRampToValueAtTime(0.22, t + at + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.5)
    s.connect(f).connect(g).connect(dest)
    s.start(t + at, Math.random())
    flutter.start(t + at)
    s.stop(t + at + 0.6)
    flutter.stop(t + at + 0.6)
  }
  wave.start(t, Math.random())
  wind.start(t, Math.random())
  wave.stop(t + len + 0.3)
  wind.stop(t + len + 0.3)
}

// ─── public ────────────────────────────────────────────────────────────────────

let playing = 0

/**
 * One arrival cue for a boat class. `index` (the member's roster place) nudges the pitch so neighbours differ;
 * `pan` places it left–right. Skipped (silently) when two cues are already sounding or audio isn't unlocked yet.
 */
export function playArrival(boat: BoatClass, index: number, pan: number) {
  const ctx = getAudioContext()
  if (!BOAT_AUDIO || !ctx || ctx.state !== 'running' || playing >= MAX_AT_ONCE) return
  const pitch = Math.pow(2, (((index * 5) % 9) - 4) / 48)
  const placed = Math.max(-0.8, Math.min(0.8, pan))
  playing++
  const done = (len: number) => window.setTimeout(() => (playing = Math.max(0, playing - 1)), len * 1000)
  const recorded = samples.get(boat)
  if (recorded && !(recorded instanceof Promise)) {
    done(playSample(ctx, recorded, boat, placed, pitch))
    return
  }
  void sample(ctx, boat)
  const p = ctx.createStereoPanner()
  p.pan.value = placed
  p.connect(out(ctx))
  if (boat === 'runabout') runabout(ctx, p, pitch)
  else if (boat === 'lobster') lobster(ctx, p, pitch)
  else sloop(ctx, p)
  done(LENGTH[boat])
}
