import { chapterId } from '@/lib/constants/api/chapterId'
import prisma from '@/prisma/client'

const CLEAN = process.argv.includes('--clean')

// Who judges this week's shortlist. Change to test as a different member.
const JUDGE_NAME = 'Brian Theirrien'

// Today in ET as a noon-UTC instant, matching how the app stores meeting dates
function meetingDateToday(): Date {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
  return new Date(`${iso}T12:00:00Z`)
}

async function main() {
  const meetingDate = meetingDateToday()
  const dayStart = new Date(meetingDate)
  dayStart.setUTCHours(0, 0, 0, 0)

  if (CLEAN) {
    const { count } = await prisma.guidingLight.deleteMany({ where: { chapterId, meetingDate: { gte: dayStart } } })
    console.log(`Deleted ${count} Guiding Light round(s) dated today or later.`)
    return
  }

  const existing = await prisma.guidingLight.findFirst({
    where: { chapterId, meetingDate: { gte: dayStart } },
    select: { id: true }
  })
  if (existing) {
    console.log('A Guiding Light round already exists for today. Run with --clean first.')
    return
  }

  const judge = await prisma.user.findFirst({
    where: { chapterId, name: JUDGE_NAME },
    select: { id: true, name: true }
  })
  if (!judge) {
    console.log(`✗ Judge not found: ${JUDGE_NAME}`)
    return
  }

  const round = await prisma.guidingLight.create({
    data: { chapterId, meetingDate, status: 'OPEN', judgedById: judge.id }
  })

  console.log(`✓ Seeded Guiding Light round ${round.id}`)
  console.log(`  judge: ${judge.name}`)
  console.log(`  status: OPEN`)
  console.log(`  meetingDate: ${meetingDate.toISOString()}`)
}

main()
  .catch((e) => {
    console.error('Fatal:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
