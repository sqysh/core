// seed-game-test.js
//
// Sets up test data so you can play the wheel game solo. Creates a few ACTIVE
// test members and checks them into TODAY's meeting (matching getLobby's query:
// a Meeting whose date falls in today's local-day range, plus an Attendance row
// per member).
//
// Run:   node seed-game-test.js            (create test data)
//        node seed-game-test.js --clean    (remove the test data again)
//
// Needs DATABASE_URL in env. If it's in .env:
//        node -r dotenv/config seed-game-test.js
//
// Run from inside the CORE project so it uses the project's generated Prisma
// client and your real schema.
import prisma from '../prisma/client.ts'
import { chapterId } from '../app/lib/constants/api/chapterId.ts'

// ── Your chapterId — must match app/lib/constants/api/chapterId ──────────────
// Paste the same value your app uses. The script can't import the TS constant,
// so set it here.
const CHAPTER_ID = process.env.CHAPTER_ID || chapterId

// Test members. Emails are tagged so --clean can find and remove them.
const TEST_MEMBERS = [
  { name: 'Greg Row', email: 'rowgregory@gmail.com', company: 'Sqysh' },
  { name: 'Devon Hunt', email: 'greg@sqysh.com', company: 'The Iron Roses' },
  { name: 'Jordan Vale', email: 'dev.mhdcustom@gmail.com', company: 'MHD Custom' },
  { name: 'Casey Bloom', email: 'dev.educf@gmail.com', company: 'Education Comes First' }
]

const TEST_EMAIL_TAG = '@core-game.local'

function todayMidnightLocal() {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

async function seed() {
  //   if (CHAPTER_ID === chapterId) {
  //     console.error('✋ Set CHAPTER_ID at the top of the script (or via env) first.')
  //     process.exit(1)
  //   }

  console.log('Seeding test members…')

  // 1. Upsert the test users as ACTIVE members.
  const users = []
  for (const m of TEST_MEMBERS) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: { name: m.name, company: m.company, membershipStatus: 'ACTIVE' },
      create: {
        name: m.name,
        email: m.email,
        company: m.company,
        membershipStatus: 'ACTIVE',
        role: 'MEMBER',
        chapter: { connect: { id: CHAPTER_ID } }
      }
    })
    users.push(user)
    console.log(`  • ${user.name} (${user.email})`)
  }

  // 2. Ensure TODAY's meeting exists (stored at local midnight, matching checkIn).
  const date = todayMidnightLocal()
  let meeting = await prisma.meeting.findFirst({
    where: { chapterId: CHAPTER_ID, date }
  })
  if (!meeting) {
    meeting = await prisma.meeting.create({ data: { chapterId: CHAPTER_ID, date } })
    console.log(`  • Created today's meeting (${date.toDateString()})`)
  } else {
    console.log(`  • Using existing meeting (${date.toDateString()})`)
  }

  // 3. Check each test member into today's meeting.
  for (const user of users) {
    await prisma.attendance.upsert({
      where: { meetingId_userId: { meetingId: meeting.id, userId: user.id } },
      update: {},
      create: { meetingId: meeting.id, userId: user.id }
    })
  }
  console.log(`  • Checked in ${users.length} members.`)

  console.log('\n✅ Done. Open the TV at /games?view=tv and phones at /games.')
  console.log('   Log into each phone window as a different test member:')
  TEST_MEMBERS.forEach((m) => console.log(`     - ${m.email}`))
  console.log('\n   (Use the magic-link / Google flow as usual, or however you')
  console.log('   normally sign in locally. Each needs its own browser/incognito')
  console.log('   window so they have separate sessions.)')
}

async function clean() {
  console.log('Removing test data…')

  const testUsers = await prisma.user.findMany({
    where: { email: { contains: TEST_EMAIL_TAG } },
    select: { id: true, email: true }
  })
  const ids = testUsers.map((u) => u.id)

  if (ids.length) {
    // Attendance rows for these users (any meeting).
    await prisma.attendance.deleteMany({ where: { userId: { in: ids } } })
    // Any game players referencing them (in case a game is mid-flight).
    await prisma.gamePlayer.deleteMany({ where: { userId: { in: ids } } }).catch(() => {})
    await prisma.user.deleteMany({ where: { id: { in: ids } } })
    console.log(`  • Removed ${ids.length} test members and their attendance.`)
  } else {
    console.log('  • No test members found.')
  }

  // Optional: clear any active game so you start fresh.
  await prisma.game.deleteMany({ where: { chapterId: CHAPTER_ID } }).catch(() => {})
  console.log('  • Cleared any active game for the chapter.')

  console.log('\n✅ Clean.')
}

const mode = process.argv.includes('--clean') ? clean : seed

mode()
  .catch((e) => {
    console.error('Error:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
