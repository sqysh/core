import { auth } from '@/app/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import { SuperEventsClient } from './SuperEventsClient'

export const dynamic = 'force-dynamic'

export default async function SuperEventsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'SUPER_USER') redirect('/dashboard')

  const events = await prisma.event.findMany({
    where: { chapterId },
    select: {
      id: true,
      name: true,
      org: true,
      description: true,
      externalLink: true,
      status: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })

  const serialized = events.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString()
  }))

  return <SuperEventsClient events={serialized} />
}
