'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth'
import { chapterId } from '../../constants/api/chapterId'
import { createLog } from '../../utils/api/createLog'

export async function updateChapter(data: {
  name?: string
  location?: string
  meetingDay?: string
  meetingTime?: string
  meetingFrequency?: string
  hasUnlockedBooty?: boolean
  hasUnlockedGrog?: boolean
  hasUnlockedMuster?: boolean
}) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }

  await prisma.chapter.update({
    where: { id: chapterId },
    data: { ...data, updatedAt: new Date() }
  })

  await createLog('info', `Chapter settings updated by ${session.user.id}`, {
    location: ['server action - updateChapter'],
    name: 'ChapterUpdated',
    timestamp: new Date().toISOString(),
    chapterId
  })

  return { success: true }
}
