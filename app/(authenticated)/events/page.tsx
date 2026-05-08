// app/events/page.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth'
import prisma from '@/prisma/client'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import EventsClient from './EventsClient'

export default async function EventsPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login?callbackUrl=/events')

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
