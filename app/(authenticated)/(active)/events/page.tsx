import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import EventsClient from './EventsClient'

export default async function EventsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=/events')

  const events = await prisma.event
    .findMany({
      where: { chapterId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        org: true,
        description: true,
        externalLink: true,
        status: true,
        createdAt: true
      }
    })
    .catch(() => [])

  return <EventsClient events={events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))} />
}
