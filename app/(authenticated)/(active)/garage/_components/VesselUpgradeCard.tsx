'use client'

import { ArrowUpCircle, Coins, Eye, EyeOff } from 'lucide-react'
import { GlassButton, glassPane } from '@/components/_shared/LiquidGlass'
import { STAGES, StageId } from '@/lib/vessel/catalog'
import { ABILITIES, isLive, itemDef, ItemId, setStage, stageItem, stagePrice } from '@/lib/vessel/items'
import { statChanges, statText, vesselStats } from '@/lib/vessel/stats'
import { useGarageContext } from '../_hooks/GarageContext'
import { unlocksAt } from '../_lib/garage'

/** A level she can be upgraded to: what changes, what it adds and costs, a preview on her, and the way to buy it */
export function VesselUpgradeCard({ to }: { to: StageId }) {
  const {
    draft,
    stage,
    owned,
    owns,
    credits,
    confirming,
    busy,
    heritage,
    boatStats,
    previewing,
    setPreviewing,
    apply,
    upgrade
  } = useGarageContext()
  const s = STAGES[to]
  const have = owns(stageItem(to))
  const price = stagePrice(to, owned)
  const base = (itemDef(stageItem(to)).price as { credits: number }).credits
  const adds = s.parts
    .filter((p) => !(STAGES[stage].parts as readonly string[]).includes(p))
    .map((p) => itemDef(p as ItemId).name)
  const unlocks = unlocksAt(s.level)
    .filter(isLive)
    .map((id) => itemDef(id).name)
  const short = price - credits.balance
  const confirmingThis = confirming === stageItem(to)
  // what she'd be like: every stat that changes, better or a trade-off, and what she'd newly be able to do
  const next = vesselStats(setStage(draft, to).config)
  const changes = statChanges(boatStats, next)
  const gains = next.abilities.filter((a) => !boatStats.abilities.includes(a))
  return (
    <div className={`${glassPane} grid gap-2.5 px-3.5 py-3`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="m-0 font-sora text-[16px] font-black">{s.name}</p>
        <span className="font-mono text-[10px] uppercase tracking-widest text-sky-200">Level {s.level}</span>
      </div>
      <p className="m-0 font-nunito text-[12px] leading-snug text-white/75">{s.blurb}</p>
      <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-1 p-0" aria-label="What changes">
        {changes.map((c) => (
          <li key={c.row.key} className="flex items-baseline justify-between gap-2 font-nunito text-[11px]">
            <span className="text-white/60">{c.row.label}</span>
            <span className={`font-mono text-[10px] ${c.better ? 'text-emerald-200' : 'text-amber-200'}`}>
              {statText(c.row, c.from)} → {statText(c.row, c.to)} {c.better ? '▲' : '▼'}
            </span>
          </li>
        ))}
        {next.deckSpace.total !== boatStats.deckSpace.total && (
          <li className="flex items-baseline justify-between gap-2 font-nunito text-[11px]">
            <span className="text-white/60">Deck spots</span>
            <span className="font-mono text-[10px] text-emerald-200">
              {boatStats.deckSpace.total} → {next.deckSpace.total} ▲
            </span>
          </li>
        )}
      </ul>
      {gains.length > 0 && (
        <p className="m-0 font-nunito text-[11px] leading-snug text-sky-200/90">
          <b>New abilities:</b> {gains.map((a) => ABILITIES[a].name).join(', ')} (with Free Sail)
        </p>
      )}
      {adds.length > 0 && (
        <p className="m-0 font-nunito text-[11px] leading-snug text-white/55">
          <b className="text-white/75">Adds:</b> {adds.join(', ')}
        </p>
      )}
      {unlocks.length > 0 && (
        <p className="m-0 font-nunito text-[11px] leading-snug text-white/55">
          <b className="text-white/75">Unlocks to buy:</b> {unlocks.join(', ')}
        </p>
      )}
      {price < base && !have && (
        <p className="m-0 font-nunito text-[11px] text-emerald-200/85">
          {base - price} credits off: parts you already bought count toward it
        </p>
      )}
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <GlassButton
          tone={previewing === to ? 'active' : 'default'}
          onClick={() => setPreviewing((p) => (p === to ? null : to))}
          className="h-11 gap-1.5 rounded-2xl px-3 text-[12px]"
          aria-pressed={previewing === to}
        >
          {previewing === to ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
          Preview
        </GlassButton>
        {have ? (
          <GlassButton tone="primary" onClick={() => apply(setStage(draft, to))} className="h-11 text-[13px]">
            Sail your {s.name}
          </GlassButton>
        ) : (
          <GlassButton
            tone="primary"
            onClick={() => upgrade(to)}
            disabled={!!busy || short > 0 || heritage}
            className="h-11 gap-1.5 text-[13px]"
            aria-label={
              confirmingThis
                ? `Confirm: spend ${price} credits to upgrade to the ${s.name}`
                : `Upgrade to the ${s.name} for ${price} credits`
            }
          >
            {busy === stageItem(to) ? (
              'Upgrading…'
            ) : short > 0 ? (
              <>
                <Coins size={14} aria-hidden="true" /> {price} · {short} more to go
              </>
            ) : confirmingThis ? (
              `Spend ${price} to upgrade?`
            ) : (
              <>
                <ArrowUpCircle size={15} aria-hidden="true" /> Upgrade vessel · {price}
              </>
            )}
          </GlassButton>
        )}
      </div>
    </div>
  )
}
