// app/lib/games/game.types.ts
//
// Shared, game-agnostic types. Anything wheel-specific lives in
// lib/games/wheel/wheel.types.ts instead.

export type GameType = 'WHEEL' // add 'WORD_CLOUD' | 'TRIVIA' as you build them
export type GameStatus = 'LOBBY' | 'PLAYING' | 'FINISHED'
export type Team = 'A' | 'B'

export interface SerializedPlayer {
  id: string
  userId: string
  name: string
  team: Team
  turnOrder: number
}

/**
 * The base game shape every client receives. `state` is the game-specific blob
 * — callers narrow it with a per-game type (e.g. WheelState) based on `type`.
 */
export interface SerializedGame<TState = unknown> {
  id: string
  type: GameType
  status: GameStatus
  state: TState
  players: SerializedPlayer[]
  /** The player whose turn it is, or null when not PLAYING. */
  activePlayer: SerializedPlayer | null
}

/** A lobby member pulled from today's attendance, pre-draft. */
export interface LobbyMember {
  userId: string
  name: string
  profileImage: string | null
  profileVideo: string | null
}

export type GameActionResult = {
  success: boolean
  data?: SerializedGame<unknown>
  error?: string
}
