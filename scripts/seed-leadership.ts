import { chapterId } from '@/lib/constants/api/chapterId'
import prisma from '@/prisma/client'
import { LeadershipPosition } from '@/src/generated/prisma/enums'

const CLEAN = process.argv.includes('--clean')

// Terms run the calendar year; the Oct 29 election seats the next one
const START = new Date('2026-01-11T00:00:00Z')
const END = new Date('2027-01-11T23:59:59Z')

const CURRENT: { name: string; position: LeadershipPosition }[] = [
  { name: 'Eileen Jonah', position: 'HOST' },
  { name: 'Brendan Ward', position: 'CO_DIRECTOR' },
  { name: 'Martin Connolly', position: 'CO_DIRECTOR' },
  { name: 'Page Driscoll', position: 'EDUCATION_COORDINATOR' },
  { name: 'Kerry Casey', position: 'SOCIAL_MEDIA_MANAGER' },
  { name: 'Alex Argeros', position: 'TREASURER' },
  { name: 'Gregory Row', position: 'DIGITAL_OPERATIONS_MANAGER' },
  { name: 'Angela Turpin', position: 'VISITOR_COORDINATOR' },
  { name: 'Jake VanMeter', position: 'MEMBERSHIP_COMMITTEE' },
  { name: 'Anna Roy', position: 'MEMBERSHIP_COMMITTEE' },
  { name: 'Dennis Ford Eagan, Esq.', position: 'MEMBERSHIP_COMMITTEE' },
  { name: 'Brian Theirrien', position: 'EVENT_COORDINATOR' }
]

async function main() {
  if (CLEAN) {
    const { count } = await prisma.leadershipTerm.deleteMany({ where: { chapterId } })
    console.log(`Deleted ${count} leadership terms.`)
    return
  }

  // Keep prior terms as history: retire whatever is active, then seat the new roster
  const { count: archived } = await prisma.leadershipTerm.updateMany({
    where: { chapterId, isActive: true },
    data: { isActive: false }
  })
  if (archived > 0) console.log(`Archived ${archived} prior active terms (kept as history).\n`)

  console.log(`Seeding ${CURRENT.length} leadership terms\n`)

  let seeded = 0
  for (const { name, position } of CURRENT) {
    const member = await prisma.user.findFirst({
      where: { chapterId, name },
      select: { id: true, name: true }
    })

    if (!member) {
      console.log(`  ✗ not found: ${name}`)
      continue
    }

    await prisma.leadershipTerm.create({
      data: { chapterId, position, holderId: member.id, startDate: START, endDate: END, isActive: true }
    })

    seeded++
    console.log(`  ✓ ${member.name} → ${position}`)
  }

  console.log(`\nSeeded ${seeded} of ${CURRENT.length} active terms.`)
}

main()
  .catch((e) => {
    console.error('Fatal:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
