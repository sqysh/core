import { STAGE_IDS, STAGES, VesselConfig, VesselDetails } from '@/lib/vessel/catalog'
import { ACCESSORY_IDS, itemDef } from '@/lib/vessel/items'
import { ACCENT, BOTTOM, CABIN, DECK, EQUIPMENT, HULL, ROOF, SEATS, Swatch, TRIM } from './swatches'

export type SceneLoad = import('@/app/dev/checkin-voyage/BoatPreview').SceneLoad
/** What the 3D scene has reported so far */
export type LoadState = { engine: boolean; built: boolean; assets: { loaded: number; total: number } }
export const NOT_LOADED: LoadState = { engine: false, built: false, assets: { loaded: 0, total: 0 } }

/**
 * How far the scene is, from what has actually been reported: four stages of equal weight, so 100% is only the
 * scene drawn. The assets stage is the share of requested files fetched; when nothing was requested there is nothing
 * to wait for, and it counts as done once the engine is up. The status names the stage being waited on.
 */
export function loadProgress(load: LoadState, ready: boolean): { percent: number; status: string } {
  const { loaded, total } = load.assets
  const assets = !load.engine ? 0 : total > 0 ? Math.min(1, loaded / total) : 1
  const percent = Math.round(((load.engine ? 1 : 0) + assets + (load.built ? 1 : 0) + (ready ? 1 : 0)) * 25)
  const status = !load.engine
    ? 'Starting the 3D engine'
    : assets < 1
      ? `Loading assets (${loaded} of ${total})`
      : !load.built
        ? 'Building the harbor'
        : 'Compiling shaders and drawing the first frame'
  return { percent: ready ? 100 : percent, status }
}

export type Section = 'vessel' | 'customize' | 'paint' | 'progress'

type ColorField = 'hullColor' | 'trimColor' | 'accentColor'
type DetailField = Exclude<keyof VesselDetails, 'finish' | 'parts' | 'stage'>
export type PaintPart = { key: string; label: string; swatches: Swatch[]; field?: ColorField; detail?: DetailField }
export const PAINT_PARTS: PaintPart[] = [
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

/** The levels, in the order a member meets them */
export const LEVELS = [...new Set(STAGE_IDS.map((s) => STAGES[s].level))].sort((a, b) => a - b)
/** Accessories that unlock at a level */
export const unlocksAt = (level: number) => ACCESSORY_IDS.filter((id) => itemDef(id).custom!.level === level)

export const same = (a: VesselConfig, b: VesselConfig) => JSON.stringify(a) === JSON.stringify(b)
