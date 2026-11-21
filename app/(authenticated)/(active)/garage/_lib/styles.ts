import { Rarity } from '@/lib/vessel/items'

export const RARITY_TONE: Record<Rarity, string> = {
  common: 'text-white/60',
  uncommon: 'text-emerald-200',
  rare: 'text-sky-200',
  epic: 'text-violet-200',
  legendary: 'text-amber-200'
}

/** A list row on the glass: the glass button's look, laid out as label on the left and status on the right */
export const row = (on: boolean) =>
  `flex w-full items-center justify-between gap-3 rounded-2xl border text-left font-sora font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-md [text-shadow:0_1px_3px_rgba(4,16,32,0.5)] ${
    on ? 'border-sky-200/50 bg-sky-400/20' : 'border-white/22 bg-white/8'
  }`
export const label = 'm-0 font-mono text-[10px] uppercase tracking-[0.22em] text-white/60'
