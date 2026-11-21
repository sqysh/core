import { accessoriesOf, STAGES, StageId, VesselConfig } from '@/lib/vessel/catalog'
import { ABILITIES, allocate, fitProblem, isLive, itemDef, ItemId, priceLabel, stagesAtLevel } from '@/lib/vessel/items'
import { statChanges, vesselStats } from '@/lib/vessel/stats'

/** Where an accessory stands for this member and this boat */
export type ItemState =
  | { kind: 'fitted' }
  | { kind: 'owned'; problem: string | null }
  | { kind: 'buy'; cost: number }
  | { kind: 'short'; cost: number }
  | { kind: 'locked'; why: string }
  | { kind: 'planned'; why: string }

export function itemState(
  id: ItemId,
  g: {
    draft: VesselConfig
    chosen: string[]
    stage: StageId
    topLevel: number
    balance: number
    owns: (id: string) => boolean
  }
): ItemState {
  const { draft, chosen, stage, topLevel, balance, owns } = g
  const def = itemDef(id)
  const fitted = id.startsWith('pattern:') ? draft.sailPattern === id.slice(8) : chosen.includes(id)
  if (fitted) return { kind: 'fitted' }
  if (owns(id)) {
    const problem =
      fitProblem(id, draft) ?? allocate(stage, [...chosen, id]).problems.find((p) => p.id === id)?.problem ?? null
    return { kind: 'owned', problem }
  }
  if (!isLive(id)) return { kind: 'planned', why: priceLabel(def.price) }
  const unlockLevel = def.custom?.level ?? 1
  if (unlockLevel > topLevel)
    return {
      kind: 'locked',
      why: `Unlocks at Level ${unlockLevel} · ${stagesAtLevel(unlockLevel)
        .map((s) => STAGES[s].name)
        .join(' or ')}`
    }
  if (def.price.kind !== 'credits') return { kind: 'locked', why: priceLabel(def.price) }
  if (balance < def.price.credits) return { kind: 'short', cost: def.price.credits }
  return { kind: 'buy', cost: def.price.credits }
}

/**
 * What an item does for her, worked out by comparing her stats with and without it (so the numbers are the ones she
 * would really sail with), or the ability it brings; anything else is cosmetic
 */
export function whatItDoes(
  id: ItemId,
  draft: VesselConfig,
  heritage: boolean
): { kind: 'effect' | 'ability' | 'cosmetic'; text: string } {
  const def = itemDef(id)
  if (def.effect && !heritage) {
    const others = accessoriesOf(draft).filter((x) => x !== id)
    const without = vesselStats({ ...draft, details: { ...draft.details, parts: others } })
    const withIt = vesselStats({ ...draft, details: { ...draft.details, parts: [...others, id] } })
    const changes = statChanges(without, withIt)
    return {
      kind: 'effect',
      text: changes.length
        ? changes
            .map((c) => {
              const d = (c.to - c.from) * (c.row.scale ?? 1)
              return `${c.row.label} ${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(c.row.digits)}${c.row.unit === '/100' ? '' : ` ${c.row.unit}`}${c.better ? '' : ' (trade-off)'}`
            })
            .join(' · ')
        : 'No change on this boat'
    }
  }
  if (def.ability) return { kind: 'ability', text: `${ABILITIES[def.ability].name} · comes with Free Sail` }
  return { kind: 'cosmetic', text: 'Cosmetic' }
}
