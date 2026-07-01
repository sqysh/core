import prisma from '../prisma/client.ts'

// Seeds ONE test member on the dev DB, ready to run through MembershipSetupForm.
// The user is an ACTIVE member with NO Stripe customer yet and both subscription
// flags false — exactly the state the membership setup flow expects.
//
// Run:   node -r dotenv/config seed-test-member.js          (create)
//        node -r dotenv/config seed-test-member.js --clean  (remove)
//
// Point DATABASE_URL at your DEV db (double-check .env is the dev one!).
// Run from inside the CORE project so it uses the generated Prisma client.

// ── Config ──────────────────────────────────────────────────────────────────
// Must match app/lib/constants/api/chapterId — paste your real chapter id, or
// set CHAPTER_ID in env.
const CHAPTER_ID = 'cm3kx7p2q0001abcdefghijk'

const TEST_USER = {
  name: 'Gregory Row',
  email: 'gregory.row87@gmail.com',
  company: 'Sqysh'
}

async function seed() {
  // Fresh dev DBs have no Chapter — create it so the user can connect to it.
  await prisma.chapter.upsert({
    where: { id: CHAPTER_ID },
    update: {},
    create: {
      id: CHAPTER_ID,
      name: 'Coastal Referral Exchange',
      location: 'North Shore, MA',
      meetingDay: 'Thursday',
      meetingTime: '7:00 AM'
      // meetingFrequency defaults to 'WEEKLY'; other fields have defaults
    }
  })
  console.log(`✓ Chapter ready (${CHAPTER_ID})`)

  const user = await prisma.user.upsert({
    where: { email: TEST_USER.email },
    update: {
      // reset to a clean pre-setup state so you can re-run the flow anytime
      name: TEST_USER.name,
      company: TEST_USER.company,
      membershipStatus: 'ACTIVE',
      stripeCustomerId: null,
      hasAnnualSubscription: false,
      hasQuarterlySubscription: false,
      annualSubscriptionId: null,
      quarterlySubscriptionId: null
    },
    create: {
      name: TEST_USER.name,
      email: TEST_USER.email,
      company: TEST_USER.company,
      membershipStatus: 'ACTIVE',
      role: 'MEMBER', // adjust if your Role enum uses a different member value
      hasAnnualSubscription: false,
      hasQuarterlySubscription: false,
      chapter: { connect: { id: CHAPTER_ID } }
    }
  })

  console.log('✅ Test member ready:')
  console.log(`   name:  ${user.name}`)
  console.log(`   email: ${user.email}`)
  console.log(`   id:    ${user.id}`)
  console.log('\nLog in with the magic link sent to gregory.row87@gmail.com,')
  console.log('then run the membership setup flow. Use a Stripe TEST card:')
  console.log('   4242 4242 4242 4242 · any future expiry · any CVC · any ZIP')
  console.log('\nRe-run this script anytime to reset the user to pre-setup state.')
}

async function clean() {
  const existing = await prisma.user.findUnique({
    where: { email: TEST_USER.email },
    select: { id: true }
  })
  if (!existing) {
    console.log('No test user found.')
    return
  }
  // Remove anything that references the user first, if present.
  await prisma.order?.deleteMany?.({ where: { userId: existing.id } }).catch(() => {})
  await prisma.user.delete({ where: { id: existing.id } })
  console.log('✅ Removed test member.')
}

const mode = process.argv.includes('--clean') ? clean : seed

mode()
  .catch((e) => {
    console.error('Error:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
