'use server'

import { auth } from '@/app/lib/auth'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import { channelFor, GAME_EVENTS } from '@/app/lib/games/registry'
import { GAME_SELECT, serializeGame } from '@/app/lib/games/serializeGame'
import { pusher } from '@/app/lib/pusher/pusher'
import { createLog } from '@/app/lib/utils/api/createLog'
import prisma from '@/prisma/client'
import { WheelState } from '@/types/_wheel.types'

export async function skipTurn(gameId: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  try {
    const game = await prisma.game.findFirst({
      where: { id: gameId, chapterId, type: 'WHEEL' },
      select: GAME_SELECT
    })
    if (!game) return { success: false, error: 'Game not found' }
    if (game.status !== 'PLAYING') return { success: false, error: 'Game is not in progress' }

    const players = [...game.players].sort((a, b) => a.turnOrder - b.turnOrder)
    const state = game.state as unknown as WheelState

    const currentPlayer = players.find((p) => p.turnOrder === state.turnIndex)
    const sameTeam = players.filter((p) => p.team === currentPlayer?.team)
    const currentTeamIdx = sameTeam.findIndex((p) => p.turnOrder === state.turnIndex)
    const nextOnTeam = sameTeam[(currentTeamIdx + 1) % sameTeam.length]
    state.turnIndex = nextOnTeam.turnOrder

    const updated = await prisma.game.update({
      where: { id: gameId },
      data: { state: state as object },
      select: GAME_SELECT
    })

    const data = serializeGame<WheelState>(updated)
    await pusher.trigger(channelFor('WHEEL'), GAME_EVENTS.STATE_CHANGED, {
      ...data
    })

    return { success: true }
  } catch (error) {
    await createLog('error', 'skipTurn failed', {
      name: 'SkipTurnError',
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: 'Failed to skip turn' }
  }
}
