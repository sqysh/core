'use client'

import { Paintbrush, PartyPopper, Ship, Trophy } from 'lucide-react'
import { useGarageContext } from '../_hooks/GarageContext'
import type { Section } from '../_lib/garage'

const TABS: { key: Section; label: string; icon: typeof Ship }[] = [
  { key: 'vessel', label: 'Vessel', icon: Ship },
  { key: 'customize', label: 'Customize', icon: PartyPopper },
  { key: 'paint', label: 'Paint', icon: Paintbrush },
  { key: 'progress', label: 'Progress', icon: Trophy }
]

/** The menu's tabs */
export function GarageNavigation() {
  const { section, openSection } = useGarageContext()
  return (
    <div className="grid grid-cols-4 gap-1" role="tablist" aria-label="Garage">
      {TABS.map(({ key, label: text, icon: Icon }) => {
        const on = section === key
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => openSection(key)}
            className={`flex h-13 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
              on ? 'bg-white/18 text-white' : 'text-white/65 hover:bg-white/8'
            }`}
          >
            <Icon size={17} aria-hidden="true" />
            <span className="max-w-full truncate font-sora text-[10px] font-bold">{text}</span>
          </button>
        )
      })}
    </div>
  )
}
