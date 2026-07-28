import { generateMemberDirectoryPDFBuffer } from '@/lib/utils/reports/generateMemberDirectoryPDFBuffer'
import prisma from '@/prisma/client'
import { NextResponse } from 'next/server'

export async function GET() {
  const users = await prisma.user.findMany({
    where: {
      membershipStatus: 'ACTIVE'
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      company: true,
      industry: true,
      chapter: { select: { name: true } }
    },
    orderBy: { name: 'asc' }
  })

  const sorted = [...users].sort((a, b) => {
    const parts = (name: string) => {
      const p = name.trim().split(' ')
      const first = p[0].toLowerCase()
      const lastInitial = p.length > 1 ? p[p.length - 1][0].toLowerCase() : ''
      return { first, lastInitial }
    }
    const pA = parts(a.name)
    const pB = parts(b.name)
    if (pA.first !== pB.first) return pA.first.localeCompare(pB.first)
    return pA.lastInitial.localeCompare(pB.lastInitial)
  })

  const pdfBuffer = await generateMemberDirectoryPDFBuffer(sorted, {
    title: 'Member Directory',
    subtitle: 'Coastal Referral Exchange',
    chapterName: sorted[0]?.chapter?.name,
    colorScheme: 'nautical'
  })

  const dateStr = new Date().toISOString().slice(0, 10)

  //   NextResponse doesn't accept Node's Buffer directly as BodyInit, but Uint8Array works since it's a proper typed array.
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="CORE-Directory-${dateStr}.pdf"`
    }
  })
}
