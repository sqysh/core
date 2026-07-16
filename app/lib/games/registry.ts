// One place that knows every game type. The hub uses this to pick a channel and
// render the right client; actions use it to resolve a type's Pusher channel.
//
// Adding a new game = add a GameType to game.types.ts, add an entry here, drop
// in its leaf folder. Nothing else in the spine changes.

import { GameType } from '@/types/game.types'

export interface GameMeta {
  /** Pusher channel for this game type — kept separate so games don't cross streams. */
  channel: string
  /** Human label for menus / the hub. */
  label: string
  /** Route segment under /games. */
  route: string
}

export const GAME_REGISTRY: Record<GameType, GameMeta> = {
  WHEEL: {
    channel: 'core-wof',
    label: 'Sqyeel of Fortune',
    route: 'wheel'
  }
  // WORD_CLOUD: { channel: 'core-cloud', label: 'Word Cloud', route: 'cloud' },
}

/** Events are the same across games so the hub/clients can bind generically. */
export const GAME_EVENTS = {
  TEAMS_DRAFTED: 'teams-drafted',
  STATE_CHANGED: 'state-changed', // any in-game mutation (letter, word, answer…)
  GAME_RESET: 'game-reset'
} as const

export type GameEvent = (typeof GAME_EVENTS)[keyof typeof GAME_EVENTS]

export function channelFor(type: GameType): string {
  return GAME_REGISTRY[type].channel
}
