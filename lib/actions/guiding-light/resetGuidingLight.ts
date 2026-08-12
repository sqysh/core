'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'

export async function resetGuidingLight(guidingLightId: string) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }

  // Only reset OPEN rounds — never touch REVEALED records
  const round = await prisma.guidingLight.findUnique({
    where: { id: guidingLightId },
    select: { status: true }
  })

  if (!round || round.status !== 'OPEN') return { success: false, error: 'Can only reset an open round' }

  await prisma.$transaction(async (tx) => {
    await tx.guidingLightNominee.deleteMany({ where: { guidingLightId } })
    await tx.guidingLight.delete({ where: { id: guidingLightId } })
  })

  return { success: true }
}
