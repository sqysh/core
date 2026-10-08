import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { SuperElectionClient } from './SuperElectionClient'

export const dynamic = 'force-dynamic'

export default async function SuperElectionPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'SUPER_USER') redirect('/dashboard')

  const terms = await prisma.leadershipTerm.findMany({
    where: { chapterId },
    orderBy: [{ startDate: 'desc' }, { position: 'asc' }],
    select: {
      id: true,
      position: true,
      startDate: true,
      isActive: true,
      manualOverride: true,
      holder: { select: { id: true, name: true, company: true, profileImage: true } }
    }
  })

  const serialized = terms.map((t) => ({
    ...t,
    startDate: t.startDate.toISOString(),
    year: t.startDate.getUTCFullYear()
  }))

  return <SuperElectionClient terms={serialized} />
}
