import { delay } from '../_lib/motion'
import type { SqyshUpdate } from '../_lib/types'

// The changelog panel. Slides up over the stage; the top Sqysh stays put above it.
export function UpdatesPanel({ updates, onClose }: { updates: SqyshUpdate[]; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="This week at Sqysh"
      className="absolute inset-x-0 bottom-0 z-5 flex flex-col bg-[#09090f]/96 backdrop-blur-md top-[calc(env(safe-area-inset-top)+96px)] xs:top-[calc(env(safe-area-inset-top)+104px)] opacity-0 animate-[ciLift_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards]"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-105 flex-1 flex-col px-[max(24px,env(safe-area-inset-left))]">
        <p className="m-0 shrink-0 font-mono text-[10px] tracking-[0.22em] uppercase text-(--key)">
          This week at Sqysh
        </p>
        <h2 className="mt-2 shrink-0 font-sora text-[24px] font-black leading-[1.05] tracking-[-0.04em] text-balance xs:text-[28px]">
          What shipped since last Thursday
        </h2>

        <ol className="m-0 mt-5 min-h-0 flex-1 list-none overflow-y-auto p-0 pr-1">
          {updates.map((u, i) => (
            <li
              key={u.title}
              className="flex gap-3 border-t border-white/10 py-3.5 opacity-0 animate-[ciLift_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards]"
              style={delay(0.25 + i * 0.09)}
            >
              <span className="mt-0.5 w-6 shrink-0 font-mono text-[11px] tabular-nums text-(--key)">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <p className="m-0 font-sora text-[15px] font-semibold leading-snug tracking-[-0.01em]">{u.title}</p>
                {u.detail && (
                  <p className="m-0 mt-1 font-nunito text-[13px] leading-relaxed text-white/60">{u.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="shrink-0 border-t border-white/10 pt-4 pb-[max(26px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="flex h-13 w-full items-center justify-center gap-2 border border-white/20 bg-white/6 font-sora text-[14.5px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            Back to check-in
          </button>
        </div>
      </div>
    </div>
  )
}
