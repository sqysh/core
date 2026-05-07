'use server'

import prisma from '@/prisma/client'
import { pusher } from '../pusher'

export async function triggerReaction(emoji: string) {
  // const today = new Date()
  // const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  // const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

  const visitorDay = await prisma.visitorDay.findFirst({
    // where: { date: { gte: start, lt: end } },
    select: { id: true, reactionCount: true }
  })

  const updatedDay = visitorDay
    ? await prisma.visitorDay.update({
        where: { id: visitorDay.id },
        data: { reactionCount: { increment: 1 } },
        select: { reactionCount: true }
      })
    : null

  await pusher.trigger('visitor-reactions', 'reaction', {
    emoji,
    count: updatedDay?.reactionCount ?? 0
  })
}
