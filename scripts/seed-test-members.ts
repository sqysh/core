import { chapterId } from '@/lib/constants/api/chapterId'
import prisma from '@/prisma/client'

const CLEAN = process.argv.includes('--clean')

const MEMBERS = [
  { name: 'Brendan Ward', company: 'Touchstone Law Offices', industry: 'Real Estate Attorney' },
  { name: 'Eileen Jonah', company: 'Century 21 Northeast', industry: 'Residential Real Estate Agent' },
  { name: 'Martin Connolly', company: 'Northwestern Mutual', industry: 'Financial Advisor' },
  { name: 'Page Driscoll', company: 'Commonwealth Payroll & HR', industry: 'Payroll Services' },
  { name: 'Kerry Casey', company: 'CCM', industry: 'Loan Officer' },
  { name: 'Alex Argeros', company: 'Prudential', industry: 'Life Insurance' },
  { name: 'Angela Turpin', company: 'Zellik Insurance', industry: 'Property & Casualty Insurance' },
  { name: 'Jackson Rogers', company: 'MHD Custom', industry: 'Custom Cabinetry and Millwork' },
  { name: 'Christopher Leone', company: 'CPL Accounting', industry: 'Accountant' },
  { name: 'Dennis Ford Eagan', company: 'Eagan Law', industry: 'Lawyer' },
  { name: 'Anna Roy', company: 'Koiles Law', industry: 'Legal' },
  { name: 'Jake VanMeter', company: 'VanMeter Commercial', industry: 'Commercial Real Estate Agent' },
  { name: 'Brian Theirrien', company: 'Boys & Girls Club of Lynn', industry: 'Non-Profit Director' },
  { name: 'Cesar Velezliriano', company: 'Eastern Bank', industry: 'Bank Manager' }
]

const TEST_DOMAIN = 'seed.coretest.local'
const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, '.')

async function main() {
  if (CLEAN) {
    const { count } = await prisma.user.deleteMany({
      where: { chapterId, email: { endsWith: `@${TEST_DOMAIN}` } }
    })
    console.log(`Deleted ${count} seeded members.`)
    return
  }

  // Guard against ever running this against the real database
  const realMembers = await prisma.user.count({
    where: { chapterId, membershipStatus: 'ACTIVE', email: { not: { endsWith: `@${TEST_DOMAIN}` } } }
  })

  if (realMembers > 1) {
    console.log(`Found ${realMembers} non-seed active members. This looks like production. Aborting.`)
    return
  }

  console.log(`Seeding ${MEMBERS.length} members\n`)

  for (const m of MEMBERS) {
    const email = `${slug(m.name)}@${TEST_DOMAIN}`

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        ...m,
        email,
        chapterId,
        membershipStatus: 'ACTIVE',
        role: 'MEMBER',
        isPublic: true
      },
      update: { ...m, membershipStatus: 'ACTIVE' },
      select: { id: true, name: true }
    })

    console.log(`  ✓ ${user.name}`)
  }

  const total = await prisma.user.count({ where: { chapterId, membershipStatus: 'ACTIVE' } })
  console.log(`\n${total} active members total.`)
}

main()
  .catch((e) => {
    console.error('Fatal:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
