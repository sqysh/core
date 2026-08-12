'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'

export async function updatePreviousWinner(winnerId: string) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }

  const last = await prisma.guidingLight.findFirst({
    where: { chapterId, status: 'REVEALED' },
    orderBy: { meetingDate: 'desc' },
    select: { id: true }
  })

  if (!last) return { success: false, error: 'No revealed record found' }

  await prisma.guidingLight.update({
    where: { id: last.id },
    data: { winnerId }
  })

  return { success: true }
}
