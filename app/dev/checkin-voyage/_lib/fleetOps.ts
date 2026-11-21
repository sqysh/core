import { chooseBerth, planRoute } from './berths'
import { Identity } from './identity'
import { BoatRuntime, createVessel, HarborStore } from './store'

// Bringing a member's boat into the harbor, shared by the TV board and the phones' small copy of it. Both place
// boats the same way, in the same order, so a member's boat lies at the same berth on their phone as on the TV.

/** Simultaneous check-ins launch this far apart, so each boat still appears within about a second of its turn */
export const LAUNCH_GAP_MS = 850

/** What successive arrivals share: which gate the last came in by (the next avoids it) and when it launched */
export type Launches = { lastGate: string | null; lastLaunch: number }
export const createLaunches = (): Launches => ({ lastGate: null, lastLaunch: 0 })

/**
 * Berths a member's boat: lying at anchor already, or queued to sail in. Returns the new vessel, or null when the
 * member's boat is already here or the harbor has no room.
 */
export function berthBoat(store: HarborStore, identity: Identity, sail: boolean, launches: Launches): BoatRuntime | null {
  if (store.boats.has(identity.id)) return null
  const occupied = [...store.boats.values()].map((o) => ({ x: o.berth.x, z: o.berth.z, boat: o.who.spec.dims, plate: o.plate }))
  const berth = chooseBerth(occupied, identity.spec.dims, identity.label)
  if (!berth) return null
  const route = sail ? planRoute(berth, identity.spec.dims, occupied, launches.lastGate) : null
  if (route) launches.lastGate = route.gate
  const launchAt = sail ? Math.max(performance.now(), launches.lastLaunch + LAUNCH_GAP_MS) : 0
  if (sail) launches.lastLaunch = launchAt
  const b = createVessel({ id: identity.id, who: identity, berth, plate: berth.plate, route, launchAt })
  store.boats.set(identity.id, b)
  return b
}
