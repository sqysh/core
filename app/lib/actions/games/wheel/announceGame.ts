'use server'

import { auth } from '@/app/lib/auth'
import { pusher } from '@/app/lib/pusher/pusher'
import { GAME_REGISTRY } from '@/app/lib/games/registry'

export async function announceGame(): Promise<{ success: boolean }> {
  const session = await auth()
  // Host-only — don't let members trigger a room-wide redirect
  if (session?.user?.role !== 'SUPER_USER') {
    return { success: false }
  }
  await pusher.trigger(GAME_REGISTRY.WHEEL.channel, 'game-announced', {})
  return { success: true }
}
