import { BoatVoice, voiceFor } from '@/app/(authenticated)/(active)/attendance/_lib/boatSounds'
import { vesselConfigSchema } from '@/lib/schemas/vessel.schema'
import { defaultVesselConfig, VesselClassId, VesselConfig } from '@/lib/vessel/catalog'
import { Member } from '@/types/attendance.types'
import { lookOf, VesselLook } from './vessel/look'

// Each member's boat: their saved vessel (MemberVessel) when they've customised one, otherwise the default their id has
// always given them (the same class and colours as the 2D harbor board), so it's the same every week and every screen.
// Plus their nameplate label and their engine and horn voice.

export type BoatClass = VesselClassId

export type Identity = {
  id: string
  label: string
  name: string
  /** Profile photo, when they have one */
  image: string | null
  boat: BoatClass
  config: VesselConfig
  look: VesselLook
  voice: BoatVoice
  /** Place on the roster by id, which spreads pitches so no two boats share a voice */
  index: number
}

/** The board's engine and horn sets that suit each class */
const VOICE_KIND: Record<BoatClass, string> = { runabout: 'yacht', lobster: 'lobster', sloop: 'sloop' }

/** "Eileen Murphy" → "Eileen M." */
export function plateLabel(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/)
  const last = rest[rest.length - 1]
  return last ? `${first} ${last[0]}.` : first
}

/** One member's boat from their config (saved, or their default); `index` is their place on the roster by id */
export function identityOf(m: Member, config: VesselConfig, index: number): Identity {
  return {
    id: m.id,
    name: m.name,
    image: m.profileImage ?? null,
    label: plateLabel(m.name),
    boat: config.vesselClass,
    config,
    look: lookOf(config),
    voice: voiceFor(VOICE_KIND[config.vesselClass], index),
    index
  }
}

/** Everyone's boat, keyed by member id; `saved` holds the vessels members have customised */
export function identities(members: Member[], saved: Record<string, VesselConfig> = {}) {
  // the roster position by id (not name) spreads voices out, as the board does
  const order = new Map([...members].sort((a, b) => a.id.localeCompare(b.id)).map((m, i) => [m.id, i]))
  return new Map(
    members.map((m) => [m.id, identityOf(m, saved[m.id] ?? defaultVesselConfig(m.id), order.get(m.id) ?? 0)])
  )
}

/**
 * A member checking in brings their boat as it is right now (the check-in event carries it), so a boat changed in the
 * Garage after the screen loaded still arrives exactly as they dressed it. Validated like a saved row; anything that
 * doesn't fit the catalog leaves their boat as it was.
 */
export function refreshIdentity(who: Map<string, Identity>, id: string, vessel: unknown) {
  const current = who.get(id)
  if (!current || !vessel || typeof vessel !== 'object') return
  const parsed = vesselConfigSchema.safeParse(vessel)
  if (!parsed.success) return
  const config = parsed.data as VesselConfig
  who.set(id, identityOf({ id, name: current.name, company: '', profileImage: current.image }, config, current.index))
}
