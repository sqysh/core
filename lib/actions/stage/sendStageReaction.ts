'use server'

import { auth } from '@/lib/auth/auth'
import { pusher } from '@/lib/pusher/pusher'
import {
  REACTION_COOLDOWN_MS,
  REACTION_EMOJIS,
  REACTIONS_CHANNEL,
  REACTIONS_EVENT
} from '@/lib/constants/reactions.constants'

// Best effort: each server instance keeps its own clock, which is plenty to stop a thumb held on a button
const lastSent = new Map<string, number>()

export async function sendStageReaction(emoji: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: 'Not signed in' }

  if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) return { success: false, error: 'Unknown reaction' }

  const now = Date.now()
  if (now - (lastSent.get(userId) ?? 0) < REACTION_COOLDOWN_MS) return { success: false, error: 'Slow down' }
  lastSent.set(userId, now)

  try {
    await pusher.trigger(REACTIONS_CHANNEL, REACTIONS_EVENT, { emoji })
    return { success: true }
  } catch {
    return { success: false, error: 'Could not reach the display' }
  }
}
