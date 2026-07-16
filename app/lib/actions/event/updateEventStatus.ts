'use server'

import { auth } from '@/app/lib/auth'
import prisma from '@/prisma/client'
import { EventStatus } from '@prisma/client'

export async function updateEventStatus(
  id: string,
  status: EventStatus
): Promise<{
  success: boolean
  error?: string
}> {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }

  try {
    await prisma.event.update({
      where: { id },
      data: { status }
    })

    return { success: true }
  } catch (err) {
    console.error('[updateEventStatus]', err)
    return { success: false, error: 'Failed to update event status' }
  }
}
