'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { pusher } from '@/lib/pusher/pusher'

export async function changeJudge(guidingLightId: string, newJudgeId: string) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }

  const record = await prisma.guidingLight.update({
    where: { id: guidingLightId },
    data: { judgedById: newJudgeId },
    select: {
      judgedBy: { select: { id: true, name: true, company: true, profileImage: true } }
    }
  })

  await pusher.trigger('guiding-light', 'round-opened', {
    guidingLightId,
    judgeId: newJudgeId
  })

  return { success: true, data: record.judgedBy }
}
