import { useEffect, useMemo, useState } from 'react'
import { buyVesselItem } from '@/lib/actions/vessel/buyVesselItem'
import { saveMyVessel } from '@/lib/actions/vessel/saveMyVessel'
import type { Credits } from '@/lib/vessel/entitlements'
import { accessoriesOf, isHeritage, StageId, stageOf, STAGES, VesselConfig } from '@/lib/vessel/catalog'
import {
  allocate,
  fitAccessory,
  fitProblem,
  itemDef,
  ItemId,
  maxLevel,
  setStage,
  stageItem,
  Stats
} from '@/lib/vessel/items'
import { vesselStats } from '@/lib/vessel/stats'
import type { PreviewFrame } from '@/components/harbor/BoatPreview'
import { lookOf } from '@/lib/harbor/vessel/look'
import { LoadState, NOT_LOADED, PAINT_PARTS, same, SceneLoad, Section } from '../_lib/garage'
import { useLandscape } from './useLandscape'

export type GarageProps = {
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
}

/** The Garage's shared state: the boat being edited, what the member owns, the menu, and the actions that change them */
export function useGarage({
  initial,
  unlocked,
  stats,
  credits: initialCredits,
  storageReady,
  firstName,
  initialSection = 'vessel'
}: GarageProps) {
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
  // the 3D scene has drawn its first frame (the loading screen stays until then, or until the preview fails)
  const [sceneReady, setSceneReady] = useState(false)
  // what the scene has reported of its loading, stage by stage
  const [load, setLoad] = useState<LoadState>(NOT_LOADED)
  const updateLoad = (p: SceneLoad) =>
    setLoad((l) => ({ engine: l.engine || !!p.engine, built: l.built || !!p.built, assets: p.assets ?? l.assets }))
  const landscape = useLandscape()

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

  /** Opens a part of the menu, raising the sheet if it's lowered */
  function openSection(key: Section) {
    setSection(key)
    setSheetOpen(true)
  }

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

  return {
    // from the page
    stats,
    storageReady,
    firstName,
    // the boat and what the member has
    saved,
    draft,
    setDraft,
    owned,
    credits,
    // the menu and the scene
    section,
    openSection,
    paintKey,
    setPaintKey,
    previewing,
    setPreviewing,
    home,
    setHome,
    sheetOpen,
    setSheetOpen,
    landscape,
    previewFailed,
    setPreviewFailed,
    sceneReady,
    setSceneReady,
    load,
    updateLoad,
    frame,
    // in flight
    busy,
    confirming,
    notice,
    setNotice,
    // derived
    dirty,
    heritage,
    stage,
    level,
    topLevel,
    chosen,
    owns,
    shown,
    look,
    boatStats,
    paintPart,
    sails,
    // actions
    apply,
    save,
    upgrade,
    buyAccessory
  }
}

export type Garage = ReturnType<typeof useGarage>
