'use client'

import { ReactNode, useEffect, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { GlassButton, GlassPanel } from '@/components/_shared/LiquidGlass'

// The controls on a remote, over the harbor: the screen is the person's boat on the water, like every member's, and a
// glass button in the corner brings the menu out over it as a full-screen sheet of liquid glass (the harbor still
// moving behind it, softened). The sheet is a row of columns: the remote's own panels (`children`: navigation, then
// whatever the moment calls for) and a narrow Close column of its own at the end. On a narrow upright phone the
// columns stack and Close becomes a slim bar across the top. The content stays mounted while the menu is away, so
// where the remote was (and the teleprompter's state) is just as it was left.

export function GlassMenu({
  label,
  children,
  defaultOpen = false
}: {
  /** What the corner button says while the menu is away */
  label: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <GlassButton
        onClick={() => setOpen(true)}
        aria-label={`Open the ${label.toLowerCase()}`}
        tabIndex={open ? -1 : 0}
        className={`fixed right-[max(14px,env(safe-area-inset-right))] top-[max(14px,env(safe-area-inset-top))] z-30 h-11 rounded-full px-4 text-[13px] ${
          open ? 'pointer-events-none opacity-0' : ''
        }`}
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
        {label}
      </GlassButton>

      {/* the sheet: clear glass over the whole screen, the harbor softened and brightened behind it */}
      <div
        className={`fixed inset-0 z-20 flex flex-col gap-3 bg-[#06101b]/15 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl backdrop-saturate-150 transition-[opacity,transform,visibility] duration-300 ease-out landscape:flex-row lg:flex-row ${
          open ? 'visible scale-100 opacity-100' : 'pointer-events-none invisible scale-[1.02] opacity-0'
        }`}
        aria-hidden={!open}
        inert={!open}
      >
        {/* Close: its own column, level with the panels beside it (a slim bar across the top on a narrow phone) */}
        <GlassPanel className="order-first flex h-14 shrink-0 items-center justify-between gap-3 rounded-2xl px-3 landscape:order-last landscape:h-auto landscape:w-16 landscape:flex-col landscape:justify-start landscape:px-0 landscape:py-3 lg:order-last lg:h-auto lg:w-16 lg:flex-col lg:justify-start lg:px-0 lg:py-3">
          <span className="font-mono text-[11px] tracking-[0.34em] uppercase text-white/80 landscape:hidden lg:hidden">
            {label}
          </span>
          <GlassButton onClick={() => setOpen(false)} aria-label="Close the menu" className="h-11 w-11 rounded-full">
            <X size={18} aria-hidden="true" />
          </GlassButton>
        </GlassPanel>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain landscape:grid landscape:grid-cols-[repeat(auto-fit,minmax(0,1fr))] landscape:overflow-hidden lg:grid lg:grid-cols-[repeat(auto-fit,minmax(0,1fr))] lg:overflow-hidden">
          {children}
        </div>
      </div>
    </>
  )
}
