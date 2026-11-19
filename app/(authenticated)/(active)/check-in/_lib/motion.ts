import type { Corner } from './types'

export const LIFT = 'animate-[ciLift_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards]'

export const delay = (...s: number[]) => ({ animationDelay: s.map((v) => `${v.toFixed(2)}s`).join(', ') })

export function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// The jump from the ring to the corner: a quadratic curve from the parked spot
// to the landing spot, bowed upward, sampled with an eased parameter so Motion
// can tween it linearly point to point and it still reads as one smooth arc.
// He leans into the direction of travel and straightens as he lands.
export function jumpPath(from: Corner, to: Corner) {
  const N = 16
  const ctrl = { x: from.x + (to.x - from.x) * 0.35, y: Math.min(from.y, to.y) - 72 }
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

  const x: number[] = []
  const y: number[] = []
  const scale: number[] = []
  const rotate: number[] = []

  for (let i = 0; i <= N; i++) {
    const u = ease(i / N)
    const a = (1 - u) * (1 - u)
    const b = 2 * (1 - u) * u
    const c = u * u
    x.push(a * from.x + b * ctrl.x + c * to.x)
    y.push(a * from.y + b * ctrl.y + c * to.y)
    // Shrink through the flight, with a small stretch at the top of the arc
    scale.push(from.scale + (to.scale - from.scale) * u + 0.03 * Math.sin(Math.PI * u))
    rotate.push(14 * Math.sin(Math.PI * u) * Math.sign(to.x - from.x))
  }

  return { x, y, scale, rotate }
}
