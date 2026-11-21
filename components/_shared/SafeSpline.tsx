'use client'

import dynamic from 'next/dynamic'
import { Component, CSSProperties, ReactNode, useEffect, useRef, useState } from 'react'
import { reportError } from '@/lib/utils/reportError'

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

const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false, loading: () => null })

let webglSupport: boolean | null = null
/** Whether this device gives us a hardware WebGL context (a software fallback is too slow for a scene) */
function canRenderWebGL() {
  if (webglSupport !== null) return webglSupport
  try {
    const canvas = document.createElement('canvas')
    const opts = { failIfMajorPerformanceCaveat: true }
    const gl = (canvas.getContext('webgl2', opts) ?? canvas.getContext('webgl', opts)) as WebGLRenderingContext | null
    // hand the test context straight back, so it doesn't count against the page's limit
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    webglSupport = !!gl
  } catch {
    webglSupport = false
  }
  return webglSupport
}

class SceneBoundary extends Component<{ label: string; onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    reportError(`spline:${this.props.label}`, error)
    this.props.onFail()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

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
  const [capable, setCapable] = useState(false)
  const [near, setNear] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setCapable(canRenderWebGL())
  }, [])

  // load it as it comes near; on a touch device, let it go again once it's well out of view
  useEffect(() => {
    const el = ref.current
    if (!el || !capable) return
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
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
        <SceneBoundary label={label} onFail={() => setFailed(true)}>
          <Spline
            scene={scene}
            onLoad={onLoad}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent' }}
          />
        </SceneBoundary>
      )}
    </div>
  )
}
