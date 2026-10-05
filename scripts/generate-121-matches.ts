import { chapterId } from '@/lib/constants/api/chapterId'
import prisma from '@/prisma/client'

const DRY_RUN = process.argv.includes('--send') === false
const HISTORY_WEEKS = 12

interface Member {
  id: string
  name: string
  company: string
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

function daysAgo(ts: number) {
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24))
}

async function main() {
  console.log(`[${DRY_RUN ? 'DRY RUN' : 'LIVE'}] generating 1-2-1 matches\n`)

  const members = await prisma.user.findMany({
    where: { chapterId, membershipStatus: 'ACTIVE' },
    select: { id: true, name: true, company: true }
  })

  if (members.length < 2) {
    console.log('Not enough active members.')
    return
  }

  const since = new Date()
  since.setDate(since.getDate() - HISTORY_WEEKS * 7)

  const past = await prisma.parley.findMany({
    where: { chapterId, createdAt: { gte: since } },
    select: { requesterId: true, recipientId: true, createdAt: true }
  })

  const history = new Map<string, number>()
  for (const p of past) {
    const key = pairKey(p.requesterId, p.recipientId)
    const ts = p.createdAt.getTime()
    if (!history.has(key) || ts > history.get(key)!) history.set(key, ts)
  }

  console.log(`Members: ${members.length}`)
  console.log(`Parleys in last ${HISTORY_WEEKS} weeks: ${past.length}`)
  console.log(`Distinct pairs with history: ${history.size}\n`)

  const pool = shuffle(members)
  const used = new Set<string>()
  const pairs: [Member, Member, string][] = []

  for (const member of pool) {
    if (used.has(member.id)) continue

    const candidates = pool.filter((m) => m.id !== member.id && !used.has(m.id))
    if (candidates.length === 0) break

    const neverMet = candidates.filter((c) => !history.has(pairKey(member.id, c.id)))

    let partner: Member
    let reason: string

    if (neverMet.length) {
      partner = pickRandom(neverMet)
      reason = 'never met'
    } else {
      partner = candidates.sort(
        (a, b) => (history.get(pairKey(member.id, a.id)) ?? 0) - (history.get(pairKey(member.id, b.id)) ?? 0)
      )[0]
      const last = history.get(pairKey(member.id, partner.id))
      reason = last ? `last met ${daysAgo(last)}d ago` : 'never met'
    }

    used.add(member.id)
    used.add(partner.id)
    pairs.push([member, partner, reason])
  }

  const leftover = pool.find((m) => !used.has(m.id))
  if (leftover) {
    const others = pool.filter((m) => m.id !== leftover.id)
    const neverMet = others.filter((c) => !history.has(pairKey(leftover.id, c.id)))
    const partner = pickRandom(neverMet.length ? neverMet : others)
    const last = history.get(pairKey(leftover.id, partner.id))
    pairs.push([leftover, partner, last ? `odd one out, last met ${daysAgo(last)}d ago` : 'odd one out, never met'])
  }

  console.log('─── Matches ───')
  pairs.forEach(([a, b, reason], i) => {
    console.log(`${String(i + 1).padStart(2)}. ${a.name.padEnd(20)} ↔ ${b.name.padEnd(20)} (${reason})`)
  })

  // Who ended up with more than one
  const counts = new Map<string, number>()
  for (const [a, b] of pairs) {
    counts.set(a.name, (counts.get(a.name) ?? 0) + 1)
    counts.set(b.name, (counts.get(b.name) ?? 0) + 1)
  }
  const doubled = [...counts.entries()].filter(([, c]) => c > 1)
  const missing = members.filter((m) => !counts.has(m.name))

  console.log(`\n─── Summary ───`)
  console.log(`Pairs:   ${pairs.length}`)
  if (doubled.length) console.log(`Doubled: ${doubled.map(([n, c]) => `${n} (${c})`).join(', ')}`)
  if (missing.length) console.log(`MISSING: ${missing.map((m) => m.name).join(', ')}`)

  if (DRY_RUN) {
    console.log('\nDry run, nothing written. Pass --send to create Parley records.')
    return
  }

  const scheduledAt = new Date()
  scheduledAt.setDate(scheduledAt.getDate() + 7)

  const created = await prisma.parley.createMany({
    data: pairs.map(([a, b]) => ({
      chapterId,
      requesterId: a.id,
      recipientId: b.id,
      scheduledAt,
      notes: 'Auto-matched weekly 1-2-1'
    }))
  })

  console.log(`\nCreated ${created.count} Parley records.`)
}

main()
  .catch((e) => {
    console.error('Fatal:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
