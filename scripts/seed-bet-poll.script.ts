// Seed Brian's "$600 bet" poll so you can test the host launch flow right away.
// Run from the project root:
//   npx tsx --env-file=.env scripts/seed-bet-poll.script.ts            (creator: Brian)
//   npx tsx --env-file=.env scripts/seed-bet-poll.script.ts "Gregory Row"
//
// Then open the host remote and tap "Launch poll to everyone".

import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'

const QUESTION = "What do we do with Alex's $600?"
const OPTIONS = [
  'Bet it once, win or lose we go to Mystic or the Italian spot',
  "Let it ride, double up, and if we win it's Rare steakhouse"
]

async function main() {
  const creatorName = process.argv[2]?.trim() || 'Brian Theirrien'

  const creator = await prisma.user.findFirst({
    where: { chapterId, name: { equals: creatorName, mode: 'insensitive' } },
    select: { id: true, name: true }
  })
  if (!creator) {
    console.error(`No member named "${creatorName}" in this chapter. Pass a name that matches.`)
    process.exit(1)
  }

  const poll = await prisma.poll.create({
    data: {
      chapterId,
      question: QUESTION,
      createdById: creator.id,
      options: { create: OPTIONS.map((label, order) => ({ label, order })) }
    },
    select: { id: true }
  })

  console.log(`Created poll "${QUESTION}" by ${creator.name} (${poll.id}).`)
  console.log('Open the host remote and tap "Launch poll to everyone" to push it out.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
