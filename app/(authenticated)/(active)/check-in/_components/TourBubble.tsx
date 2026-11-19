import { TypeText } from '@/components/_shared/SqyshVector'

// The offer, once Sqysh has landed in the corner. Sits in a fixed-width slot
// to his left so it can never run off the screen. Mounted when the tour starts,
// so every animation here is relative to mount.
export function TourBubble({
  reduce,
  onShow,
  onDismiss
}: {
  reduce: boolean
  onShow: () => void
  onDismiss: () => void
}) {
  return (
    <div className="pointer-events-auto relative ml-auto w-fit max-w-full border border-white/15 bg-white/7 px-4 py-3 backdrop-blur-md opacity-0 animate-[ciLift_0.5s_cubic-bezier(0.16,1,0.3,1)_0.3s_both]">
      <p className="m-0 font-sora text-[15px] font-semibold leading-snug tracking-[-0.015em] xs:text-[16px]">
        <TypeText text="Wanna see what I was up to this week?" startAt={0.7} reduce={reduce} />
      </p>
      <div className="mt-3 flex gap-2 opacity-0 animate-[ciLift_0.5s_cubic-bezier(0.16,1,0.3,1)_2.2s_forwards]">
        <button
          type="button"
          onClick={onShow}
          className="flex h-11 flex-1 items-center justify-center bg-(--key) px-4 font-sora text-[13px] font-bold text-[#09090f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Show me
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-11 items-center justify-center border border-white/20 px-4 font-mono text-[12px] text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Not now
        </button>
      </div>
      <span
        className="absolute -right-1.75 top-6 h-3 w-3 rotate-45 border-r border-t border-white/15 bg-white/7"
        aria-hidden="true"
      />
    </div>
  )
}
