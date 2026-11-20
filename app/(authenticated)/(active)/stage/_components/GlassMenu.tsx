'use client'

import { ReactNode, useEffect, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

// The controls on a remote, over the harbor: the screen is the person's boat on the water, like every member's, and a
// glass button in the corner brings the whole menu out over it as a full-screen sheet of liquid glass (the harbor
// still moving behind it, softened), and puts it away again.

export function GlassMenu({
  label,
  children,
  tone = 'theme',
  defaultOpen = false
}: {
  /** What the corner button says while the menu is away */
  label: string
  children: ReactNode
  /** 'theme' follows the phone's light or dark setting (the host remote); 'dark' is always dark (the command deck) */
  tone?: 'theme' | 'dark'
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const sheet =
    tone === 'dark'
      ? 'bg-[#060a12]/30 shadow-[inset_0_0_0_1px_rgba(165,243,252,0.12)]'
      : 'bg-white/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)] dark:bg-[#06101b]/30 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close the menu' : `Open the ${label.toLowerCase()}`}
        className="fixed right-[max(14px,env(safe-area-inset-right))] top-[max(14px,env(safe-area-inset-top))] z-30 flex h-11 items-center gap-2 rounded-full border border-white/35 bg-white/12 px-4 font-sora text-[13px] font-black text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.55),0_8px_24px_rgba(6,24,44,0.3)] backdrop-blur-md backdrop-saturate-150 transition-transform [text-shadow:0_1px_3px_rgba(6,24,44,0.5)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {open ? <X size={16} aria-hidden="true" /> : <SlidersHorizontal size={16} aria-hidden="true" />}
        {open ? 'Close' : label}
      </button>

      {/* the menu: clear glass over the whole screen, the harbor blurred and brightened behind it */}
      <div
        className={`fixed inset-0 z-20 flex flex-col overflow-y-auto overscroll-contain pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(4.25rem,calc(env(safe-area-inset-top)+3.5rem))] backdrop-blur-2xl backdrop-saturate-150 transition-[opacity,transform,visibility] duration-300 ease-out landscape:overflow-hidden landscape:pb-[max(0.75rem,env(safe-area-inset-bottom))] landscape:pt-[max(0.75rem,env(safe-area-inset-top))] ${sheet} ${
          open ? 'visible scale-100 opacity-100' : 'pointer-events-none invisible scale-[1.03] opacity-0'
        }`}
        aria-hidden={!open}
      >
        {children}
      </div>
    </>
  )
}
