'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

// WebGL only exists in the browser; the scene's code is only fetched when this screen mounts
const LaunchHarbor = dynamic(() => import('./_components/LaunchHarbor'), { ssr: false })

/**
 * The harbor behind the launch screen. The plain sea gradient shows while it builds, and the scene fades in over it
 * once it has painted. Soft shading at the top and bottom keeps the wordmark and the buttons readable over it.
 * The canvas stays mounted throughout: signing in only moves its camera.
 */
export function LaunchBackground({ signingIn }: { signingIn: boolean }) {
  const [ready, setReady] = useState(false)
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_85%,#1f8fa8_0%,#0f5a78_35%,#0d2a47_70%,#0d1727_100%)]" />
      <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}>
        <LaunchHarbor signingIn={signingIn} onReady={() => setReady(true)} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-linear-to-b from-[#06182c]/25 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-linear-to-t from-[#06182c]/35 to-transparent" />
    </div>
  )
}
