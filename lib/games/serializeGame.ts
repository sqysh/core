// Turns a Prisma Game (+players) into the SerializedGame shape clients consume.
// `state` passes through as-is (it's already JSON); per-game code casts it to
// its own state type. activePlayer is computed from turnIndex IF the game's
// state carries one — generic games without turns just get null.

import type { SerializedGame, SerializedPlayer, Team, GameType, GameStatus } from '@/types/game.types'

interface RawPlayer {
  id: string
  userId: string
  name: string
  team: string
  turnOrder: number
}
interface RawGame {
  id: string
  type: string
  status: string
  state: unknown
  players: RawPlayer[]
}

export const GAME_SELECT = {
  id: true,
  type: true,
  status: true,
  state: true,
  players: {
    select: { id: true, userId: true, name: true, team: true, turnOrder: true }
  }
} as const

export function serializeGame<TState = unknown>(game: RawGame): SerializedGame<TState> {
  const players: SerializedPlayer[] = [...game.players]
    .sort((a, b) => a.turnOrder - b.turnOrder)
    .map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.name,
      team: p.team as Team,
      turnOrder: p.turnOrder
    }))

  const status = game.status as GameStatus
  const state = (game.state ?? {}) as TState

  // If the state blob has a numeric `turnIndex`, resolve the active player from it.
  let activePlayer: SerializedPlayer | null = null
  if (status === 'PLAYING' && state && typeof state === 'object' && 'turnIndex' in state) {
    const idx = (state as { turnIndex: number }).turnIndex
    activePlayer = players.find((p) => p.turnOrder === idx) ?? null
  }

  return {
    id: game.id,
    type: game.type as GameType,
    status,
    state,
    players,
    activePlayer
  }
}
