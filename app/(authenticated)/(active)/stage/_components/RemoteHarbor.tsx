'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { Frame } from '@/components/harbor/FollowCamera'
import type { HarborData } from '@/lib/harbor/loadHarbor'

// The harbor behind a remote, full screen, the same small copy of the TV harbor members see on their phones: on the
// person holding the remote's own boat (or the whole harbor until they've checked in), everyone's boats sailing in
// live. The remote's controls come out over it as a full-screen glass menu (GlassMenu).

const PhoneHarbor = dynamic(() => import('@/components/harbor/PhoneHarbor'), { ssr: false })

/** Their boat a little below the middle, clear of the corner button and the label */
export const REMOTE_FRAME: Frame = { landscape: [0.5, 0.55], portrait: [0.5, 0.55] }

export function RemoteHarbor({ harbor, me }: { harbor: HarborData; me: string }) {
  const [ready, setReady] = useState(false)
  const here = harbor.initialAttendees.includes(me)
  return (
    <div className="fixed inset-0 z-0 bg-[#0a1929]" aria-hidden="true">
      <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}>
        <PhoneHarbor {...harbor} me={me} sailMe={false} go frame={REMOTE_FRAME} onReady={() => setReady(true)} />
      </div>
      {!ready && (
        <div className="absolute left-[max(16px,env(safe-area-inset-left))] top-[max(16px,env(safe-area-inset-top))]">
          <span className="block h-6 w-6 animate-spin rounded-full border-[3px] border-white/15 border-t-sky-400" />
        </div>
      )}
      {ready && (
        <span className="absolute bottom-[max(14px,env(safe-area-inset-bottom))] left-[max(14px,env(safe-area-inset-left))] rounded-full border border-white/30 bg-white/10 px-3 py-1.5 font-mono text-[9px] tracking-[0.2em] text-white uppercase backdrop-blur-md [text-shadow:0_1px_3px_rgba(6,24,44,0.6)]">
          {here ? 'Your boat' : 'The harbor'}
        </span>
      )}
    </div>
  )
}
