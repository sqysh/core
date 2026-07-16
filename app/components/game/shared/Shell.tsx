'use client'

// Tiny shared layout wrappers used by every game's TV and phone views, so the
// dark background / max-width / centering aren't re-implemented per game.

import type { ReactNode } from 'react'

export function TVShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(120%_140%_at_50%_0%,#0f2233_0%,#06121b_70%)] text-white px-8 py-8">
      <div className="max-w-7xl mx-auto">{children}</div>
    </div>
  )
}

export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#06121b] text-white px-5 py-8">
      <div className="max-w-sm mx-auto">{children}</div>
    </div>
  )
}

export function Centered({ children }: { children: ReactNode }) {
  return <div className="text-center pt-16">{children}</div>
}

export function GameHeader({ label }: { label: string }) {
  return (
    <div className="flex items-baseline justify-between mb-8">
      <span className="font-quicksand font-black text-3xl">
        CORE<span className="text-emerald-400">.</span>
      </span>
      <span className="font-mono text-[11px] tracking-[0.32em] uppercase text-white/40">{label}</span>
    </div>
  )
}
