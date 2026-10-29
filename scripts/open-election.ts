import { chapterId } from '@/lib/constants/api/chapterId'
import prisma from '@/prisma/client'

async function main() {
  const year = new Date().getFullYear()

  const existing = await prisma.election.findUnique({
    where: { chapterId_year: { chapterId, year } },
    select: { id: true, status: true }
  })

  if (existing) {
    console.log(`Election already exists: ${existing.id} (${existing.status})`)
    return
  }

  const election = await prisma.election.create({
    data: { chapterId, year, status: 'VOTING_OPEN' },
    select: { id: true }
  })

  console.log(`Created election ${election.id} for ${year}`)
}

main()
  .catch((e) => {
    console.error('Fatal:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
