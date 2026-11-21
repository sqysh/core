'use client'

import { Coins, Sparkles } from 'lucide-react'
import { glassPane } from '@/components/_shared/LiquidGlass'
import {
  COLLECTIONS,
  CollectionId,
  CREDITS_PER,
  isLive,
  ITEM_IDS,
  itemDef,
  priceLabel,
  STAT_KEYS,
  statLabel
} from '@/lib/vessel/items'
import { useGarageContext } from '../_hooks/GarageContext'
import { label } from '../_lib/styles'

/** Progress: credits and where they came from, collections, and what's coming */
export function ProgressTab() {
  const { stats, credits, owns } = useGarageContext()
  return (
    <div className="grid gap-3">
      <div className={`${glassPane} grid gap-2 px-3.5 py-3`}>
        <p className="m-0 flex items-center gap-2 font-sora text-[18px] font-black">
          <Coins size={18} className="text-amber-200" aria-hidden="true" /> {credits.balance}{' '}
          {credits.balance === 1 ? 'credit' : 'credits'}
        </p>
        <ul className="m-0 grid list-none gap-1 p-0 font-nunito text-[12px] text-white/75">
          {STAT_KEYS.map((k) => (
            <li key={k} className="flex justify-between gap-3">
              <span>
                {statLabel(k, stats[k])} <span className="text-white/45">× {CREDITS_PER[k]}</span>
              </span>
              <span className="font-mono text-white/85">+{stats[k] * CREDITS_PER[k]}</span>
            </li>
          ))}
          <li className="flex justify-between gap-3 border-t border-white/10 pt-1">
            <span>Spent on upgrades and accessories</span>
            <span className="font-mono text-white/85">−{credits.spent}</span>
          </li>
        </ul>
        <p className="m-0 font-nunito text-[11px] leading-snug text-white/55">
          Counted from confirmed records: meetings you checked in to, completed 1-2-1s, referrals the receiver
          acknowledged, and closed business. Upgrade your vessel or customize her: it’s your call, and there’s no single
          right boat.
        </p>
      </div>
      <p className={`${label} mt-1`}>Collections</p>
      <ul className="m-0 grid list-none grid-cols-2 gap-1.5 p-0">
        {(Object.keys(COLLECTIONS) as CollectionId[])
          .filter((c) => c !== 'heritage')
          .map((c) => {
            const ids = ITEM_IDS.filter(
              (id) => itemDef(id).collection === c && (itemDef(id).custom || id.startsWith('stage:'))
            )
            if (!ids.length) return null
            const have = ids.filter(owns).length
            const live = ids.some(isLive)
            return (
              <li key={c} className={`${glassPane} px-3 py-2.5 ${live ? '' : 'opacity-75'}`}>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-sora text-[12px] font-bold">{COLLECTIONS[c].name}</span>
                  <span className="font-mono text-[10px] text-white/60">
                    {have}/{ids.length}
                  </span>
                </span>
                <span className="block font-nunito text-[11px] leading-snug text-white/55">
                  {live ? COLLECTIONS[c].blurb : 'Coming soon'}
                </span>
              </li>
            )
          })}
      </ul>
      <p className={`${label} mt-1`}>Coming soon · treasure, achievements, events and Shipwright upgrades</p>
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {ITEM_IDS.filter((id) => !isLive(id)).map((id) => (
          <li key={id} className={`${glassPane} flex items-center gap-3 px-3 py-2.5 opacity-85`}>
            <Sparkles size={16} className="shrink-0 text-amber-200/80" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block font-sora text-[13px] font-bold">{itemDef(id).name}</span>
              <span className="block font-nunito text-[12px] text-white/60">{priceLabel(itemDef(id).price)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="m-0 font-nunito text-[11px] leading-snug text-white/50">
        Shipwright upgrades are optional cosmetics that support the chapter. They’re not on sale yet, and nothing needs
        one.
      </p>
    </div>
  )
}
