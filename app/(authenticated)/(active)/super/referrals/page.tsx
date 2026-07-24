import { auth } from '@/app/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import { SuperReferralsClient } from './SuperReferralsClient'

export const dynamic = 'force-dynamic'

export default async function SuperReferralsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'SUPER_USER') redirect('/dashboard')

  const referrals = await prisma.treasureMap.findMany({
    where: { chapterId },
    select: {
      id: true,
      clientName: true,
      serviceNeeded: true,
      status: true,
      createdAt: true,
      giver: { select: { id: true, name: true, company: true } },
      receiver: { select: { id: true, name: true, company: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const serialized = referrals.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString()
  }))

  return <SuperReferralsClient referrals={serialized} />
}
