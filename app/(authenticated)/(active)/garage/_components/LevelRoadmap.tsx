'use client'

import { Check } from 'lucide-react'
import { glassPane } from '@/components/_shared/LiquidGlass'
import { STAGES } from '@/lib/vessel/catalog'
import { itemDef, setStage, stageItem, stagesAtLevel } from '@/lib/vessel/items'
import { useGarageContext } from '../_hooks/GarageContext'
import { LEVELS, unlocksAt } from '../_lib/garage'

/** The road ahead: every level, what it unlocks, and a way to sail any level already owned */
export function LevelRoadmap() {
  const { draft, stage, level, topLevel, owns, apply } = useGarageContext()
  return (
    <ol className="m-0 grid list-none gap-1.5 p-0">
      {LEVELS.map((lv) => {
        const at = stagesAtLevel(lv)
        const reached = lv <= topLevel
        return (
          <li
            key={lv}
            className={`${glassPane} flex items-start gap-3 px-3 py-2.5 ${lv === level ? 'ring-1 ring-sky-200/50' : ''}`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[11px] ${
                reached ? 'bg-sky-400/30 text-sky-100' : 'bg-white/10 text-white/60'
              }`}
            >
              {reached ? <Check size={15} aria-hidden="true" /> : lv}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {at.map((s) => (
                  <span key={s} className="font-sora text-[13px] font-bold">
                    {STAGES[s].name}
                    {owns(stageItem(s)) && s !== stage && (
                      <button
                        type="button"
                        onClick={() => apply(setStage(draft, s))}
                        className="ml-1.5 rounded-full bg-white/12 px-2 py-0.5 font-sora text-[10px] font-bold text-sky-100"
                      >
                        Sail
                      </button>
                    )}
                  </span>
                ))}
              </span>
              <span className="block font-nunito text-[11px] leading-snug text-white/55">
                {unlocksAt(lv).length
                  ? `Unlocks ${unlocksAt(lv)
                      .map((id) => itemDef(id).name)
                      .join(', ')}`
                  : 'The boat itself'}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
