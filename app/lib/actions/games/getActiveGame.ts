'use server'

// Shared. Any screen calls this on mount / Pusher reconnect to get current
// truth. Returns the latest game of any type, or null.

import prisma from '@/prisma/client'
import { auth } from '@/app/lib/auth/auth'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import { serializeGame, GAME_SELECT } from '@/app/lib/games/serializeGame'
import type { SerializedGame } from '@/types/game.types'
import { createLog } from '../../utils/api/createLog'

type Result = { success: true; data: SerializedGame | null } | { success: false; error: string }

export async function getActiveGame(): Promise<Result> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const game = await prisma.game.findFirst({
      where: { chapterId },
      orderBy: { createdAt: 'desc' },
      select: GAME_SELECT
    })

    return { success: true, data: game ? serializeGame(game) : null }
  } catch (error) {
    await createLog('error', 'getActiveGame failed', {
      name: 'GameGetActiveError',
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: 'Failed to load game' }
  }
}
