'use server'

import prisma from '@/prisma/client'
import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'

const GREG_ID = 'rzyas8cegrox0w9n3l9p4bf6'
const PAGE_ID = 'cmizav9ql000hy0u41tjgqqko'
const SEED_ID = 'gl_greg_aug08_seed'

export async function seedGuidingLight() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }

  await prisma.$transaction(async (tx) => {
    // Delete any open round (nominees + round)
    const openRound = await tx.guidingLight.findFirst({
      where: { chapterId, status: 'OPEN' },
      select: { id: true }
    })

    if (openRound) {
      await tx.guidingLightNominee.deleteMany({ where: { guidingLightId: openRound.id } })
      await tx.guidingLight.delete({ where: { id: openRound.id } })
    }

    // Upsert the seed record
    await tx.guidingLight.upsert({
      where: { id: SEED_ID },
      create: {
        id: SEED_ID,
        meetingDate: new Date('2026-08-08T07:00:00'),
        winnerId: GREG_ID,
        judgedById: PAGE_ID,
        status: 'REVEALED',
        chapterId
      },
      update: {
        winnerId: GREG_ID,
        judgedById: PAGE_ID,
        status: 'REVEALED'
      }
    })
  })

  return { success: true }
}
