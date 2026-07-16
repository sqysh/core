'use server'

// Active player buys a vowel for $250 flat from round money (no spin). Reveals
// immediately on a hit; keeps the turn either way (they still owe a spin/solve).

import prisma from '@/prisma/client'
import { auth } from '@/app/lib/auth'
import { pusher } from '@/app/lib/pusher/pusher'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import { serializeGame, GAME_SELECT } from '@/app/lib/games/serializeGame'
import { GAME_EVENTS, channelFor } from '@/app/lib/games/registry'
import { applyVowel } from '@/app/lib/games/wheel/logic'
import { GameActionResult } from '@/types/game.types'
import { WheelState } from '@/types/_wheel.types'
import { createLog } from '../../../utils/api/createLog'

export async function buyVowel(gameId: string, rawLetter: string): Promise<GameActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const game = await prisma.game.findFirst({
      where: { id: gameId, chapterId, type: 'WHEEL' },
      select: GAME_SELECT
    })
    if (!game) return { success: false, error: 'Game not found' }
    if (game.status !== 'PLAYING') return { success: false, error: 'Game is not in progress' }

    const players = [...game.players].sort((a, b) => a.turnOrder - b.turnOrder)
    const state = game.state as unknown as WheelState

    const active = players.find((p) => p.turnOrder === state.turnIndex)
    if (!active) return { success: false, error: 'No active player' }
    if (active.userId !== session.user.id) return { success: false, error: "It's not your turn" }

    const outcome = applyVowel(state, rawLetter, active.team as 'A' | 'B')
    if ('error' in outcome) return { success: false, error: outcome.error }

    const updated = await prisma.game.update({
      where: { id: gameId },
      data: { state: outcome.state as object, status: outcome.solved ? 'FINISHED' : 'PLAYING' },
      select: GAME_SELECT
    })

    const data = serializeGame<WheelState>(updated)
    await pusher.trigger(channelFor('WHEEL'), GAME_EVENTS.STATE_CHANGED, {
      ...data,
      lastVowel: { letter: rawLetter.toUpperCase(), hit: outcome.hit, team: active.team, by: active.name }
    })

    return { success: true, data }
  } catch (error) {
    await createLog('error', 'buyVowel failed', {
      name: 'WheelBuyVowelError',
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: 'Failed to buy vowel' }
  }
}
