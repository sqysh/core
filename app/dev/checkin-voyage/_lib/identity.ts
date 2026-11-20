import { BoatVoice, voiceFor } from '@/app/(authenticated)/(active)/attendance/_lib/boatSounds'
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

/** Everyone's boat, keyed by member id; `saved` holds the vessels members have customised */
export function identities(members: Member[], saved: Record<string, VesselConfig> = {}) {
  // the roster position by id (not name) spreads voices out, as the board does
  const order = new Map([...members].sort((a, b) => a.id.localeCompare(b.id)).map((m, i) => [m.id, i]))
  return new Map(
    members.map((m) => {
      const config = saved[m.id] ?? defaultVesselConfig(m.id)
      return [
        m.id,
        {
          id: m.id,
          name: m.name,
          image: m.profileImage ?? null,
          label: plateLabel(m.name),
          boat: config.vesselClass,
          config,
          look: lookOf(config),
          voice: voiceFor(VOICE_KIND[config.vesselClass], order.get(m.id) ?? 0),
          index: order.get(m.id) ?? 0
        } satisfies Identity
      ]
    })
  )
}
