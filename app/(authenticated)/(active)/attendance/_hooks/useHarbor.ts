import { useCallback, useRef, useState } from 'react'
import { Member } from '@/types/attendance.types'
import {
  ART_LENGTH,
  BOATS,
  BoatKind,
  PALETTES,
  Palette,
  WATERLINE
} from '@/app/(authenticated)/(active)/attendance/_lib/boats'
import {
  Berth,
  Point,
  Rect,
  Voyage,
  chooseBerth,
  lengthAt,
  PLATE_H,
  placePlate,
  plateScale,
  planVoyage,
  plateWidth
} from '@/app/(authenticated)/(active)/attendance/_lib/harborLayout'
import { BoatVoice, voiceFor } from '@/app/(authenticated)/(active)/attendance/_lib/boatSounds'
import { hashString } from '@/app/(authenticated)/(active)/attendance/_lib/random'

export interface FleetBoat {
  id: string
  member: Member
  label: string
  kind: BoatKind
  palette: Palette
  berth: Berth
  /** Hull length at the berth */
  L: number
  facing: 1 | -1
  plate: Rect
  /** The plate is drawn at full size and scaled by this, smaller for distant boats */
  plateScale: number
  /** Top of the boat at its berth, where the nameplate's rope ties on */
  top: Point
  /** This boat's own engine and horn */
  voice: BoatVoice
  /** Null for boats already moored when the page loaded */
  voyage: Voyage | null
  /** performance.now() time the voyage starts, staggered so simultaneous check-ins sail in one after another */
  launchAt: number
}

/** Gap between launches when several people check in at once */
const LAUNCH_GAP_MS = 1700

function plateLabel(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/)
  const last = rest[rest.length - 1]
  return last ? `${first} ${last[0]}.` : first
}

export function boatTop(kind: BoatKind, berth: Point, L: number): Point {
  return { x: berth.x, y: berth.y - ((WATERLINE - kind.top) / ART_LENGTH) * L }
}

function boatRect(b: FleetBoat): Rect {
  return { x: b.berth.x - b.L / 2, y: b.top.y, w: b.L, h: b.berth.y - b.top.y }
}

// One boat for one member: its look comes from their id so it's the same every week, its berth from the arrival order
function moor(
  fleet: FleetBoat[],
  member: Member,
  sail: boolean,
  launchAt: number,
  voiceIndex: number
): FleetBoat | null {
  const h = hashString(member.id)
  const kind = BOATS[h % BOATS.length]
  const palette = PALETTES[Math.floor(h / BOATS.length) % PALETTES.length]

  const shape = (b: Berth) => {
    const len = lengthAt(b.y) * kind.size
    const t = boatTop(kind, b, len)
    return { x: b.x - len / 2, y: t.y, w: len, h: b.y - t.y }
  }
  const berth = chooseBerth(
    fleet.map((b) => ({ berth: b.berth, rect: boatRect(b) })),
    shape
  )
  if (!berth) return null

  const L = lengthAt(berth.y) * kind.size
  const voyage = sail ? planVoyage(berth, L) : null
  const facing = voyage?.facing ?? (h & 1 ? 1 : -1)
  const top = boatTop(kind, berth, L)
  const label = plateLabel(member.name)
  const scale = plateScale(L)
  const plate = placePlate(
    top,
    Math.round(plateWidth(label) * scale),
    Math.round(PLATE_H * scale),
    fleet.map((b) => ({ plate: b.plate, top: b.top })),
    fleet.map(boatRect)
  )

  return {
    id: member.id,
    member,
    label,
    kind,
    palette,
    berth,
    L,
    facing,
    plate,
    plateScale: scale,
    top,
    voice: voiceFor(kind.key, voiceIndex),
    voyage,
    launchAt
  }
}

/**
 * The harbor's fleet. Everyone already checked in is moored on load, in check-in order, so a reload puts every boat
 * back where it was. Each new check-in sails in; a repeat check-in is ignored.
 */
export function useHarbor(members: Member[], initialIds: string[]) {
  const [byId] = useState(() => new Map(members.map((m) => [m.id, m])))
  // each member's place on the roster, by id so it doesn't shuffle when names change, picks their boat's voice
  const [voiceIndex] = useState(
    () => new Map([...members].sort((a, b) => a.id.localeCompare(b.id)).map((m, i) => [m.id, i]))
  )
  const [fleet, setFleet] = useState<FleetBoat[]>(() => {
    const out: FleetBoat[] = []
    for (const id of initialIds) {
      const m = byId.get(id)
      if (!m || out.some((b) => b.id === id)) continue
      const boat = moor(out, m, false, 0, voiceIndex.get(id) ?? 0)
      if (boat) out.push(boat)
    }
    return out
  })
  const fleetRef = useRef(fleet)
  const lastLaunch = useRef(0)

  const arrive = useCallback((userId: string) => {
    const member = byId.get(userId)
    if (!member || fleetRef.current.some((b) => b.id === userId)) return

    const now = performance.now()
    const launchAt = Math.max(now, lastLaunch.current + LAUNCH_GAP_MS)
    const boat = moor(fleetRef.current, member, true, launchAt, voiceIndex.get(userId) ?? 0)
    if (!boat) return

    lastLaunch.current = launchAt
    fleetRef.current = [...fleetRef.current, boat]
    setFleet(fleetRef.current)
  }, [byId, voiceIndex])

  return { fleet, arrive }
}
