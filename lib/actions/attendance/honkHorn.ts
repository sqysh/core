'use server'

import { auth } from '@/lib/auth/auth'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { pusher } from '@/lib/pusher/pusher'
import { HONK_CHANNEL, HONK_COOLDOWN_MS, HONK_EVENT } from '@/lib/constants/honk.constants'

// Best effort: each server instance keeps its own clock, which is plenty to stop a thumb held on a button
const lastSent = new Map<string, number>()

export async function honkHorn(): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: 'Not signed in' }

  const now = Date.now()
  if (now - (lastSent.get(userId) ?? 0) < HONK_COOLDOWN_MS) return { success: false, error: 'Slow down' }
  lastSent.set(userId, now)

  // only a boat that's in the harbor can honk, so the member has to be checked in today
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const here = await prisma.attendance.findFirst({
    where: { userId, meeting: { chapterId, date: start } },
    select: { id: true }
  })
  if (!here) return { success: false, error: 'Check in first' }

  try {
    await pusher.trigger(HONK_CHANNEL, HONK_EVENT, { userId })
    return { success: true }
  } catch {
    return { success: false, error: 'Could not reach the display' }
  }
}
