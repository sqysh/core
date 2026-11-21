'use client'

import { ChevronDown, ChevronUp, Smartphone } from 'lucide-react'
import { glassPanel } from '@/components/_shared/LiquidGlass'
import { useGarageContext } from '../_hooks/GarageContext'
import { CustomizeTab } from './CustomizeTab'
import { GarageFooter } from './GarageFooter'
import { GarageNavigation } from './GarageNavigation'
import { PaintTab } from './PaintTab'
import { ProgressTab } from './ProgressTab'
import { VesselTab } from './VesselTab'

/** The menu: a panel on the right held sideways, a sheet from the bottom upright */
export function GaragePanel() {
  const { section, landscape, sheetOpen, setSheetOpen, previewing } = useGarageContext()

  const body =
    section === 'vessel' ? (
      <VesselTab />
    ) : section === 'customize' ? (
      <CustomizeTab />
    ) : section === 'paint' ? (
      <PaintTab />
    ) : (
      <ProgressTab />
    )

  return landscape ? (
    // positioned by this wrapper; the glass panel (which is position: relative) fills it
    <aside
      className="absolute bottom-[max(10px,env(safe-area-inset-bottom))] right-[max(10px,env(safe-area-inset-right))] top-[max(10px,env(safe-area-inset-top))] w-[min(44vw,400px)]"
      aria-label="Upgrade and customize your boat"
    >
      <div className={`${glassPanel} flex h-full flex-col gap-2.5 rounded-[28px] p-2.5`}>
        <GarageNavigation />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">{body}</div>
        <GarageFooter />
      </div>
    </aside>
  ) : (
    <>
      {!previewing && (
        // positioned by this wrapper: the glass panel is position: relative
        <div className="pointer-events-none absolute inset-x-0 top-[calc(max(12px,env(safe-area-inset-top))+56px)] flex justify-center">
          <p
            className={`${glassPanel} m-0 flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 font-nunito text-[11px] text-white/85`}
          >
            <Smartphone size={13} className="rotate-90" aria-hidden="true" /> Turn sideways for the full Garage
          </p>
        </div>
      )}
      <aside
        className={`absolute bottom-[max(8px,env(safe-area-inset-bottom))] left-[max(8px,env(safe-area-inset-left))] right-[max(8px,env(safe-area-inset-right))] ${
          sheetOpen ? 'h-[64dvh]' : ''
        }`}
        aria-label="Upgrade and customize your boat"
      >
        <div className={`${glassPanel} flex h-full flex-col gap-2.5 rounded-[28px] p-2.5`}>
          <button
            type="button"
            onClick={() => setSheetOpen((o) => !o)}
            aria-expanded={sheetOpen}
            aria-label={sheetOpen ? 'Lower the menu' : 'Raise the menu'}
            className="mx-auto flex h-7 w-full items-center justify-center text-white/70"
          >
            {sheetOpen ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronUp size={18} aria-hidden="true" />}
          </button>
          <GarageNavigation />
          {sheetOpen && <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">{body}</div>}
          <GarageFooter />
        </div>
      </aside>
    </>
  )
}
