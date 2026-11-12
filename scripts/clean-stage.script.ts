// Wipe the data a stage run creates, so you can test the run of show from scratch.
// Run from the project root:
//   npx tsx --env-file=.env scripts/clean-stage.script.ts            (today's test data)
//   npx tsx --env-file=.env scripts/clean-stage.script.ts --dry      (show counts, delete nothing)
//   npx tsx --env-file=.env scripts/clean-stage.script.ts --all      (every guiding-light round + matchup, not just today's)
//   npx tsx --env-file=.env scripts/clean-stage.script.ts --balance  (also clear the treasurer bank balance)
//
// What it touches, all scoped to your chapterId:
//   - GuidingLight rounds        (the 60-seconds winner/judge)
//   - Parley "Auto-matched weekly 1-2-1" rows (the matchups board)
//   - TreasuryObligation rows    (the obligations you add on the board)
//   - ChapterTreasury balance    (only with --balance)
// It never deletes members, leadership terms, or uploaded presentations.

import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'

const args = new Set(process.argv.slice(2))
const DRY = args.has('--dry')
const ALL = args.has('--all')
const BALANCE = args.has('--balance')

const todayStart = new Date()
todayStart.setHours(0, 0, 0, 0)

// run one cleanup step on its own, so a foreign-key error in one doesn't abort the rest
async function step(name: string, count: () => Promise<number>, run: () => Promise<number>) {
  try {
    if (DRY) {
      const n = await count()
      console.log(`  [dry] ${name}: ${n} row${n === 1 ? '' : 's'} would be removed`)
      return
    }
    const n = await run()
    console.log(`  ${name}: removed ${n} row${n === 1 ? '' : 's'}`)
  } catch (e) {
    console.warn(`  ${name}: SKIPPED (${(e as Error).message.split('\n')[0]})`)
  }
}

async function main() {
  console.log(
    `Cleaning stage data for chapter ${chapterId}${DRY ? ' (dry run)' : ''}${ALL ? ' — ALL time' : ' — today only'}`
  )

  // 1) Guiding Light rounds (clears the 60-seconds winner + judge)
  const glWhere = ALL ? { chapterId } : { chapterId, meetingDate: { gte: todayStart } }
  await step(
    'GuidingLight rounds',
    () => prisma.guidingLight.count({ where: glWhere }),
    async () => (await prisma.guidingLight.deleteMany({ where: glWhere })).count
  )

  // 2) Auto-matched parleys (the matchups board source)
  const pWhere = ALL
    ? { chapterId, notes: 'Auto-matched weekly 1-2-1' }
    : { chapterId, notes: 'Auto-matched weekly 1-2-1', createdAt: { gte: todayStart } }
  await step(
    'Matchups (auto-matched parleys)',
    () => prisma.parley.count({ where: pWhere }),
    async () => (await prisma.parley.deleteMany({ where: pWhere })).count
  )

  // 3) Treasury obligations
  await step(
    'Treasury obligations',
    () => prisma.treasuryObligation.count({ where: { chapterId } }),
    async () => (await prisma.treasuryObligation.deleteMany({ where: { chapterId } })).count
  )

  // 4) Treasury balance (only when asked)
  if (BALANCE) {
    await step(
      'ChapterTreasury balance',
      () => prisma.chapterTreasury.count({ where: { chapterId } }),
      async () => (await prisma.chapterTreasury.deleteMany({ where: { chapterId } })).count
    )
  } else {
    console.log('  ChapterTreasury balance: left as-is (pass --balance to clear it)')
  }

  console.log(DRY ? 'Dry run complete — nothing was deleted.' : 'Stage data cleaned.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
