'use client'

import { Check, Coins, Lock } from 'lucide-react'
import { GlassButton } from '@/components/_shared/LiquidGlass'
import { itemDef, ItemId, RARITY_NAMES, removeAccessory, roomLabel, fitAccessory } from '@/lib/vessel/items'
import { useGarageContext } from '../_hooks/GarageContext'
import { itemState, whatItDoes } from '../_lib/accessories'
import { RARITY_TONE, row } from '../_lib/styles'

/** An accessory's row: what it is and does, and the one thing the member can do with it */
export function AccessoryRow({ id }: { id: ItemId }) {
  const { draft, chosen, stage, topLevel, credits, owns, heritage, busy, confirming, apply, buyAccessory } =
    useGarageContext()
  const def = itemDef(id)
  const state = itemState(id, { draft, chosen, stage, topLevel, balance: credits.balance, owns })
  const does = id.startsWith('pattern:') ? null : whatItDoes(id, draft, heritage)
  const detail =
    state.kind === 'locked' || state.kind === 'planned'
      ? state.why
      : state.kind === 'owned' && state.problem
        ? state.problem
        : state.kind === 'short'
          ? `${state.cost - credits.balance} more ${state.cost - credits.balance === 1 ? 'credit' : 'credits'} to go`
          : `${def.blurb} · ${roomLabel(id)}`
  const dim = state.kind === 'locked' || state.kind === 'planned'
  return (
    <li className={`${row(state.kind === 'fitted')} min-h-15 px-3.5 py-2.5`}>
      <span className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className={`text-[14px] ${dim ? 'text-white/60' : ''}`}>{def.name}</span>
          <span className={`font-mono text-[8px] uppercase tracking-widest ${RARITY_TONE[def.rarity]}`}>
            {RARITY_NAMES[def.rarity]}
          </span>
        </span>
        <span
          className={`block font-nunito text-[12px] font-normal leading-snug ${
            (state.kind === 'owned' && state.problem) || state.kind === 'locked' ? 'text-amber-100/75' : 'text-white/60'
          }`}
        >
          {detail}
        </span>
        {does && (
          <span
            className={`block font-mono text-[10px] leading-snug ${
              does.kind === 'effect'
                ? 'text-emerald-200/90'
                : does.kind === 'ability'
                  ? 'text-sky-200/90'
                  : 'text-white/40'
            }`}
          >
            {does.text}
          </span>
        )}
      </span>
      {state.kind === 'fitted' &&
        (id.startsWith('pattern:') ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-sky-300/25 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-sky-100">
            <Check size={11} aria-hidden="true" /> On
          </span>
        ) : (
          <GlassButton
            onClick={() => apply(removeAccessory(draft, id))}
            className="h-9 shrink-0 gap-1 rounded-full px-3 text-[12px]"
            aria-label={`Take off the ${def.name}`}
          >
            <Check size={13} aria-hidden="true" /> Fitted
          </GlassButton>
        ))}
      {state.kind === 'owned' &&
        (state.problem ? (
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-white/50">Owned</span>
        ) : (
          <GlassButton
            onClick={() => apply(fitAccessory(draft, id))}
            className="h-9 shrink-0 rounded-full px-3.5 text-[12px]"
          >
            Fit
          </GlassButton>
        ))}
      {state.kind === 'buy' && (
        <GlassButton
          tone={confirming === id ? 'primary' : 'default'}
          onClick={() => buyAccessory(id)}
          disabled={!!busy}
          className="h-9 shrink-0 gap-1 rounded-full px-3 text-[12px]"
          aria-label={
            confirming === id
              ? `Confirm: spend ${state.cost} credits on the ${def.name}`
              : `Buy the ${def.name} for ${state.cost} credits`
          }
        >
          {busy === id ? (
            'Buying…'
          ) : confirming === id ? (
            `Spend ${state.cost}?`
          ) : (
            <>
              <Coins size={13} aria-hidden="true" /> {state.cost}
            </>
          )}
        </GlassButton>
      )}
      {state.kind === 'short' && (
        <span className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-white/55">
          <Coins size={12} aria-hidden="true" /> {state.cost}
        </span>
      )}
      {state.kind === 'locked' && <Lock size={14} className="shrink-0 text-white/55" aria-hidden="true" />}
      {state.kind === 'planned' && (
        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-amber-100/80">
          Soon
        </span>
      )}
    </li>
  )
}
