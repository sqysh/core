import type { Metadata } from 'next'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { INDUSTRY_SEATS, normalizeIndustry } from '@/lib/constants/public/industries.constants'
import OpenSeatsClient from './OpenSeatsClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Open seats | Coastal Referral Exchange',
  description:
    'One seat per industry on Boston\u2019s North Shore. See which chairs are still open and find out if yours is one of them.',
  openGraph: {
    title: 'Is your seat still open?',
    description: 'One seat per industry. No competition inside the room.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/open-seats`,
    siteName: 'Coastal Referral Exchange',
    type: 'website'
  },
  twitter: { card: 'summary_large_image', title: 'Is your seat still open?' }
}

export default async function OpenSeatsPage() {
  const members = await prisma.user.findMany({
    where: { chapterId, membershipStatus: 'ACTIVE', isPublic: true },
    select: { id: true, name: true, company: true, industry: true, profileImage: true }
  })

  const byIndustry = new Map<string, (typeof members)[number]>()
  for (const m of members) {
    if (m.industry) byIndustry.set(normalizeIndustry(m.industry), m)
  }

  const seats = INDUSTRY_SEATS.map((seat) => {
    const keys = [seat.label, ...(seat.aliases ?? [])].map(normalizeIndustry)
    const holder = keys.map((k) => byIndustry.get(k)).find(Boolean) ?? null

    return {
      label: seat.label,
      search: [seat.label, ...(seat.aliases ?? [])].join(' ').toLowerCase(),
      holder: holder
        ? {
            name: holder.name,
            company: holder.company,
            profileImage: holder.profileImage
          }
        : null
    }
  })

  return <OpenSeatsClient seats={seats} />
}
