import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { SuperClosedBusinessClient } from './SuperClosedBusinessClient'

export const dynamic = 'force-dynamic'

export default async function SuperClosedBusinessPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'SUPER_USER') redirect('/dashboard')

  const anchors = await prisma.anchor.findMany({
    where: { chapterId },
    select: {
      id: true,
      businessValue: true,
      description: true,
      status: true,
      closedDate: true,
      createdAt: true,
      giver: { select: { id: true, name: true, company: true } },
      receiver: { select: { id: true, name: true, company: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const serialized = anchors.map((a) => ({
    ...a,
    businessValue: a.businessValue.toString(),
    closedDate: a.closedDate.toISOString(),
    createdAt: a.createdAt.toISOString()
  }))

  return <SuperClosedBusinessClient anchors={serialized} />
}
