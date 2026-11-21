'use client'

let webglSupport: boolean | null = null

/**
 * Whether this device gives us a hardware WebGL context (a software fallback is too slow for a 3D scene). Checked once
 * per page, without loading any 3D library, and the test context is handed straight back.
 */
export function canRenderWebGL() {
  if (webglSupport !== null) return webglSupport
  try {
    const canvas = document.createElement('canvas')
    const opts = { failIfMajorPerformanceCaveat: true }
    const gl = (canvas.getContext('webgl2', opts) ?? canvas.getContext('webgl', opts)) as WebGLRenderingContext | null
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    webglSupport = !!gl
  } catch {
    webglSupport = false
  }
  return webglSupport
}
