'use server'

// Shared. Creates a new game of a given type in LOBBY, wiping any prior game for
// the chapter (one live game at a time). Seeds the initial `state` blob based on
// type. Broadcasts GAME_RESET on the type's channel so screens re-fetch.

import prisma from '@/prisma/client'
import { auth } from '@/app/lib/auth'
import { pusher } from '@/app/lib/pusher/pusher'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import { serializeGame, GAME_SELECT } from '@/app/lib/games/serializeGame'
import { GAME_EVENTS, channelFor } from '@/app/lib/games/registry'
import type { GameActionResult, GameType } from '@/types/game.types'
import { pickPhrase } from '@/app/lib/games/wheel/phrases'
import { initialWheelState } from '@/types/_wheel.types'
import { createLog } from '../../utils/api/createLog'

/** Build the starting `state` blob for a given game type. */
function initialStateFor(type: GameType) {
  switch (type) {
    case 'WHEEL': {
      const p = pickPhrase()
      return initialWheelState(p.text, p.hint)
    }
    default:
      return {}
  }
}

export async function createGame(type: GameType): Promise<GameActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }
    if (session.user.role !== 'SUPER_USER') {
      return { success: false, error: 'Not allowed' }
    }

    await prisma.game.deleteMany({ where: { chapterId } })

    const game = await prisma.game.create({
      data: {
        chapterId,
        type,
        status: 'LOBBY',
        state: initialStateFor(type) as object
      },
      select: GAME_SELECT
    })

    await pusher.trigger(channelFor(type), GAME_EVENTS.GAME_RESET, { gameId: game.id })

    return { success: true, data: serializeGame(game) }
  } catch (error) {
    await createLog('error', 'createGame failed', {
      name: 'GameCreateError',
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: 'Failed to create game' }
  }
}
