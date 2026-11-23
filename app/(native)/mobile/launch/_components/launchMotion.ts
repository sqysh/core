/** How long the camera's journey between the landing and signing in takes */
export const CAMERA_MS = 1900

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
