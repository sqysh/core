/** Shortest signed difference between two angles */
export const angleDelta = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from))

/** Frame-rate independent exponential approach */
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt)
