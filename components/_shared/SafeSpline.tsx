'use client'

import dynamic from 'next/dynamic'
import { CSSProperties, ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { reportError } from '@/lib/utils/reportError'
import { canRenderWebGL } from '@/lib/utils/webgl'
import { RenderBoundary } from './RenderBoundary'

// A Spline scene that can't take the page down with it. @splinetool/react-spline rethrows any failure (a WebGL context
// the device can't create, one lost under memory pressure, the scene or its WebAssembly failing to load) during
// render; with nothing to catch it, that replaced the whole home page with Next's "This page couldn't load" on older
// iPhones. Here a scene:
//   - only starts on a device that can actually render WebGL (checked once, without the 2 MB runtime)
//   - only loads when it's near the viewport, so the runtime isn't part of the page's first load and two scenes don't
//     start together
//   - on touch devices, is let go again once it's scrolled well away, freeing its WebGL context and memory, so a phone
//     never holds more than one at a time
//   - falls back to a lightweight still (`fallback`) if it fails or its context is lost, and reports why
// The fallback also shows while the scene loads, then fades out under it, so nothing changes once it's up.

/** Nothing to subscribe to: the answer doesn't change once it's been checked */
const subscribeNever = () => () => {}

const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false, loading: () => null })

export function SafeSpline({
  scene,
  label,
  fallback = null,
  className = '',
  style
}: {
  scene: string
  /** Names the scene in error reports */
  label: string
  /** What shows instead (and while it loads): a still, a gradient; keep it light */
  fallback?: ReactNode
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  // checked on the client only (false while rendering on the server and hydrating)
  const capable = useSyncExternalStore(subscribeNever, canRenderWebGL, () => false)
  const [seenNear, setNear] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  // without an IntersectionObserver there's nothing to wait for: it's near as soon as it can run
  const near = seenNear || (capable && typeof IntersectionObserver === 'undefined')

  // load it as it comes near; on a touch device, let it go again once it's well out of view
  useEffect(() => {
    const el = ref.current
    if (!el || !capable) return
    if (typeof IntersectionObserver === 'undefined') return
    const touch = window.matchMedia('(pointer: coarse)').matches
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true)
        else if (touch) {
          setNear(false)
          setLoaded(false)
        }
      },
      { rootMargin: '250px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [capable])

  function onLoad() {
    setLoaded(true)
    // a context the browser takes back (memory pressure) leaves a blank canvas: show the still instead
    const canvas = ref.current?.querySelector('canvas')
    canvas?.addEventListener(
      'webglcontextlost',
      () => {
        reportError(`spline:${label}`, new Error('WebGL context lost'))
        setFailed(true)
      },
      { once: true }
    )
  }

  const live = capable && near && !failed
  return (
    <div ref={ref} className={`relative ${className}`} style={style}>
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${live && loaded ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden="true"
      >
        {fallback}
      </div>
      {live && (
        <RenderBoundary label={`spline:${label}`} onFail={() => setFailed(true)}>
          <Spline
            scene={scene}
            onLoad={onLoad}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent' }}
          />
        </RenderBoundary>
      )}
    </div>
  )
}
