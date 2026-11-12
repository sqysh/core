// A presenter with nothing uploaded still gets the stage: their name big on the

import { PRESENTATION_MINUTES } from '@/lib/constants/stage.constants'
import { useEffect, useState } from 'react'

// TV and the ten-minute clock counting down while they talk.
export function PresenterSpotlight({ name }: { name: string | null }) {
  const [left, setLeft] = useState(PRESENTATION_MINUTES * 60)
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [])
  const mm = Math.floor(left / 60)
  const ss = String(left % 60).padStart(2, '0')
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[4vh] bg-[radial-gradient(120%_90%_at_50%_-15%,#0c1b2e_0%,#081421_45%,#06101b_100%)] text-center">
      <p className="font-mono text-[1.6vw] tracking-[0.4em] uppercase text-primary-dark">Feature presentation</p>
      <h1 className="font-sora text-[7vw] font-black leading-none tracking-[-0.03em] text-balance text-white">
        {name ?? 'This week’s presenter'}
      </h1>
      <p className={`font-mono text-[4vw] font-bold tabular-nums ${left <= 60 ? 'text-red-400' : 'text-white/60'}`}>
        {mm}:{ss}
      </p>
      <p className="font-nunito text-[1.6vw] text-white/45">Ten minutes on the clock.</p>
    </div>
  )
}
