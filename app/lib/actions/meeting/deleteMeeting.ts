'use server'

import { auth } from '@/app/lib/auth'
import prisma from '@/prisma/client'
import { createLog } from '../../utils/api/createLog'

export async function deleteMeeting(id: string): Promise<{
  success: boolean
  error?: string
}> {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }

  try {
    const meeting = await prisma.meeting.findFirst({
      where: { id },
      select: { id: true }
    })

    if (!meeting) return { success: false, error: 'Meeting not found' }

    await prisma.meeting.delete({ where: { id: meeting.id } })

    await createLog('info', `${session.user.name} deleted a meeting`, {
      action: 'DELETE_MEETING',
      meetingId: id
    })

    return { success: true }
  } catch (err) {
    console.error('[deleteMeeting]', err)
    return { success: false, error: 'Failed to delete meeting' }
  }
}
