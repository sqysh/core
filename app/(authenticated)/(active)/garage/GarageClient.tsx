'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Coins,
  Eye,
  EyeOff,
  Hammer,
  LocateFixed,
  Lock,
  Paintbrush,
  PartyPopper,
  RotateCcw,
  Ship,
  Smartphone,
  Sparkles,
  Trophy
} from 'lucide-react'
import { GlassButton, glassButton, glassPane, glassPanel } from '@/components/_shared/LiquidGlass'
import { LinkBody } from '@/components/_shared/LinkBody'
import { buyVesselItem } from '@/lib/actions/vessel/buyVesselItem'
import { saveMyVessel } from '@/lib/actions/vessel/saveMyVessel'
import type { Credits } from '@/lib/vessel/entitlements'
import {
  ACCESSORIES,
  accessoriesOf,
  FINISH_NAMES,
  FINISHES,
  isHeritage,
  SAIL_PATTERNS,
  STAGE_IDS,
  StageId,
  stageOf,
  STAGES,
  VesselConfig,
  VesselDetails
} from '@/lib/vessel/catalog'
import {
  ABILITIES,
  ACCESSORY_IDS,
  allocate,
  boatName,
  COLLECTIONS,
  CollectionId,
  CREDITS_PER,
  fitAccessory,
  fitProblem,
  isLive,
  ITEM_IDS,
  itemDef,
  ItemId,
  maxLevel,
  nextStages,
  priceLabel,
  Rarity,
  RARITY_NAMES,
  removeAccessory,
  roomLabel,
  roomUsed,
  setStage,
  stageItem,
  stagePrice,
  stagesAtLevel,
  STAT_KEYS,
  statLabel,
  Stats,
  ZONE_NAMES
} from '@/lib/vessel/items'
import { rangeName, STAT_ROWS, statChanges, statText, VesselStats, vesselStats } from '@/lib/vessel/stats'
import type { PreviewFrame } from '@/app/dev/checkin-voyage/BoatPreview'
import { lookOf } from '@/app/dev/checkin-voyage/_lib/vessel/look'
import { BoatSketch } from './_components/BoatSketch'
import { ACCENT, BOTTOM, CABIN, DECK, EQUIPMENT, HULL, ROOF, SAIL, SEATS, Swatch, TRIM } from './_lib/swatches'

// The Navigator's Boat Garage: your own boat afloat on the harbor's water, and a Liquid Glass menu to grow and dress
// it. Everyone starts with the same small skiff. Shipyard credits, earned from what a member does for CORE, go wherever
// they choose: Upgrade Vessel rebuilds the boat at the next level (a longer hull, more deck, more structure, more
// levels; from the Center Console the paths divide into motor and sail), or Customize buys accessories the boat's level
// has unlocked, from a tackle box to a hot tub or a water slide, each fitted where the deck has room. Every purchase is
// checked on the server (buyVesselItem, saveMyVessel); the preview is the very model the TV's harbor sails.

// the 3D preview's code (three, the boat models, the sea shader) only loads here, never in the page's first load
const BoatPreview = dynamic(() => import('@/app/dev/checkin-voyage/BoatPreview'), { ssr: false, loading: () => null })

export type Section = 'vessel' | 'customize' | 'paint' | 'progress'
const TABS: { key: Section; label: string; icon: typeof Ship }[] = [
  { key: 'vessel', label: 'Vessel', icon: Ship },
  { key: 'customize', label: 'Customize', icon: PartyPopper },
  { key: 'paint', label: 'Paint', icon: Paintbrush },
  { key: 'progress', label: 'Progress', icon: Trophy }
]

type ColorField = 'hullColor' | 'trimColor' | 'accentColor'
type DetailField = Exclude<keyof VesselDetails, 'finish' | 'parts' | 'stage'>
type PaintPart = { key: string; label: string; swatches: Swatch[]; field?: ColorField; detail?: DetailField }
const PAINT_PARTS: PaintPart[] = [
  { key: 'hull', label: 'Hull', field: 'hullColor', swatches: HULL },
  { key: 'trim', label: 'Trim', field: 'trimColor', swatches: TRIM },
  { key: 'accent', label: 'Accent', field: 'accentColor', swatches: ACCENT },
  { key: 'cabin', label: 'Cabin', detail: 'cabinColor', swatches: CABIN },
  { key: 'roof', label: 'Roof', detail: 'roofColor', swatches: ROOF },
  { key: 'seats', label: 'Seats', detail: 'seatsColor', swatches: SEATS },
  { key: 'deck', label: 'Deck', detail: 'deckColor', swatches: DECK },
  { key: 'equipment', label: 'Fittings', detail: 'equipmentColor', swatches: EQUIPMENT },
  { key: 'bottom', label: 'Bottom', detail: 'bottomColor', swatches: BOTTOM }
]

const RARITY_TONE: Record<Rarity, string> = {
  common: 'text-white/60',
  uncommon: 'text-emerald-200',
  rare: 'text-sky-200',
  epic: 'text-violet-200',
  legendary: 'text-amber-200'
}

/** The levels, in the order a member meets them */
const LEVELS = [...new Set(STAGE_IDS.map((s) => STAGES[s].level))].sort((a, b) => a - b)
/** Accessories that unlock at a level */
const unlocksAt = (level: number) => ACCESSORY_IDS.filter((id) => itemDef(id).custom!.level === level)

const same = (a: VesselConfig, b: VesselConfig) => JSON.stringify(a) === JSON.stringify(b)

/** A list row on the glass: the glass button's look, laid out as label on the left and status on the right */
const row = (on: boolean) =>
  `flex w-full items-center justify-between gap-3 rounded-2xl border text-left font-sora font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-md [text-shadow:0_1px_3px_rgba(4,16,32,0.5)] ${
    on ? 'border-sky-200/50 bg-sky-400/20' : 'border-white/22 bg-white/8'
  }`
const label = 'm-0 font-mono text-[10px] uppercase tracking-[0.22em] text-white/60'

/**
 * What the page behind the Garage looks like at its left and right edges, sampled from the rendered scene (sand and
 * shallows down the left, turquoise water down the right), top to bottom. On an iPhone held sideways the browser can
 * inset the page by its safe areas (44px a side), and those side strips are not part of the page: nothing positioned,
 * a canvas included, can draw there. Only the root background reaches them, so it is made to continue the water.
 */
const EDGE_COLOURS = {
  left: ['#e7cb98', '#e6cc9f', '#d2c0a9', '#dcc091', '#eef7d6', '#9edeb0', '#85cea7', '#85cea9', '#7dc1a2', '#7bb598'],
  right: ['#63ac97', '#5eaf9b', '#66c0aa', '#97bfa9', '#b4aa9e', '#7e8d85', '#77cdb8', '#6ec7b1', '#69bcaa', '#65b6a9']
}
const edgeGradient = (cs: string[], side: 'left' | 'right') =>
  `linear-gradient(to bottom, ${cs.map((c, i) => `${c} ${5 + i * 10}%`).join(', ')}) ${side} / 50% 100% no-repeat`

/** While the Garage is open, the page's root background carries the scene's edges into any side strips; restored on leaving */
function useEdgeBackground() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const before = { html: html.style.cssText, body: body.style.cssText }
    html.style.background = `${edgeGradient(EDGE_COLOURS.left, 'left')}, ${edgeGradient(EDGE_COLOURS.right, 'right')}, #6fbfae`
    html.style.height = '100dvh'
    body.style.background = 'transparent'
    return () => {
      html.style.cssText = before.html
      body.style.cssText = before.body
    }
  }, [])
}

function useLandscape() {
  const [landscape, setLandscape] = useState(true)
  useEffect(() => {
    const q = window.matchMedia('(orientation: landscape)')
    const update = () => setLandscape(q.matches)
    update()
    q.addEventListener('change', update)
    return () => q.removeEventListener('change', update)
  }, [])
  return landscape
}

/** Where an accessory stands for this member and this boat */
type ItemState =
  | { kind: 'fitted' }
  | { kind: 'owned'; problem: string | null }
  | { kind: 'buy'; cost: number }
  | { kind: 'short'; cost: number }
  | { kind: 'locked'; why: string }
  | { kind: 'planned'; why: string }

export default function GarageClient({
  initial,
  unlocked,
  stats,
  credits: initialCredits,
  storageReady,
  firstName,
  initialSection = 'vessel'
}: {
  initial: VesselConfig
  unlocked: ItemId[]
  /** What the member has done for CORE, which credits are counted from (on the server) */
  stats: Stats
  /** Shipyard credits: earned from those, less what's been spent (on the server) */
  credits: Credits
  /** False when saving isn't available (the vessel tables aren't there) */
  storageReady: boolean
  firstName: string
  /** Which part of the menu opens first */
  initialSection?: Section
}) {
  const [saved, setSaved] = useState(initial)
  const [draft, setDraft] = useState(initial)
  const [owned, setOwned] = useState(unlocked)
  const [credits, setCredits] = useState(initialCredits)
  const [section, setSection] = useState<Section>(initialSection)
  const [paintKey, setPaintKey] = useState('hull')
  const [previewing, setPreviewing] = useState<StageId | null>(null)
  const [home, setHome] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(initialSection !== 'vessel')
  const [busy, setBusy] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  // the 3D preview makes (and checks) its own WebGL context; only if it reports it can't does the 2D drawing show
  const [previewFailed, setPreviewFailed] = useState(false)
  const landscape = useLandscape()
  useEdgeBackground()

  const dirty = !same(draft, saved)
  const heritage = isHeritage(draft.vesselClass)
  const stage = stageOf(draft)
  const level = heritage ? 0 : STAGES[stage].level
  const topLevel = maxLevel(owned)
  const chosen = useMemo(() => (heritage ? [] : accessoriesOf(draft)), [draft, heritage])
  const owns = (id: string) => owned.includes(id as ItemId)
  // what's on screen: the boat, or the next level being previewed on it
  const shown = useMemo(() => (previewing ? setStage(draft, previewing).config : draft), [draft, previewing])
  const look = useMemo(() => lookOf(draft), [draft])
  // how she performs, from the same numbers the harbor's controller sails her by
  const boatStats = useMemo(() => vesselStats(draft), [draft])
  const paintPart = PAINT_PARTS.find((p) => p.key === paintKey) ?? PAINT_PARTS[0]
  const sails = heritage
    ? draft.vesselClass === 'sloop' || draft.vesselClass === 'lobster'
    : STAGES[stage].parts.includes('top:sails')

  // where the boat sits: left of the menu held sideways; above the sheet upright
  const frame: PreviewFrame = useMemo(
    () =>
      landscape
        ? { x: 0.29, y: 0.575, width: 0.52, height: 0.8 }
        : sheetOpen
          ? { x: 0.5, y: 0.2, width: 0.94, height: 0.3 }
          : { x: 0.5, y: 0.36, width: 0.94, height: 0.52 },
    [landscape, sheetOpen]
  )

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 4500)
    return () => window.clearTimeout(t)
  }, [notice])
  useEffect(() => {
    if (!confirming) return
    const t = window.setTimeout(() => setConfirming(null), 4000)
    return () => window.clearTimeout(t)
  }, [confirming])
  // leaving with unsaved changes asks first
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  /** Applies a change to the boat, and says what came off with it */
  function apply({ config, removed }: { config: VesselConfig; removed: string[] }) {
    setDraft(config)
    if (removed.length) setNotice({ tone: 'ok', text: `Took off: ${removed.join(', ')} (still yours to refit)` })
  }

  async function save(config = draft) {
    if (same(config, saved) || busy === 'save') return true
    setBusy('save')
    const res = await saveMyVessel(config)
    setBusy(null)
    if (!res.success) {
      setNotice({ tone: 'error', text: res.error })
      return false
    }
    setSaved(res.data)
    setDraft(res.data)
    return true
  }

  /** Spends credits on a level or an accessory: tap once to see the price, again to confirm */
  async function spend(id: ItemId) {
    if (busy) return null
    if (confirming !== id) {
      setConfirming(id)
      return null
    }
    setConfirming(null)
    setBusy(id)
    const res = await buyVesselItem(id)
    setBusy(null)
    if (!res.success) {
      setNotice({ tone: 'error', text: res.error })
      return null
    }
    setOwned(res.data.owned)
    setCredits(res.data.credits)
    return res.data
  }

  /** Upgrade Vessel: buy the level, rebuild the boat at it, and save it so it sails in that way */
  async function upgrade(to: StageId) {
    const bought = await spend(stageItem(to))
    if (!bought) return
    setPreviewing(null)
    const next = setStage(draft, to).config
    setDraft(next)
    const kept = storageReady ? await save(next) : false
    setNotice({
      tone: 'ok',
      text: `Your ${STAGES[to].name} is ready.${kept ? ' Saved: she sails in like this at check-in.' : ''}`
    })
  }

  async function buyAccessory(id: ItemId) {
    const bought = await spend(id)
    if (!bought) return
    const fits = !fitProblem(id, draft) && !allocate(stage, [...chosen, id]).problems.some((p) => p.id === id)
    if (fits) apply(fitAccessory(draft, id))
    setNotice({ tone: 'ok', text: `${itemDef(id).name} is yours.${fits ? ' Save to keep it on your boat.' : ''}` })
  }

  function stateOf(id: ItemId): ItemState {
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
    if (credits.balance < def.price.credits) return { kind: 'short', cost: def.price.credits }
    return { kind: 'buy', cost: def.price.credits }
  }

  function paint(p: PaintPart, hex: string) {
    if (p.field) setDraft((d) => ({ ...d, [p.field!]: hex }))
    else if (p.detail)
      setDraft((d) => {
        const details = { ...d.details }
        // '' is "as the boat comes" (bare teak, chrome): the setting is removed rather than saved empty
        if (hex) details[p.detail!] = hex
        else delete details[p.detail!]
        return { ...d, details }
      })
  }
  function currentHex(p: PaintPart) {
    if (p.field) return draft[p.field]
    const v = draft.details[p.detail!]
    if (v) return v
    return p.detail === 'cabinColor'
      ? look.cabin
      : p.detail === 'roofColor'
        ? look.roof
        : p.detail === 'bottomColor'
          ? look.bottom
          : p.detail === 'seatsColor'
            ? look.seats
            : ''
  }

  /**
   * What an item does for her, worked out by comparing her stats with and without it (so the numbers are the ones she
   * would really sail with), or the ability it brings; anything else is cosmetic
   */
  function whatItDoes(id: ItemId): { kind: 'effect' | 'ability' | 'cosmetic'; text: string } {
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

  // ── an accessory's row ──
  function ItemRow({ id }: { id: ItemId }) {
    const def = itemDef(id)
    const state = stateOf(id)
    const does = id.startsWith('pattern:') ? null : whatItDoes(id)
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
              (state.kind === 'owned' && state.problem) || state.kind === 'locked'
                ? 'text-amber-100/75'
                : 'text-white/60'
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

  // ── Vessel: where she is, what's next, and the road ahead ──
  function UpgradeCard({ to }: { to: StageId }) {
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

  const vesselTab = heritage ? (
    <div className="grid gap-3">
      <div className={`${glassPane} grid gap-2.5 px-3.5 py-3`}>
        <p className="m-0 font-nunito text-[13px] leading-snug text-white/80">
          Your {boatName(draft)} is from the first harbor, and it’s yours to keep. Every Navigator now builds their own
          boat from a starter skiff, level by level.
        </p>
        <GlassButton tone="primary" onClick={() => apply(setStage(draft, 'skiff'))} className="h-11 text-[14px]">
          <Hammer size={15} aria-hidden="true" /> Start building
        </GlassButton>
      </div>
    </div>
  ) : (
    <div className="grid gap-3">
      <div className={`${glassPane} grid gap-2.5 px-3.5 py-3`}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="m-0 font-sora text-[17px] font-black">{STAGES[stage].name}</p>
          <span className="rounded-full bg-sky-300/20 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-sky-100">
            Level {level}
          </span>
        </div>
        <StatsPanel stats={boatStats} />
        <RoomMeters stage={stage} chosen={chosen} />
      </div>
      {nextStages(stage).length > 0 ? (
        <section className="grid gap-2">
          <p className={label}>{nextStages(stage).length > 1 ? 'Next upgrade · choose your path' : 'Next upgrade'}</p>
          {nextStages(stage).map((to) => (
            <UpgradeCard key={to} to={to} />
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
    </div>
  )

  // ── Customize: accessories for her level and room ──
  const available = ACCESSORY_IDS.filter((id) => (itemDef(id).custom!.level <= topLevel || owns(id)) && isLive(id))
  const future = ACCESSORY_IDS.filter((id) => !available.includes(id))
  const kindOf = (id: ItemId) => (itemDef(id).effect ? 'effect' : itemDef(id).ability ? 'ability' : 'cosmetic')
  const GROUPED = [
    { kind: 'effect', title: 'Performance · changes how she handles' },
    { kind: 'ability', title: 'Equipment · new things she can do' },
    { kind: 'cosmetic', title: 'Cosmetic · looks only' }
  ] as const
  const customizeTab = heritage ? (
    <div className={`${glassPane} px-3.5 py-3 font-nunito text-[13px] text-white/75`}>
      Accessories go on the boat you build. Start building in the Vessel tab; your {boatName(draft)} stays yours.
    </div>
  ) : (
    <div className="grid gap-3">
      <div className={`${glassPane} grid gap-2 px-3.5 py-3`}>
        <p className="m-0 font-nunito text-[12px] leading-snug text-white/75">
          Spend credits here or save them for the next upgrade: your choice. Accessories stay yours; fit and remove them
          as you like, wherever the deck has room.
        </p>
        <RoomMeters stage={stage} chosen={chosen} />
      </div>
      {GROUPED.map(({ kind, title }) => {
        const list = available.filter((id) => kindOf(id) === kind)
        return list.length ? (
          <section key={kind} className="grid gap-2">
            <p className={label}>{title}</p>
            <ul className="m-0 grid list-none gap-2 p-0">
              {list.map((id) => (
                <ItemRow key={id} id={id} />
              ))}
            </ul>
          </section>
        ) : null
      })}
      <p className={`${label} mt-1`}>At higher levels and coming soon</p>
      <ul className="m-0 grid list-none gap-2 p-0">
        {future.map((id) => (
          <ItemRow key={id} id={id} />
        ))}
      </ul>
    </div>
  )

  const paintTab = (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-black/15 p-1" role="radiogroup" aria-label="Finish">
        {FINISHES.map((f) => {
          const on = (draft.details.finish ?? 'gloss') === f
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!owns(`finish:${f}`)}
              onClick={() => setDraft((d) => ({ ...d, details: { ...d.details, finish: f } }))}
              className={`h-10 rounded-xl font-sora text-[13px] font-bold transition-colors ${on ? 'bg-white/90 text-[#06101b]' : 'text-white/80 hover:bg-white/10'}`}
            >
              {FINISH_NAMES[f]}
            </button>
          )
        })}
      </div>
      <div
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]"
        role="tablist"
        aria-label="What to paint"
      >
        {PAINT_PARTS.map((p) => (
          <GlassButton
            key={p.key}
            role="tab"
            aria-selected={p.key === paintPart.key}
            tone={p.key === paintPart.key ? 'active' : 'default'}
            onClick={() => setPaintKey(p.key)}
            className="h-9 shrink-0 rounded-full px-3.5 text-[12px]"
          >
            {p.label}
          </GlassButton>
        ))}
      </div>
      <Swatches
        swatches={paintPart.swatches}
        value={currentHex(paintPart)}
        owns={owns}
        onPick={(hex) => paint(paintPart, hex)}
      />
      <GlassButton
        onClick={() =>
          setDraft((d) => ({
            ...d,
            hullColor: '#000000',
            trimColor: '#000000',
            accentColor: '#000000',
            sailColor: '#000000',
            details: {
              ...d.details,
              cabinColor: '#000000',
              roofColor: '#000000',
              seatsColor: '#000000',
              deckColor: '#000000',
              equipmentColor: '#000000',
              bottomColor: '#000000',
              finish: 'matte'
            }
          }))
        }
        className="h-10 text-[13px]"
      >
        <span className="h-4 w-4 rounded-full border border-white/40 bg-black" aria-hidden="true" /> All matte black
      </GlassButton>
      {sails && (
        <section className="grid gap-2">
          <p className={label}>Sails</p>
          <Swatches
            swatches={SAIL}
            value={draft.sailColor}
            owns={owns}
            onPick={(hex) => setDraft((d) => ({ ...d, sailColor: hex }))}
          />
          <ul className="m-0 grid list-none gap-2 p-0">
            {SAIL_PATTERNS.map((p) => (
              <ItemRow key={p} id={`pattern:${p}`} />
            ))}
          </ul>
        </section>
      )}
      {heritage && (
        <section className="grid gap-2">
          <p className={label}>Flags</p>
          <ul className="m-0 grid list-none gap-2 p-0">
            {ACCESSORIES.map((a) => {
              const on = draft.accessories.includes(a)
              const problem = fitProblem(`accessory:${a}`, draft)
              return (
                <li key={a} className={`${row(on)} min-h-14 px-3.5 py-2.5`}>
                  <span className="text-[14px]">{itemDef(`accessory:${a}`).name}</span>
                  {problem ? (
                    <span className="font-nunito text-[11px] text-white/55">{problem}</span>
                  ) : (
                    <GlassButton
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          accessories: on ? d.accessories.filter((x) => x !== a) : [...d.accessories, a]
                        }))
                      }
                      disabled={!on && !owns(`accessory:${a}`)}
                      className="h-9 rounded-full px-3.5 text-[12px]"
                    >
                      {on ? 'Fitted' : 'Fit'}
                    </GlassButton>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )

  const body =
    section === 'vessel' ? (
      vesselTab
    ) : section === 'customize' ? (
      customizeTab
    ) : section === 'paint' ? (
      paintTab
    ) : (
      <Progress stats={stats} credits={credits} owns={owns} />
    )

  const tabs = (
    <div className="grid grid-cols-4 gap-1" role="tablist" aria-label="Garage">
      {TABS.map(({ key, label: text, icon: Icon }) => {
        const on = section === key
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => {
              setSection(key)
              setSheetOpen(true)
            }}
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

  const footer = (
    <div className="grid gap-2">
      {notice && (
        <p
          role="status"
          className={`m-0 text-center font-nunito text-[12px] ${notice.tone === 'ok' ? 'text-emerald-200' : 'text-red-200'}`}
        >
          {notice.text}
        </p>
      )}
      {!storageReady && (
        <p role="status" className="m-0 text-center font-nunito text-[12px] text-amber-100/90">
          Saving isn’t switched on yet. You can try everything; it won’t be kept.
        </p>
      )}
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <GlassButton
          onClick={() => setDraft(saved)}
          disabled={!dirty || !!busy}
          className="h-12 w-12 rounded-2xl"
          aria-label="Undo all changes"
        >
          <RotateCcw size={17} aria-hidden="true" />
        </GlassButton>
        <GlassButton
          tone="primary"
          onClick={async () => {
            if (await save()) setNotice({ tone: 'ok', text: 'Saved. This is the boat that sails in at check-in.' })
          }}
          disabled={!dirty || !!busy || !storageReady}
          className="h-12 text-[14px]"
        >
          {busy === 'save' ? 'Saving…' : dirty ? 'Save boat' : 'Saved'}
        </GlassButton>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#1a8ea3] text-white">
      {/* ── the sea and the boat (or the next level, previewed on her), the whole screen ── */}
      {previewFailed ? (
        <div
          className="absolute"
          style={{
            left: `${(frame.x - frame.width / 2) * 100}%`,
            top: `${(frame.y - frame.height / 2) * 100}%`,
            width: `${frame.width * 100}%`,
            height: `${frame.height * 100}%`
          }}
        >
          <BoatSketch kind={shown.vesselClass} look={lookOf(shown)} />
        </div>
      ) : (
        <BoatPreview
          config={shown}
          frame={frame}
          home={home}
          name={firstName}
          onUnsupported={() => setPreviewFailed(true)}
        />
      )}

      {previewing && (
        <div
          className={`pointer-events-none absolute flex justify-center ${
            landscape
              ? 'bottom-[max(14px,env(safe-area-inset-bottom))] left-0 w-[56%]'
              : 'inset-x-0 top-[calc(max(12px,env(safe-area-inset-top))+56px)]'
          }`}
        >
          <div className={`${glassPanel} pointer-events-auto flex items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5`}>
            <span className="font-sora text-[12px] font-bold">
              Previewing: {STAGES[previewing].name} · Level {STAGES[previewing].level}
            </span>
            <GlassButton onClick={() => setPreviewing(null)} className="h-8 rounded-full px-3 text-[11px]">
              Back to my boat
            </GlassButton>
          </div>
        </div>
      )}

      {/* ── turn her back to the default three-quarter view ── */}
      {!previewFailed && (
        <button
          type="button"
          onClick={() => setHome((h) => h + 1)}
          aria-label="Reset the view"
          className={`${glassButton()} absolute h-11 w-11 rounded-full ${
            landscape
              ? 'bottom-[max(64px,calc(env(safe-area-inset-bottom)+12px))] left-[max(12px,env(safe-area-inset-left))]'
              : 'right-[max(12px,env(safe-area-inset-right))] top-[calc(max(12px,env(safe-area-inset-top))+56px)]'
          }`}
        >
          <LocateFixed size={18} aria-hidden="true" />
        </button>
      )}

      {/* ── back, whose boat and its level, and their credits ── */}
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
          onClick={() => {
            setSection('progress')
            setSheetOpen(true)
          }}
          aria-label={`${credits.balance} credits: see your progress`}
          className={`${glassButton(section === 'progress' ? 'active' : 'default')} pointer-events-auto h-11 gap-1.5 rounded-full px-3.5`}
        >
          <Coins size={15} className="text-amber-200" aria-hidden="true" />
          <span className="font-sora text-[14px] font-black">{credits.balance}</span>
        </button>
      </div>

      {/* ── the menu: a panel on the right held sideways, a sheet from the bottom upright ── */}
      {landscape ? (
        // positioned by this wrapper; the glass panel (which is position: relative) fills it
        <aside
          className="absolute bottom-[max(10px,env(safe-area-inset-bottom))] right-[max(10px,env(safe-area-inset-right))] top-[max(10px,env(safe-area-inset-top))] w-[min(44vw,400px)]"
          aria-label="Upgrade and customize your boat"
        >
          <div className={`${glassPanel} flex h-full flex-col gap-2.5 rounded-[28px] p-2.5`}>
            {tabs}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">{body}</div>
            {footer}
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
              {tabs}
              {sheetOpen && <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">{body}</div>}
              {footer}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

/** How full each deck zone is */
function RoomMeters({ stage, chosen }: { stage: StageId; chosen: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
      {roomUsed(stage, chosen).map(({ zone, used, total }) => (
        <span key={zone} className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-widest text-white/55">{ZONE_NAMES[zone]}</span>
          <span className="flex gap-0.5" aria-label={`${used} of ${total} spots used`}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`h-2 w-2 rounded-sm ${i < used ? 'bg-sky-300/85' : 'bg-white/15'}`} />
            ))}
          </span>
        </span>
      ))}
    </div>
  )
}

/** Credits and where they came from, collections, and what's coming */
function Progress({ stats, credits, owns }: { stats: Stats; credits: Credits; owns: (id: string) => boolean }) {
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

/**
 * How she performs as built: the numbers the harbor's controller sails her by, with what she's able to do. Abilities
 * come into play with Free Sail, the member's own helm.
 */
function StatsPanel({ stats }: { stats: VesselStats }) {
  return (
    <div className="grid gap-2">
      <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-1.5 p-0">
        {STAT_ROWS.map((r) => (
          <li key={r.key} className="min-w-0">
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[8px] uppercase tracking-widest text-white/55">{r.label}</span>
              <span className="font-mono text-[10px] text-white/85">
                {r.key === 'range' ? rangeName(stats.range) : statText(r, stats[r.key])}
              </span>
            </span>
            <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/12">
              <span
                className="block h-full rounded-full bg-linear-to-r from-sky-300 to-emerald-300 transition-[width] duration-500"
                style={{
                  width: `${Math.round(Math.min(1, Math.max(0.06, r.better === 'up' ? stats[r.key] / r.max : 1 - stats[r.key] / r.max)) * 100)}%`
                }}
              />
            </span>
          </li>
        ))}
      </ul>
      {stats.abilities.length > 0 && (
        <p className="m-0 font-nunito text-[11px] leading-snug text-sky-200/90">
          <b>Abilities:</b> {stats.abilities.map((a) => ABILITIES[a].name).join(', ')}
          <span className="text-white/45"> · with Free Sail</span>
        </p>
      )}
    </div>
  )
}

function Swatches({
  swatches,
  value,
  owns,
  onPick
}: {
  swatches: Swatch[]
  value: string
  owns: (id: string) => boolean
  onPick: (hex: string) => void
}) {
  const v = value.toLowerCase()
  // the boat's current colour is always offered, even if it isn't one of the locker's
  const list = !v || swatches.some((s) => s.hex === v) ? swatches : [{ hex: v, name: 'Current' }, ...swatches]
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2.5" role="radiogroup">
      {list.map((s) => {
        const on = s.hex === v
        const locked = !!s.unlock && !owns(s.unlock)
        const asComes = s.hex === ''
        const why = s.unlock ? priceLabel(itemDef(s.unlock).price) : ''
        return (
          <button
            key={s.hex || 'as-comes'}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={locked ? `${s.name} (locked: ${why})` : s.name}
            title={locked ? `${s.name} · ${why}` : s.name}
            disabled={locked}
            onClick={() => onPick(s.hex)}
            className={`relative aspect-square w-full max-w-12 justify-self-center rounded-full border transition-transform duration-150 active:scale-90 ${
              on ? 'border-white ring-2 ring-white ring-offset-2 ring-offset-[#0d3b4f]' : 'border-white/35'
            } ${locked ? 'opacity-55' : ''}`}
            style={{
              background: asComes ? 'conic-gradient(from 45deg, #c99a62, #e8ecef, #9aa3a8, #c99a62)' : s.hex,
              boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.35), inset 0 -3px 6px rgba(0,0,0,0.25)'
            }}
          >
            {on && (
              <Check size={17} className="absolute inset-0 m-auto text-white mix-blend-difference" aria-hidden="true" />
            )}
            {locked && <Lock size={14} className="absolute inset-0 m-auto text-white drop-shadow" aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}
