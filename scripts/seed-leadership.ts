import { chapterId } from '@/lib/constants/api/chapterId'
import prisma from '@/prisma/client'
import { LeadershipPosition } from '@prisma/client'

const CLEAN = process.argv.includes('--clean')

// Terms run the calendar year; the Oct 29 election seats the next one
const START = new Date('2026-01-01T00:00:00Z')
const END = new Date('2026-12-31T23:59:59Z')

const CURRENT: { name: string; position: LeadershipPosition }[] = [
  { name: 'Brendan Ward', position: 'HOST' },
  { name: 'Eileen Jonah', position: 'VP' },
  { name: 'Martin Connolly', position: 'VP' },
  { name: 'Page Driscoll', position: 'EDUCATION_COORDINATOR' },
  { name: 'Kerry Casey', position: 'SOCIAL_MEDIA_MANAGER' },
  { name: 'Alex Argeros', position: 'TREASURER' },
  { name: 'Gregory Row', position: 'DIGITAL_OPERATIONS_MANAGER' },
  { name: 'Angela Turpin', position: 'MEMBERSHIP_COMMITTEE' },
  { name: 'Jake VanMeter', position: 'MEMBERSHIP_COMMITTEE' },
  { name: 'Brian Theirrien', position: 'MEMBERSHIP_COMMITTEE' },
  { name: 'Dennis Ford Eagan', position: 'MEMBERSHIP_COMMITTEE' }
]

async function main() {
  if (CLEAN) {
    const { count } = await prisma.leadershipTerm.deleteMany({ where: { chapterId } })
    console.log(`Deleted ${count} leadership terms.`)
    return
  }

  const existing = await prisma.leadershipTerm.count({ where: { chapterId, isActive: true } })
  if (existing > 0) {
    console.log(`${existing} active terms already exist. Run with --clean first.`)
    return
  }

  console.log(`Seeding ${CURRENT.length} leadership terms\n`)

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

    console.log(`  ✓ ${member.name} → ${position}`)
  }

  console.log('\nVisitor Coordinator is new, left unfilled.')
}

main()
  .catch((e) => {
    console.error('Fatal:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
