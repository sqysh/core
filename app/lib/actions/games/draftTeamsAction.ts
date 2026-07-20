'use server'

/**
 Shared. Splits the locked lobby into teams, writes GamePlayer rows, flips the
 game to PLAYING, and broadcasts TEAMS_DRAFTED on the game's own channel.
 */

import prisma from '@/prisma/client'
import { auth } from '@/app/lib/auth'
import { pusher } from '@/app/lib/pusher/pusher'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import { draftTeams } from '@/app/lib/games/draftTeams'
import { serializeGame, GAME_SELECT } from '@/app/lib/games/serializeGame'
import { GAME_EVENTS, channelFor } from '@/app/lib/games/registry'
import { GameActionResult, LobbyMember } from '@/types/game.types'
import { createLog } from '../../utils/api/createLog'

export async function draftTeamsAction(
  gameId: string,
  members: LobbyMember[],
  guests: { name: string }[]
): Promise<GameActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }
    if (session.user.role !== 'SUPER_USER') {
      return { success: false, error: 'Not allowed' }
    }
    if (members.length < 2) {
      return { success: false, error: 'Need at least two players to draft teams' }
    }

    const existing = await prisma.game.findFirst({
      where: { id: gameId, chapterId },
      select: { id: true, type: true }
    })
    if (!existing) return { success: false, error: 'Game not found' }

    const drafted = draftTeams(members, guests)

    const updated = await prisma.$transaction(async (tx) => {
      await tx.gamePlayer.deleteMany({ where: { gameId } })
      await tx.gamePlayer.createMany({
        data: drafted.map((p) => ({
          gameId,
          userId: p.userId,
          name: p.name,
          team: p.team,
          turnOrder: p.turnOrder
        }))
      })
      return tx.game.update({
        where: { id: gameId },
        data: { status: 'PLAYING' },
        select: GAME_SELECT
      })
    })

    const data = serializeGame(updated)
    await pusher.trigger(channelFor(data.type), GAME_EVENTS.TEAMS_DRAFTED, data)

    return { success: true, data }
  } catch (error) {
    await createLog('error', 'draftTeamsAction failed', {
      name: 'GameDraftError',
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: 'Failed to draft teams' }
  }
}
