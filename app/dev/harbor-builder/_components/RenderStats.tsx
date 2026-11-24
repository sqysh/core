'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { WebGLRenderer } from 'three'

export type FrameStats = { fps: number; calls: number; triangles: number; geometries: number; textures: number; programs: number }

function setAutoReset(gl: WebGLRenderer, on: boolean) {
  gl.info.autoReset = on
}

/** Reads the renderer's own counters twice a second and reports them (draw calls and triangles are for a whole frame) */
export function RenderStats({ onStats }: { onStats: (s: FrameStats) => void }) {
  const gl = useThree((s) => s.gl)
  const frames = useRef(0)
  const since = useRef(0)
  // count every pass of a frame (post-processing renders several), not just the last one
  useEffect(() => {
    since.current = performance.now()
    setAutoReset(gl, false)
    return () => {
      setAutoReset(gl, true)
    }
  }, [gl])
  // runs first each frame: what's in the counters now is the whole of the last frame
  useFrame(() => {
    const info = gl.info
    frames.current++
    const now = performance.now()
    if (now - since.current >= 500) {
      onStats({
        fps: Math.round((frames.current * 1000) / (now - since.current)),
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs?.length ?? 0
      })
      frames.current = 0
      since.current = now
    }
    info.reset()
  }, -100)
  return null
}
