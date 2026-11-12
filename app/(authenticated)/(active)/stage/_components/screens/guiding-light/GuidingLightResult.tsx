'use client'

// Shown when the host taps "Introduce the Guiding Light" AFTER the winner has
// already been revealed: instead of replaying the lighthouse intro, the TV
// holds on the result - the week's Guiding Light in the gold spotlight.

import { StagePerson } from '@/lib/constants/stage.constants'
import { getInitials } from '@/lib/utils/shared.utils'

export function GuidingLightResult({ winner, judgeName }: { winner: StagePerson; judgeName: string | null }) {
  const hairline = "before:content-[''] before:h-px after:content-[''] after:h-px"
  return (
    <div className="absolute inset-0 overflow-hidden text-[#f4f8ff] bg-[radial-gradient(120%_90%_at_50%_-15%,#0c1b2e_0%,#081421_45%,#06101b_100%)]">
      <style>{`
        @keyframes glrPulse { 0%,100% { transform: scale(.92); opacity:.8 } 50% { transform: scale(1.06); opacity:1 } }
        @keyframes glrPop { to { transform: scale(1); opacity:1 } }
        @keyframes glrRise { 0% { transform: translateY(0); opacity: 0 } 12% { opacity: .7 } 100% { transform: translateY(-105vh); opacity: 0 } }
        @media (prefers-reduced-motion: reduce) {
          .glr-anim { animation: none !important; opacity: 1 !important; transform: none !important }
        }
      `}</style>

      {/* slow gold motes drifting up, so the screen never feels frozen */}
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="glr-anim pointer-events-none absolute bottom-[-4vh] h-1.5 w-1.5 rounded-full bg-[#f5c542]/60"
          style={{ left: `${10 + i * 10}%`, animation: `glrRise ${11 + (i % 5) * 2.5}s linear ${i * 1.3}s infinite` }}
        />
      ))}

      <div className="absolute inset-0 grid place-items-center">
        <div className="glr-anim absolute aspect-square w-[min(90vw,90vh)] rounded-full bg-[radial-gradient(circle,rgba(245,197,66,0.3),rgba(224,162,26,0.1)_45%,transparent_70%)] animate-[glrPulse_2.4s_ease-in-out_infinite]" />
        <div className="glr-anim relative flex scale-[0.6] flex-col items-center gap-[clamp(10px,1.6vh,22px)] opacity-0 animate-[glrPop_0.9s_cubic-bezier(0.2,1.3,0.35,1)_forwards]">
          <div className="grid aspect-square w-[clamp(160px,26vh,320px)] place-items-center overflow-hidden rounded-full border-4 border-[#f5c542] bg-[linear-gradient(140deg,#f5c542,#e0a21a)] font-sora text-[clamp(56px,11vh,120px)] font-extrabold text-[#140d00] shadow-[0_0_0_10px_rgba(245,197,66,0.12),0_0_90px_rgba(245,197,66,0.55)]">
            {winner.image ? (
              <img src={winner.image} alt={winner.name} className="h-full w-full object-cover" />
            ) : (
              getInitials(winner.name)
            )}
          </div>
          <div
            className={`inline-flex items-center gap-[0.8em] font-mono text-[clamp(11px,1.5vw,17px)] font-semibold uppercase tracking-[0.3em] text-[#f5c542] ${hairline} before:w-[clamp(24px,5vw,60px)] before:bg-[#f5c542] before:opacity-55 after:w-[clamp(24px,5vw,60px)] after:bg-[#f5c542] after:opacity-55`}
          >
            This Week&rsquo;s Guiding Light
          </div>
          <div className="text-balance text-center font-sora text-[clamp(40px,8.5vw,116px)] font-extrabold leading-[0.96] tracking-[-0.035em] text-white">
            {winner.name}
          </div>
          {winner.company && (
            <div className="font-mono text-[clamp(13px,2vw,26px)] font-medium uppercase tracking-[0.06em] text-[#f5c542]">
              {winner.company}
            </div>
          )}
          {judgeName && (
            <p className="mt-[0.6em] font-nunito text-[clamp(13px,1.6vw,21px)] text-[#f4f8ff]/50">
              Picked by {judgeName.split(' ')[0]}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
