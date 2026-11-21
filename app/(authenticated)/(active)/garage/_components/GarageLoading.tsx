'use client'

import { useEffect } from 'react'
import { useGarageContext } from '../_hooks/GarageContext'
import { loadProgress } from '../_lib/garage'

/**
 * A last resort: if the scene neither draws nor reports a failure in this long (a stalled download, say), the loading
 * screen goes anyway, so it can never sit over the Garage for good. A real load, even a slow phone's, finishes well
 * inside it, and this never delays the screen going away.
 */
const GIVE_UP_AFTER_MS = 30_000

/**
 * The loading screen over the whole Garage, menus included, until the 3D scene (the sea, the harbor and the boat) has
 * drawn its first frame, or the preview reports it can't (then the 2D drawing shows). It is the harbor's own water
 * (seafoam shallows into the deep turquoise the scene is drawn on), so it dissolves into the scene rather than
 * cutting to it. It fades away and stops catching taps, and stays mounted, so the canvas under it is never touched.
 */
export function GarageLoading() {
  const { sceneReady, previewFailed, setSceneReady, load } = useGarageContext()
  const done = sceneReady || previewFailed
  const { percent, status } = loadProgress(load, sceneReady)

  useEffect(() => {
    if (done) return
    const t = window.setTimeout(() => setSceneReady(true), GIVE_UP_AFTER_MS)
    return () => window.clearTimeout(t)
  }, [done, setSceneReady])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={done}
      className={`fixed inset-0 z-100 flex items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#9edeb0_0%,#66c0aa_42%,#1a8ea3_100%)] px-6 text-white transition-[opacity,visibility] duration-1000 ease-out ${
        done ? 'pointer-events-none invisible opacity-0' : 'visible opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center gap-5 text-center">
        <p className="m-0 font-sora text-[15px] font-bold">Preparing your vessel...</p>
        {/* a thin glass track, filled as far as the scene has really got */}
        <span
          role="progressbar"
          aria-label="Preparing your vessel"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="relative block h-1 w-44 overflow-hidden rounded-full border border-white/35 bg-white/20 backdrop-blur-sm"
        >
          {/* slid, not resized: a transform keeps moving smoothly while the scene is busy building */}
          <span
            className="absolute inset-0 rounded-full bg-linear-to-r from-cyan-100/80 to-white/90 transition-transform duration-500 ease-out"
            style={{ transform: `translateX(${percent - 100}%)` }}
          />
        </span>
        <p className="m-0 font-mono text-[11px] tracking-wider text-white/85">
          {percent}% · {status}
        </p>
      </div>
    </div>
  )
}
