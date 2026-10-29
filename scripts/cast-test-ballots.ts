import { chapterId } from '@/lib/constants/api/chapterId'
import { EXCLUDED_VOTER_EMAILS } from '@/lib/constants/election.constants'
import { ELECTED_POSITIONS, POSITIONS } from '@/lib/constants/leadership.constants'
import { BALLOT_QUESTIONS } from '@/lib/constants/questions.constants'
import { pusher } from '@/lib/pusher/pusher'
import prisma from '@/prisma/client'

const DELAY_MS = Number(process.argv.find((a) => a.startsWith('--delay='))?.split('=')[1] ?? 1500)
const CLEAN = process.argv.includes('--clean')
const CHECK_IN = process.argv.includes('--check-in')

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
    const [ballots, responses] = await Promise.all([
      prisma.ballot.deleteMany({ where: { electionId: election.id } }),
      prisma.questionResponse.deleteMany({ where: { electionId: election.id } })
    ])
    console.log(`Deleted ${ballots.count} ballots, ${responses.count} question responses.`)
    return
  }

  const allMembers = await prisma.user.findMany({
    where: { chapterId, membershipStatus: 'ACTIVE' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' }
  })

  if (CHECK_IN) {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    let meeting = await prisma.meeting.findFirst({
      where: { chapterId, date: { gte: start, lt: end } },
      select: { id: true }
    })

    if (!meeting) {
      meeting = await prisma.meeting.create({
        data: { chapterId, date: new Date() },
        select: { id: true }
      })
      console.log('Created a meeting for today.')
    }

    const { count } = await prisma.attendance.createMany({
      data: allMembers.map((m) => ({ meetingId: meeting!.id, userId: m.id })),
      skipDuplicates: true
    })

    console.log(`Checked in ${count} members.\n`)
  }

  const voted = await prisma.ballot.findMany({
    where: { electionId: election.id },
    select: { voterId: true },
    distinct: ['voterId']
  })
  const votedIds = new Set(voted.map((b) => b.voterId))

  const toVote = allMembers.filter((m) => !votedIds.has(m.id) && !EXCLUDED_VOTER_EMAILS.includes(m.email))

  console.log(`${allMembers.length} members, ${votedIds.size} voted, casting ${toVote.length}\n`)

  for (const voter of toVote) {
    await prisma.ballot.createMany({
      data: ELECTED_POSITIONS.flatMap((position) =>
        sample(allMembers, POSITIONS[position].seats).map((c) => ({
          electionId: election.id,
          voterId: voter.id,
          position,
          votedForId: c.id
        }))
      ),
      skipDuplicates: true
    })

    await prisma.questionResponse.createMany({
      data: BALLOT_QUESTIONS.map((q) => ({
        electionId: election.id,
        voterId: voter.id,
        questionKey: q.key,
        answer: q.options[Math.floor(Math.random() * q.options.length)].value
      })),
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
