'use server'

import { auth } from '@/lib/auth/auth'
import prisma from '@/prisma/client'

export async function toggleGuidingLightNominee(guidingLightId: string, userId: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  const existing = await prisma.guidingLightNominee.findUnique({
    where: { guidingLightId_userId: { guidingLightId, userId } }
  })

  if (existing) {
    await prisma.guidingLightNominee.delete({ where: { id: existing.id } })
    return { success: true, action: 'removed' }
  }

  await prisma.guidingLightNominee.create({
    data: { guidingLightId, userId }
  })

  return { success: true, action: 'added' }
}
