import { Rig } from '../_components/boats/Boats'
import { Identity } from './identity'
import { Berth, Path } from './harbor'
import { Rect } from './view'

// Live harbor state shared by the simulation, wakes, nameplates and camera. Mutated every frame, outside React.

export type Phase = 'waiting' | 'arriving' | 'settling' | 'moored'

export type BoatRuntime = {
  id: string
  who: Identity
  berth: Berth
  /** where its nameplate was planned to sit (reference screen), so later berths keep clear of it */
  plate: Rect
  path: Path | null
  /** which way it came in */
  gate: string | null
  /** performance.now() at which it sets off (arrivals are staggered) */
  launchAt: number
  phase: Phase
  s: number
  speed: number
  /** seconds since it stopped, for the settle */
  settled: number
  x: number
  y: number
  z: number
  heading: number
  turnRate: number
  roll: number
  pitch: number
  rig: Rig
  /** seconds since it set off, for the nameplate's welcome */
  age: number
}

export type HarborStore = {
  boats: Map<string, BoatRuntime>
  plates: Map<string, HTMLDivElement>
}

export const createStore = (): HarborStore => ({ boats: new Map(), plates: new Map() })
