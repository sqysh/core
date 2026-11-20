import 'server-only'
import { chapterId } from '@/lib/constants/api/chapterId'
import { VesselConfig } from '@/lib/vessel/catalog'
import { VESSEL_SELECT, vesselFromRow } from '@/lib/vessel/persistence'
import prisma from '@/prisma/client'
import { Member } from '@/types/attendance.types'

export type HarborData = {
  members: Member[]
  /** Everyone checked in today, earliest first, so a reload moors them back in the order they arrived */
  initialAttendees: string[]
  todayISO: string
  /** Members' saved boats; anyone missing sails their default */
  vessels: Record<string, VesselConfig>
}

// What a harbor screen needs to draw today's meeting: the same data the TV check-in board loads (the active roster
// and today's check-ins), plus everyone's saved boat. Shared by the TV board and the phones' copy of it.
export async function loadHarbor(): Promise<HarborData> {
  const todayISO = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
  const dayStart = new Date(`${todayISO}T00:00:00Z`)
  const dayEnd = new Date(`${todayISO}T23:59:59.999Z`)

  const [members, todays] = await Promise.all([
    prisma.user.findMany({
      where: { chapterId, membershipStatus: 'ACTIVE' },
      select: { id: true, name: true, company: true, profileImage: true },
      orderBy: { name: 'asc' }
    }),
    prisma.attendance.findMany({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
      select: { userId: true },
      orderBy: { createdAt: 'asc' }
    })
  ])

  // read separately and forgivingly, so the harbor still loads if the vessel table isn't there yet (before the schema
  // is pushed): everyone then sails their default
  const vessels: Record<string, VesselConfig> = {}
  try {
    const rows = await prisma.memberVessel.findMany({ where: { userId: { in: members.map((m) => m.id) } }, select: VESSEL_SELECT })
    for (const row of rows) vessels[row.userId] = vesselFromRow(row)
  } catch {}

  return {
    members: members.map((m) => ({ ...m, name: m.name ?? '', company: m.company ?? '' })),
    initialAttendees: [...new Set(todays.map((a) => a.userId))],
    todayISO,
    vessels
  }
}
