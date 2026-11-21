'use client'

import Link from 'next/link'
import { ChevronLeft, Coins } from 'lucide-react'
import { glassButton, glassPanel } from '@/components/_shared/LiquidGlass'
import { LinkBody } from '@/components/_shared/LinkBody'
import { boatName } from '@/lib/vessel/items'
import { useGarageContext } from '../_hooks/GarageContext'

/** Back, whose boat and its level, and their credits */
export function GarageHeader() {
  const { draft, firstName, heritage, level, credits, section, openSection } = useGarageContext()
  return (
    <div className="pointer-events-none absolute left-0 top-0 flex items-center gap-2.5 pl-[max(12px,env(safe-area-inset-left))] pt-[max(12px,env(safe-area-inset-top))]">
      <Link
        href="/dashboard"
        aria-label="Back to the dashboard"
        className={`${glassButton()} pointer-events-auto h-11 w-11 shrink-0 rounded-full`}
      >
        <LinkBody icon={<ChevronLeft size={20} aria-hidden="true" />} spinnerClass="h-4 w-4" />
      </Link>
      <div className={`${glassPanel} rounded-full px-4 py-1.5`}>
        <p className="m-0 font-mono text-[9px] uppercase tracking-[0.28em] text-sky-200">
          Boat Garage{heritage ? '' : ` · Level ${level}`}
        </p>
        <p className="m-0 font-sora text-[14px] font-black leading-tight">
          {firstName}’s {boatName(draft)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => openSection('progress')}
        aria-label={`${credits.balance} credits: see your progress`}
        className={`${glassButton(section === 'progress' ? 'active' : 'default')} pointer-events-auto h-11 gap-1.5 rounded-full px-3.5`}
      >
        <Coins size={15} className="text-amber-200" aria-hidden="true" />
        <span className="font-sora text-[14px] font-black">{credits.balance}</span>
      </button>
    </div>
  )
}
