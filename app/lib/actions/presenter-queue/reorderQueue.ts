'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth/auth'
import { chapterId } from '../../constants/api/chapterId'

export async function reorderQueue(id: string, newIndex: number) {
  const session = await auth()
  if (!session?.user?.id) return { success: false }

  const all = await prisma.presenterQueue.findMany({
    where: { chapterId },
    orderBy: { position: 'asc' }
  })

  const currentIndex = all.findIndex((q) => q.id === id)
  if (currentIndex === -1) return { success: false }

  const reordered = [...all]
  const [item] = reordered.splice(currentIndex, 1)
  reordered.splice(newIndex, 0, item)

  // Step 1 — set all to temp negative positions to avoid conflicts
  await Promise.all(
    reordered.map((q, i) =>
      prisma.presenterQueue.update({
        where: { id: q.id },
        data: { position: -(i + 1) }
      })
    )
  )

  // Step 2 — set real positions
  await Promise.all(
    reordered.map((q, i) =>
      prisma.presenterQueue.update({
        where: { id: q.id },
        data: { position: i }
      })
    )
  )

  return { success: true }
}
