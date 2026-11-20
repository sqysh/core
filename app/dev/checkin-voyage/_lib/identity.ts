import { PALETTES, Palette } from '@/app/(authenticated)/(active)/attendance/_lib/boats'
import { BoatVoice, voiceFor } from '@/app/(authenticated)/(active)/attendance/_lib/boatSounds'
import { hashString } from '@/app/(authenticated)/(active)/attendance/_lib/random'
import { Member } from '@/types/attendance.types'

// Each member's boat, decided by their id exactly as the 2D harbor board does it, so it's the same every week:
// the boat class, its colours (the board's own palettes) and its engine and horn voice.

export type BoatClass = 'runabout' | 'lobster' | 'sloop'

export type Identity = {
  id: string
  label: string
  name: string
  /** Profile photo, when they have one */
  image: string | null
  boat: BoatClass
  palette: Palette
  voice: BoatVoice
  /** Place on the roster by id, which spreads pitches so no two boats share a voice */
  index: number
}

const CLASSES: BoatClass[] = ['runabout', 'lobster', 'sloop']
/** The board's engine and horn sets that suit each class */
const VOICE_KIND: Record<BoatClass, string> = { runabout: 'yacht', lobster: 'lobster', sloop: 'sloop' }

/** "Eileen Murphy" → "Eileen M." */
export function plateLabel(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/)
  const last = rest[rest.length - 1]
  return last ? `${first} ${last[0]}.` : first
}

export function identities(members: Member[]) {
  // the roster position by id (not name) spreads voices out, as the board does
  const order = new Map([...members].sort((a, b) => a.id.localeCompare(b.id)).map((m, i) => [m.id, i]))
  return new Map(
    members.map((m) => {
      const h = hashString(m.id)
      const boat = CLASSES[h % CLASSES.length]
      return [
        m.id,
        {
          id: m.id,
          name: m.name,
          image: m.profileImage ?? null,
          label: plateLabel(m.name),
          boat,
          palette: PALETTES[Math.floor(h / CLASSES.length) % PALETTES.length],
          voice: voiceFor(VOICE_KIND[boat], order.get(m.id) ?? 0),
          index: order.get(m.id) ?? 0
        } satisfies Identity
      ]
    })
  )
}
