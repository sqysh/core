'use server'

import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { auth } from '../../auth/auth'
import { EventOrg } from '@prisma/client'
import { createLog } from '../../utils/api/createLog'

export async function createEvent(data: { org: EventOrg; name: string; description?: string; externalLink?: string }) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  const event = await prisma.event.create({
    data: {
      org: data.org,
      name: data.name,
      description: data.description ?? null,
      externalLink: data.externalLink ?? null,
      chapterId
    }
  })

  await createLog('info', `Event created — ${data.name} (${data.org})`, {
    location: ['server action - createEvent'],
    name: 'EventCreated',
    timestamp: new Date().toISOString(),
    userId: session.user.id,
    eventId: event.id
  })

  return { success: true, event }
}
