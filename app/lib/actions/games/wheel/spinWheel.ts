'use server'

// Active player taps Spin. Server picks the wedge (can't trust the phone),
// persists lastSpin + phase, and broadcasts STATE_CHANGED carrying the target
// wedge index so every TV animates to the SAME stopping point.
//
// Bankrupt/Lose-a-Turn resolve immediately (turn passes). A value flips phase to
// AWAITING_GUESS so the phone shows the consonant keyboard once the TV lands.

import prisma from '@/prisma/client'
import { auth } from '@/app/lib/auth'
import { pusher } from '@/app/lib/pusher/pusher'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import { serializeGame, GAME_SELECT } from '@/app/lib/games/serializeGame'
import { GAME_EVENTS, channelFor } from '@/app/lib/games/registry'
import { applySpin } from '@/app/lib/games/wheel/logic'
import type { WheelState } from '@/types/_wheel.types'
import type { GameActionResult } from '@/types/game.types'
import { createLog } from '../../../utils/api/createLog'

export async function spinWheel(gameId: string): Promise<GameActionResult> {
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
    if (state.phase !== 'AWAITING_SPIN') return { success: false, error: 'You already spun' }

    const outcome = applySpin(state, active.team as 'A' | 'B', players.length)

    const updated = await prisma.game.update({
      where: { id: gameId },
      data: { state: outcome.state as object },
      select: GAME_SELECT
    })

    const data = serializeGame<WheelState>(updated)
    await pusher.trigger(channelFor('WHEEL'), GAME_EVENTS.STATE_CHANGED, {
      ...data,
      spin: {
        wedge: outcome.wedge,
        wedgeIndex: outcome.wedgeIndex,
        nonce: outcome.state.spinNonce,
        turnEnded: outcome.turnEnded,
        by: active.name,
        team: active.team
      }
    })

    return { success: true, data }
  } catch (error) {
    await createLog('error', 'spinWheel failed', {
      name: 'WheelSpinError',
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: 'Failed to spin' }
  }
}
