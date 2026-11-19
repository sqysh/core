// The storm as a set of tracks: each is a list of [seconds, value] keyframes, eased between. One clock drives the
// clouds, the sea, the rain, the sound and the lightning, so they all agree on what the weather is doing.

export const STORM_SECONDS = 78

type Track = [number, number][]

export const TRACKS: Record<'roll' | 'storm' | 'wave' | 'rain' | 'part' | 'sun', Track> = {
  // dark clouds arriving from the left
  roll: [
    [0, 0],
    [14, 1]
  ],
  // how dark and heavy the whole scene is
  storm: [
    [0, 0],
    [10, 0.3],
    [24, 0.55],
    [36, 0.9],
    [54, 0.9],
    [64, 0.45],
    [72, 0],
    [STORM_SECONDS, 0]
  ],
  // the sea getting up, and settling
  wave: [
    [0, 0],
    [10, 0.35],
    [22, 0.65],
    [36, 1],
    [54, 1],
    [66, 0.5],
    [STORM_SECONDS, 0]
  ],
  // a spit of rain, then the downpour
  rain: [
    [0, 0],
    [12, 0],
    [16, 0.14],
    [26, 0.28],
    [36, 1],
    [54, 1],
    [62, 0.3],
    [68, 0]
  ],
  // the clouds split and leave
  part: [
    [0, 0],
    [62, 0],
    [74, 1]
  ],
  // a warm break in the sky as they part
  sun: [
    [0, 0],
    [62, 0],
    [68, 0.8],
    [76, 0.5],
    [STORM_SECONDS, 0]
  ]
}

/** Lightning is only in the heart of the storm */
export const LIGHTNING_FROM = 38
export const LIGHTNING_UNTIL = 56

const ease = (x: number) => x * x * (3 - 2 * x)

export function sample(track: Track, t: number) {
  if (t <= track[0][0]) return track[0][1]
  for (let i = 1; i < track.length; i++) {
    const [t1, v1] = track[i]
    if (t <= t1) {
      const [t0, v0] = track[i - 1]
      return v0 + (v1 - v0) * ease((t - t0) / (t1 - t0))
    }
  }
  return track[track.length - 1][1]
}
