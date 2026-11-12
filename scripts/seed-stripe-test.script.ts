// Give some members a test stripeCustomerId so the treasurer board shows them set up.
// Run from the project root:  npx tsx --env-file=.env scripts/seed-stripe-test.script.ts

import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'

// How many members get a test customer id. Set to Infinity to give everyone one.
const CARD_COUNT = 6

async function main() {
  const members = await prisma.user.findMany({
    where: { chapterId, membershipStatus: { in: ['ACTIVE', 'APPROVED'] } },
    select: { id: true, name: true, stripeCustomerId: true },
    orderBy: { name: 'asc' }
  })

  const take = members.slice(0, CARD_COUNT)
  let updated = 0

  for (const m of take) {
    const customerId = m.stripeCustomerId ?? `cus_test_${m.id.slice(-8)}`
    await prisma.user.update({ where: { id: m.id }, data: { stripeCustomerId: customerId } })
    updated++
    console.log(`  ${m.name ?? m.id}  ->  ${customerId}`)
  }

  const withCustomer = await prisma.user.count({
    where: { chapterId, membershipStatus: { in: ['ACTIVE', 'APPROVED'] }, stripeCustomerId: { not: null } }
  })
  console.log(`\nUpdated ${updated} member(s). ${withCustomer} of ${members.length} now have a stripeCustomerId.`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
