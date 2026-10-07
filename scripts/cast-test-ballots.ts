import { chapterId } from '@/lib/constants/api/chapterId'
import { APPOINTED_EMAIL, APPOINTED_HOLDERS, ELECTED_POSITIONS, POSITIONS } from '@/lib/constants/leadership.constants'
import { pusher } from '@/lib/pusher/pusher'
import prisma from '@/prisma/client'

const DELAY_MS = Number(process.argv.find((a) => a.startsWith('--delay='))?.split('=')[1] ?? 1500)
const CLEAN = process.argv.includes('--clean')

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

async function main() {
  const year = new Date().getFullYear()

  const election = await prisma.election.findUnique({
    where: { chapterId_year: { chapterId, year } },
    select: { id: true, status: true }
  })

  if (!election) {
    console.log('No election found. Press Open Election first.')
    return
  }

  if (CLEAN) {
    const { count } = await prisma.ballot.deleteMany({ where: { electionId: election.id } })
    console.log(`Deleted ${count} ballots.`)
    return
  }

  const allMembers = await prisma.user.findMany({
    where: { chapterId, membershipStatus: 'ACTIVE' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' }
  })

  const candidates = allMembers.filter((m) => m.email !== APPOINTED_EMAIL)
  // Appointed holders aren't on the ballot as candidates
  const appointed = new Set(Object.values(APPOINTED_HOLDERS))

  const voted = await prisma.ballot.findMany({
    where: { electionId: election.id },
    select: { voterId: true },
    distinct: ['voterId']
  })
  const votedIds = new Set(voted.map((b) => b.voterId))

  const toVote = allMembers.filter((m) => !votedIds.has(m.id))

  console.log(`${allMembers.length} members, ${votedIds.size} voted, casting ${toVote.length}\n`)

  for (const voter of toVote) {
    await prisma.ballot.createMany({
      data: ELECTED_POSITIONS.flatMap((position) =>
        sample(candidates, POSITIONS[position].seats).map((c) => ({
          electionId: election.id,
          voterId: voter.id,
          position,
          votedForId: c.id
        }))
      ),
      skipDuplicates: true
    })

    const voterCount = await prisma.ballot
      .findMany({ where: { electionId: election.id }, select: { voterId: true }, distinct: ['voterId'] })
      .then((r) => r.length)

    await pusher.trigger('election-status', 'ballot-submitted', { voterId: voter.id, voterCount })

    console.log(`  ${voterCount}/${allMembers.length}  ${voter.name}`)
    await sleep(DELAY_MS)
  }

  console.log('\nDone.')
}

main()
  .catch((e) => {
    console.error('Fatal:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
