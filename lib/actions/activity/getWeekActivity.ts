'use server'

import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'

export interface MemberWeek {
  id: string
  name: string
  f2f: number
  referrals: number
  tyfcb: number
  tyfcbTotal: number
}

// "This week" is everything since last Thursday's meeting ended (8:30 ET),
// so Thursday-morning check-ins see a full seven days and nothing double counts.
export async function weekStart(): Promise<Date> {
  const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const d = new Date(nowET)
  // back to the most recent Thursday 8:30; if it's Thursday before 8:30, that's last week's
  const back = (d.getDay() - 4 + 7) % 7
  d.setDate(d.getDate() - back)
  d.setHours(8, 30, 0, 0)
  if (d > nowET) d.setDate(d.getDate() - 7)
  // convert that ET wall-clock back to a real instant
  const offsetMs = nowET.getTime() - Date.now()
  return new Date(d.getTime() - offsetMs)
}

/**
 * Every active member's week. Model and field names are my best guess at
 * yours; the three counts are the whole point, so match them up carefully:
 *   faceToFace  — one-to-ones, counted for both people in the meeting
 *   referral    — passed, counted for the sender
 *   thankYou    — TYFCB, counted for the member who submitted it, with amount
 */
export async function getWeekActivity(): Promise<MemberWeek[]> {
  const since = await weekStart()

  const [members, parleys, referrals, anchors] = await Promise.all([
    prisma.user.findMany({
      where: { chapterId, membershipStatus: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    }),
    prisma.parley.findMany({
      where: { chapterId, completed: true, completedAt: { gte: since } },
      select: { requesterId: true, recipientId: true }
    }),
    prisma.treasureMap.findMany({
      where: { chapterId, createdAt: { gte: since } },
      select: { giverId: true }
    }),
    prisma.anchor.findMany({
      where: { chapterId, createdAt: { gte: since } },
      select: { receiverId: true, businessValue: true }
    })
  ])

  const rows = new Map<string, MemberWeek>(
    members.map((m) => [m.id, { id: m.id, name: m.name ?? '', f2f: 0, referrals: 0, tyfcb: 0, tyfcbTotal: 0 }])
  )
  for (const p of parleys) {
    const req = rows.get(p.requesterId)
    if (req) req.f2f++
    const rec = rows.get(p.recipientId)
    if (rec) rec.f2f++
  }
  for (const r of referrals) {
    if (!r.giverId) continue
    const row = rows.get(r.giverId)
    if (row) row.referrals++
  }
  for (const a of anchors) {
    if (!a.receiverId) continue
    const row = rows.get(a.receiverId)
    if (!row) continue
    row.tyfcb++
    row.tyfcbTotal += Number(a.businessValue ?? 0)
  }
  return [...rows.values()]
}

/** One member's week, for the check-in screen. */
export async function getMyWeek(userId: string): Promise<MemberWeek | null> {
  const all = await getWeekActivity()
  return all.find((m) => m.id === userId) ?? null
}

// Only the member's own numbers are ever shown, on their check-in screen.
