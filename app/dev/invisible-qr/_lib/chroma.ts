// Balanced chrominance: the QR code is written as opposite blue changes on its dark and light modules (dark: less blue,
// light: more), and each module's brightness is put back with red and green, so the code is a shift of colour, not of
// light. Browsers blend layers on gamma-encoded sRGB values, so the layers' colours are worked out there, while
// brightness is measured where it means something: as relative luminance, in linear light.
//
// Only multiply (scales a channel down) and screen (lifts it toward white) are used. Neither can push a channel past
// black or white, so nothing clips, and both act on each pixel of the scene, so the water's own detail carries through.
//
// A layer can't know the colour under each pixel, so the compensation is solved at one reference colour (the sea's
// typical turquoise): exact there, and close for colours near it.

/** sRGB (0-1, gamma-encoded) to linear light */
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
/** Relative luminance of a gamma-encoded sRGB colour */
const luminance = (r: number, g: number, b: number) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
/** What screen blending with `t` does to a channel */
const screen = (c: number, t: number) => 1 - (1 - c) * (1 - t)

/** '#rrggbb' as 0-1 channels */
export const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** Solves f(x) = target for x in [0, 1], f monotonic (either way), by halving: plenty for 8-bit colour */
function solve(f: (x: number) => number, target: number) {
  let lo = 0
  let hi = 1
  const rising = f(1) > f(0)
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2
    if (f(mid) < target === rising) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

const byte = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 255)

export type BalancedLayers = {
  /** Multiply layer: dark modules lose blue, light modules lose red and green */
  multiply: { dark: string; light: string }
  /** Screen layer: dark modules gain red and green, light modules gain blue */
  screen: { dark: string; light: string }
  /** For the readout: the reference colour's blue on dark and light modules (0-255), and the luminance left over (a fraction) */
  blueDark: number
  blueLight: number
  residual: number
}

/**
 * The two layers' colours for a strength (0-100: the share of the blue channel's room, down toward black on dark modules
 * and up toward white on light ones) at a reference colour.
 */
export function balancedLayers(strength: number, reference: string): BalancedLayers {
  const s = Math.max(0, Math.min(0.95, strength / 100))
  const [r, g, b] = hexToRgb(reference)
  const target = luminance(r, g, b)

  // dark modules: blue scaled down, then red and green lifted together until the luminance is back
  const bDark = b * (1 - s)
  const lift = solve((t) => luminance(screen(r, t), screen(g, t), bDark), target)
  // light modules: blue lifted, then red and green scaled down together until the luminance is back
  const bLight = screen(b, s)
  const scale = solve((m) => luminance(r * m, g * m, bLight), target)

  // the layers can only hold whole 8-bit values, so the compensation is measured as it will actually be drawn
  const q = (x: number) => byte(x) / 255
  const residual =
    Math.max(
      Math.abs(luminance(screen(r, q(lift)), screen(g, q(lift)), b * q(1 - s)) - target),
      Math.abs(luminance(r * q(scale), g * q(scale), screen(b, q(s))) - target)
    ) / target
  const rgb = (x: number, y: number, z: number) => `rgb(${byte(x)}, ${byte(y)}, ${byte(z)})`
  return {
    multiply: { dark: rgb(1, 1, 1 - s), light: rgb(scale, scale, 1) },
    screen: { dark: rgb(lift, lift, 0), light: rgb(0, 0, s) },
    blueDark: byte(bDark),
    blueLight: byte(bLight),
    residual
  }
}
