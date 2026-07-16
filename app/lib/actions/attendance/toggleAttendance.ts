'use server'

import { auth } from '@/app/lib/auth'
import prisma from '@/prisma/client'
import { createLog } from '../../utils/api/createLog'

export async function toggleAttendance({
  meetingId,
  userId,
  attended
}: {
  meetingId: string
  userId: string
  attended: boolean
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    })

    if (attended) {
      // Remove attendance
      await prisma.attendance.deleteMany({
        where: { meetingId, userId }
      })
      await createLog('info', `${session.user.name} removed attendance for ${user?.name} `, {
        action: 'TOGGLE_ATTENDANCE',
        userId,
        meetingId,
        attended: false
      })
    } else {
      // Add attendance
      await prisma.attendance.upsert({
        where: { meetingId_userId: { meetingId, userId } },
        create: { meetingId, userId },
        update: {}
      })
      await createLog('info', `${session.user.name} marked ${user?.name} as attended`, {
        action: 'TOGGLE_ATTENDANCE',
        userId,
        meetingId,
        attended: true
      })
    }

    return { success: true }
  } catch (err) {
    console.error('[toggleAttendance]', err)
    return { success: false, error: 'Failed to toggle attendance' }
  }
}
