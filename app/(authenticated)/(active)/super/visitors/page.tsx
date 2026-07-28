import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { SuperVisitorsClient } from './SuperVisitorsClient'

export const dynamic = 'force-dynamic'

export default async function SuperVisitorsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'SUPER_USER') redirect('/dashboard')

  const visitors = await prisma.visitor.findMany({
    where: { chapterId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      company: true,
      industry: true,
      visitDate: true,
      createdAt: true,
      invitedBy: { select: { name: true } }
    },
    orderBy: { visitDate: 'desc' }
  })

  const serialized = (visitors ?? []).map((v) => ({
    id: v.id,
    firstName: v.firstName,
    lastName: v.lastName,
    email: v.email,
    company: v.company,
    industry: v.industry,
    visitDate: v.visitDate.toISOString(),
    createdAt: v.createdAt.toISOString(),
    invitedBy: v.invitedBy ? { name: v.invitedBy.name } : null
  }))

  return <SuperVisitorsClient visitors={serialized} />
}
