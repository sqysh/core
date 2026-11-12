'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'
import { pusher } from '@/lib/pusher/pusher'

export async function resetGuidingLight(guidingLightId: string) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }

  const round = await prisma.guidingLight.findUnique({
    where: { id: guidingLightId },
    select: { status: true }
  })

  if (!round || round.status !== 'OPEN') return { success: false, error: 'Can only reset an open round' }

  await prisma.$transaction(async (tx) => {
    await tx.guidingLightNominee.deleteMany({ where: { guidingLightId } })
    await tx.guidingLight.delete({ where: { id: guidingLightId } })
  })

  await pusher.trigger('guiding-light', 'round-reset', { guidingLightId })

  return { success: true }
}
