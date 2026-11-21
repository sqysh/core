'use client'

import { Hammer, Sparkles } from 'lucide-react'
import { GlassButton, glassPane } from '@/components/_shared/LiquidGlass'
import { STAGES } from '@/lib/vessel/catalog'
import { boatName, nextStages, setStage } from '@/lib/vessel/items'
import { useGarageContext } from '../_hooks/GarageContext'
import { label } from '../_lib/styles'
import { LevelRoadmap } from './LevelRoadmap'
import { RoomMeters } from './RoomMeters'
import { VesselStatsPanel } from './VesselStatsPanel'
import { VesselUpgradeCard } from './VesselUpgradeCard'

/** Vessel: where she is, what's next, and the road ahead */
export function VesselTab() {
  const { draft, heritage, stage, level, chosen, boatStats, apply } = useGarageContext()

  if (heritage)
    return (
      <div className="grid gap-3">
        <div className={`${glassPane} grid gap-2.5 px-3.5 py-3`}>
          <p className="m-0 font-nunito text-[13px] leading-snug text-white/80">
            Your {boatName(draft)} is from the first harbor, and it’s yours to keep. Every Navigator now builds their
            own boat from a starter skiff, level by level.
          </p>
          <GlassButton tone="primary" onClick={() => apply(setStage(draft, 'skiff'))} className="h-11 text-[14px]">
            <Hammer size={15} aria-hidden="true" /> Start building
          </GlassButton>
        </div>
      </div>
    )

  return (
    <div className="grid gap-3">
      <div className={`${glassPane} grid gap-2.5 px-3.5 py-3`}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="m-0 font-sora text-[17px] font-black">{STAGES[stage].name}</p>
          <span className="rounded-full bg-sky-300/20 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-sky-100">
            Level {level}
          </span>
        </div>
        <VesselStatsPanel stats={boatStats} />
        <RoomMeters stage={stage} chosen={chosen} />
      </div>
      {nextStages(stage).length > 0 ? (
        <section className="grid gap-2">
          <p className={label}>{nextStages(stage).length > 1 ? 'Next upgrade · choose your path' : 'Next upgrade'}</p>
          {nextStages(stage).map((to) => (
            <VesselUpgradeCard key={to} to={to} />
          ))}
        </section>
      ) : (
        <div className={`${glassPane} flex items-center gap-3 px-3.5 py-3`}>
          <Sparkles size={16} className="shrink-0 text-amber-200" aria-hidden="true" />
          <p className="m-0 font-nunito text-[12px] leading-snug text-white/80">
            She’s as big as her path goes. Spend your credits making her yours in Customize.
          </p>
        </div>
      )}
      <p className={`${label} mt-1`}>The road ahead</p>
      <LevelRoadmap />
    </div>
  )
}
