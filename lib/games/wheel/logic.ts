// Pure Wheel of Fortune logic. No DB, no Pusher, no auth — state in, new state
// out. The actions persist/broadcast and call these. All money + turn rules
// live here so the JSON blob only ever changes in one place.

import { WHEEL, VOWEL_COST, isVowel, isConsonant, teamTotal } from '@/types/_wheel.types'
import type { WheelState, Wedge, Winner } from '@/types/_wheel.types'
import type { Team } from '@/types/game.types'

const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '')

export function isPhraseSolved(phrase: string, revealed: Set<string>): boolean {
  for (const ch of phrase) {
    if (ch === ' ') continue
    if (!revealed.has(ch)) return false
  }
  return true
}

function decideWinner(state: WheelState): Winner {
  const a = teamTotal(state, 'A')
  const b = teamTotal(state, 'B')
  return a === b ? 'TIE' : a > b ? 'A' : 'B'
}

function addRoundMoney(state: WheelState, team: Team, amount: number): Partial<WheelState> {
  return team === 'A' ? { roundMoneyA: state.roundMoneyA + amount } : { roundMoneyB: state.roundMoneyB + amount }
}

function wipeRoundMoney(team: Team): Partial<WheelState> {
  return team === 'A' ? { roundMoneyA: 0 } : { roundMoneyB: 0 }
}

// ── SPIN ─────────────────────────────────────────────────────────────────────
export interface SpinOutcome {
  state: WheelState
  wedge: Wedge
  wedgeIndex: number
  // Did the spin end the player's turn on its own (Bankrupt / Lose a Turn)?
  turnEnded: boolean
}

/**
 * Spin the wheel. Server-only (caller picks no randomness — this does).
 * - Bankrupt → wipe round money, turn passes.
 * - Lose a Turn → turn passes.
 * - Value → phase becomes AWAITING_GUESS; player will guess a consonant.
 */
export function applySpin(state: WheelState, team: Team, playerCount: number): SpinOutcome {
  const wedgeIndex = Math.floor(Math.random() * WHEEL.length)
  const wedge = WHEEL[wedgeIndex]
  const nonce = state.spinNonce + 1

  if (wedge === 'BANKRUPT') {
    return {
      wedge,
      wedgeIndex,
      turnEnded: true,
      state: {
        ...state,
        ...wipeRoundMoney(team),
        lastSpin: wedge,
        lastSpinIndex: wedgeIndex,
        spinNonce: nonce,
        phase: 'AWAITING_SPIN',
        turnIndex: (state.turnIndex + 1) % playerCount
      }
    }
  }

  if (wedge === 'LOSE_TURN') {
    return {
      wedge,
      wedgeIndex,
      turnEnded: true,
      state: {
        ...state,
        lastSpin: wedge,
        lastSpinIndex: wedgeIndex,
        spinNonce: nonce,
        phase: 'AWAITING_SPIN',
        turnIndex: (state.turnIndex + 1) % playerCount
      }
    }
  }

  // Dollar value — wait for a consonant guess.
  return {
    wedge,
    wedgeIndex,
    turnEnded: false,
    state: {
      ...state,
      lastSpin: wedge,
      lastSpinIndex: wedgeIndex,
      spinNonce: nonce,
      phase: 'AWAITING_GUESS'
    }
  }
}

// ── GUESS A CONSONANT (after a value spin) ────────────────────────────────────
export interface GuessOutcome {
  state: WheelState
  hit: boolean
  occurrences: number
  solved: boolean
}

export function applyConsonant(
  state: WheelState,
  rawLetter: string,
  team: Team,
  playerCount: number
): GuessOutcome | { error: string } {
  if (state.phase !== 'AWAITING_GUESS' || typeof state.lastSpin !== 'number') {
    return { error: 'Spin first' }
  }
  const letter = rawLetter.trim().toUpperCase()
  if (!isConsonant(letter)) return { error: 'Pick a consonant (vowels are bought)' }

  const guessed = new Set(state.guessed)
  if (guessed.has(letter)) return { error: 'That letter was already used' }

  const occurrences = state.phrase.split('').filter((c) => c === letter).length
  const hit = occurrences > 0

  const revealed = new Set(state.revealed)
  if (hit) revealed.add(letter)
  guessed.add(letter)

  const value = state.lastSpin // dollar value from the spin
  let next: WheelState = {
    ...state,
    revealed: Array.from(revealed),
    guessed: Array.from(guessed),
    lastSpin: null
  }

  if (hit) {
    next = { ...next, ...addRoundMoney(state, team, value * occurrences) }
    const solved = isPhraseSolved(state.phrase, revealed)
    if (solved) {
      next = { ...next, phase: 'AWAITING_SPIN', winner: decideWinner({ ...next }) }
      return { state: next, hit, occurrences, solved: true }
    }
    // Correct → keep the turn, spin again.
    next = { ...next, phase: 'AWAITING_SPIN' }
    return { state: next, hit, occurrences, solved: false }
  }

  // Wrong → pass the turn.
  next = {
    ...next,
    phase: 'AWAITING_SPIN',
    turnIndex: (state.turnIndex + 1) % playerCount
  }
  return { state: next, hit, occurrences, solved: false }
}

// ── BUY A VOWEL ($250 flat, no spin) ──────────────────────────────────────────
export interface VowelOutcome {
  state: WheelState
  hit: boolean
  occurrences: number
  solved: boolean
}

export function applyVowel(state: WheelState, rawLetter: string, team: Team): VowelOutcome | { error: string } {
  if (state.phase !== 'AWAITING_SPIN') return { error: 'Finish your spin first' }
  const letter = rawLetter.trim().toUpperCase()
  if (!isVowel(letter)) return { error: 'That is not a vowel' }

  const guessed = new Set(state.guessed)
  if (guessed.has(letter)) return { error: 'That vowel was already used' }

  const round = team === 'A' ? state.roundMoneyA : state.roundMoneyB
  if (round < VOWEL_COST) return { error: 'Not enough money to buy a vowel ($250)' }

  const occurrences = state.phrase.split('').filter((c) => c === letter).length
  const hit = occurrences > 0

  const revealed = new Set(state.revealed)
  if (hit) revealed.add(letter)
  guessed.add(letter)

  // Pay the cost regardless of hit/miss.
  const pay =
    team === 'A' ? { roundMoneyA: state.roundMoneyA - VOWEL_COST } : { roundMoneyB: state.roundMoneyB - VOWEL_COST }

  let next: WheelState = {
    ...state,
    ...pay,
    revealed: Array.from(revealed),
    guessed: Array.from(guessed)
  }

  if (hit && isPhraseSolved(state.phrase, revealed)) {
    next = { ...next, winner: decideWinner({ ...next }) }
    return { state: next, hit, occurrences, solved: true }
  }

  // Buying a vowel keeps the turn (correct or not) — player still owes a spin or solve.
  return { state: next, hit, occurrences, solved: false }
}

// ── SOLVE THE PHRASE ──────────────────────────────────────────────────────────
export interface SolveOutcome {
  state: WheelState
  correct: boolean
}

export function applySolve(state: WheelState, attempt: string, playerCount: number): SolveOutcome {
  const correct = normalize(attempt) === normalize(state.phrase)
  if (correct) {
    const allLetters = Array.from(new Set(state.phrase.replace(/[^A-Z]/g, '').split('')))
    const revealed = { ...state, revealed: allLetters }
    return { correct: true, state: { ...revealed, phase: 'AWAITING_SPIN', winner: decideWinner(revealed) } }
  }
  return {
    correct: false,
    state: { ...state, phase: 'AWAITING_SPIN', turnIndex: (state.turnIndex + 1) % playerCount }
  }
}

export function isFinished(state: WheelState): boolean {
  return state.winner !== null
}
