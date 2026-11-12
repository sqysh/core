'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'

const HISTORY_WEEKS = 12

interface Member {
  id: string
  name: string
  company: string
  email: string
  phone: string | null
  alternateEmails: { email: string }[]
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join(':')
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function generateWeeklyMatches({ dryRun = false }: { dryRun?: boolean } = {}) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'SUPER_USER') {
    return { success: false, error: 'Unauthorized' }
  }

  const members = await prisma.user.findMany({
    where: { chapterId, membershipStatus: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      company: true,
      email: true,
      phone: true,
      alternateEmails: { select: { email: true } }
    }
  })

  if (members.length < 2) return { success: false, error: 'Not enough active members' }

  const since = new Date()
  since.setDate(since.getDate() - HISTORY_WEEKS * 7)

  const past = await prisma.parley.findMany({
    where: { chapterId, createdAt: { gte: since } },
    select: { requesterId: true, recipientId: true, createdAt: true }
  })

  // Most recent meeting date per pair
  const history = new Map<string, number>()
  for (const p of past) {
    const key = pairKey(p.requesterId, p.recipientId)
    const ts = p.createdAt.getTime()
    if (!history.has(key) || ts > history.get(key)!) history.set(key, ts)
  }

  const pool = shuffle(members)
  const used = new Set<string>()
  const pairs: [Member, Member][] = []

  for (const member of pool) {
    if (used.has(member.id)) continue

    const candidates = pool.filter((m) => m.id !== member.id && !used.has(m.id))
    if (candidates.length === 0) break

    // Prefer anyone they have never been paired with, random among those
    const neverMet = candidates.filter((c) => !history.has(pairKey(member.id, c.id)))
    const partner = neverMet.length
      ? pickRandom(neverMet)
      : candidates.sort(
          (a, b) => (history.get(pairKey(member.id, a.id)) ?? 0) - (history.get(pairKey(member.id, b.id)) ?? 0)
        )[0]

    used.add(member.id)
    used.add(partner.id)
    pairs.push([member, partner])
  }

  // Odd member out gets attached to someone who is already paired
  const leftover = pool.find((m) => !used.has(m.id))
  if (leftover) {
    const others = pool.filter((m) => m.id !== leftover.id)
    const neverMet = others.filter((c) => !history.has(pairKey(leftover.id, c.id)))
    const partner = pickRandom(neverMet.length ? neverMet : others)
    pairs.push([leftover, partner])
  }

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      pairs: pairs.map(([a, b]) => ({ a: a.name, b: b.name }))
    }
  }

  const scheduledAt = new Date()
  scheduledAt.setDate(scheduledAt.getDate() + 7)

  await prisma.parley.createMany({
    data: pairs.map(([a, b]) => ({
      chapterId,
      requesterId: a.id,
      recipientId: b.id,
      scheduledAt,
      notes: 'Auto-matched weekly 1-2-1'
    }))
  })

  // One email per member, listing everyone they drew
  const assignments = new Map<string, Member[]>()
  for (const [a, b] of pairs) {
    if (!assignments.has(a.id)) assignments.set(a.id, [])
    if (!assignments.has(b.id)) assignments.set(b.id, [])
    assignments.get(a.id)!.push(b)
    assignments.get(b.id)!.push(a)
  }

  return {
    success: true,
    pairCount: pairs.length,
    pairs: pairs.map(([a, b]) => ({ a: a.name, b: b.name }))
  }
}
