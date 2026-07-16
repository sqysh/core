'use server'

// Active player attempts the whole phrase. Correct → reveal all, that team's
// total decides nothing (they win outright); wrong → turn passes.

import prisma from '@/prisma/client'
import { auth } from '@/app/lib/auth'
import { pusher } from '@/app/lib/pusher/pusher'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import { GameActionResult } from '@/types/game.types'
import { GAME_SELECT, serializeGame } from '../../../games/serializeGame'
import { WheelState } from '@/types/_wheel.types'
import { applySolve } from '../../../games/wheel/logic'
import { channelFor, GAME_EVENTS } from '../../../games/registry'
import { createLog } from '@/app/lib/utils/api/createLog'

export async function solvePhrase(gameId: string, attempt: string): Promise<GameActionResult> {
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

    // On a correct solve, the solver's team wins outright regardless of money.
    const outcome = applySolve(state, attempt, players.length)
    const finalState = outcome.correct ? { ...outcome.state, winner: active.team as 'A' | 'B' } : outcome.state

    const updated = await prisma.game.update({
      where: { id: gameId },
      data: { state: finalState as object, status: outcome.correct ? 'FINISHED' : 'PLAYING' },
      select: GAME_SELECT
    })

    const data = serializeGame<WheelState>(updated)
    await pusher.trigger(channelFor('WHEEL'), GAME_EVENTS.STATE_CHANGED, {
      ...data,
      lastSolve: { by: active.name, team: active.team, correct: outcome.correct }
    })

    return { success: true, data }
  } catch (error) {
    await createLog('error', 'solvePhrase failed', {
      name: 'WheelSolvePhraseError',
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: 'Failed to submit solve' }
  }
}
