import { coastShore } from './coast'

// The harbor's swell, shared by the water shader (which draws it) and the simulation (boats, wakes and hull collars
// ride it). Four long, low swells from different directions, so the surface never repeats; they die away in the
// shallows, and calm toward the edge of the near sea where it meets the flat far sea.

/** [direction x, direction z, wavelength, amplitude, phase] */
export const SWELLS: [number, number, number, number, number][] = [
  [0.94, 0.34, 19, 0.045, 0.0],
  [0.6, 0.8, 12.5, 0.03, 1.7],
  [-0.28, 0.96, 8.3, 0.018, 4.1],
  [0.99, -0.14, 5.9, 0.009, 2.6]
]
/** Height of still water */
export const SEA_LEVEL = 0.022
/** Centre of the near sea; the swell fades out between these distances from it */
export const SEA_CENTER = { x: 12, z: 9 }
export const SEA_FADE = [110, 140] as const

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** How much swell reaches a point: none in the shallows, full out in the harbor, calming far out */
export function swellMask(x: number, z: number, shore = coastShore(x, z)) {
  const far = Math.hypot(x - SEA_CENTER.x, z - SEA_CENTER.z)
  return smooth(0.8, 3.5, shore) * (1 - smooth(SEA_FADE[0], SEA_FADE[1], far))
}

const omega = (wavelength: number) => Math.sqrt((9.8 * 2 * Math.PI) / wavelength) * 0.32

/** Water height and slope at a point */
export function seaAt(x: number, z: number, t: number, mask = swellMask(x, z)) {
  let h = 0
  let gx = 0
  let gz = 0
  for (const [dx, dz, wl, a, ph] of SWELLS) {
    const k = (2 * Math.PI) / wl
    const phase = (dx * x + dz * z) * k - omega(wl) * t + ph
    h += a * Math.sin(phase)
    const c = a * k * Math.cos(phase)
    gx += c * dx
    gz += c * dz
  }
  return { h: SEA_LEVEL + h * mask, gx: gx * mask, gz: gz * mask }
}

/** The same swell, in GLSL: `vec3 sea(vec2 p, float t, float mask)` returns (height, slope x, slope z) */
export const SEA_GLSL = /* glsl */ `
vec3 sea(vec2 p, float t, float mask) {
  float h = 0.0;
  vec2 g = vec2(0.0);
  ${SWELLS.map(([dx, dz, wl, a, ph]) => {
    const k = ((2 * Math.PI) / wl).toFixed(6)
    const w = omega(wl).toFixed(6)
    return `{
    float ph = dot(vec2(${dx.toFixed(4)}, ${dz.toFixed(4)}), p) * ${k} - ${w} * t + ${ph.toFixed(4)};
    h += ${a.toFixed(4)} * sin(ph);
    g += ${(a * ((2 * Math.PI) / wl)).toFixed(6)} * cos(ph) * vec2(${dx.toFixed(4)}, ${dz.toFixed(4)});
  }`
  }).join('\n  ')}
  return vec3(${SEA_LEVEL.toFixed(4)} + h * mask, g * mask);
}
`
