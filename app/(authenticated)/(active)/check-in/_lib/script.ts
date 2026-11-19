import type { CheckInResult, SqyshMode, StateKey } from './types'

// ─── Script ───────────────────────────────────────────────────────────────────
// Sqysh floats in, greets, "logs" the attendance, celebrates, then parks on the
// ring and explains it. Everything downstream is timed off `settle`, the second
// the ring starts to draw, so adding a beat to his act shifts the rest along.

export interface Bubble {
  at: number // seconds in
  until: number // seconds the fade-out starts; leave room to read after the typing finishes
  text: (name: string) => string
  dots?: boolean // trailing thinking dots
  parked?: boolean // shown after he's parked on the ring, so it sits higher
}

export interface Script {
  bubbles: Bubble[]
  modes: [number, SqyshMode][]
  settle: number
  headline: string
  sub: string
  clock: boolean
}

export const TYPE_LAG = 0.3 // the bubble pops at `at`; typing starts this much later

// Seconds after settle that Sqysh leaves the ring for the top of the screen
export const TOUR_AT = 7.0

export const EXPLAIN: Bubble = {
  at: 1.0,
  until: 6.6,
  parked: true,
  text: () => 'That’s your attendance this season. Tap the ring to see every Thursday.'
}

export const SCRIPT: Record<StateKey, Script> = {
  ok: {
    bubbles: [
      { at: 0.95, until: 3.0, text: (n) => `Good morning, ${n}.` },
      { at: 3.15, until: 5.6, text: () => 'Logging your attendance', dots: true },
      { at: 5.75, until: 8.3, text: () => 'Done. You’re checked in.' }
    ],
    modes: [
      [0.9, 'wave'],
      [3.1, 'think'],
      [5.7, 'excited'],
      [7.9, 'idle']
    ],
    settle: 8.4,
    headline: "You're checked in.",
    sub: 'Checked in at ',
    clock: true
  },
  again: {
    bubbles: [
      { at: 0.95, until: 3.0, text: (n) => `Welcome back, ${n}.` },
      { at: 3.15, until: 5.2, text: () => 'Checking the log', dots: true },
      { at: 5.35, until: 8.2, text: () => 'You’re already in from earlier.' }
    ],
    modes: [
      [0.9, 'wave'],
      [3.1, 'think'],
      [5.3, 'excited'],
      [7.8, 'idle']
    ],
    settle: 8.3,
    headline: "You're already in.",
    sub: 'Logged earlier at ',
    clock: true
  },
  window: {
    bubbles: [{ at: 0.95, until: 4.3, text: (n) => `Hey, ${n}. Check-in opens Thursday at 7.` }],
    modes: [
      [0.9, 'wave'],
      [2.5, 'idle']
    ],
    settle: 4.5,
    headline: 'See you Thursday.',
    sub: 'Check-in opens Thursdays at 7:00am',
    clock: false
  },
  fail: {
    bubbles: [{ at: 0.95, until: 4.0, text: (n) => `Hey, ${n}. Something went wrong.` }],
    modes: [
      [0.9, 'wave'],
      [2.5, 'idle']
    ],
    settle: 4.2,
    headline: 'Something went wrong.',
    sub: '',
    clock: false
  }
}

// Full literal strings so Tailwind can see them at build time.
export const KEY_VARS: Record<StateKey, string> = {
  ok: '[--key:#a855f7] [--key-soft:rgba(168,85,247,0.32)]',
  again: '[--key:#38bdf8] [--key-soft:rgba(56,189,248,0.32)]',
  window: '[--key:#fbbf24] [--key-soft:rgba(251,191,36,0.32)]',
  fail: '[--key:#f87171] [--key-soft:rgba(248,113,113,0.32)]'
}

export function stateKeyFor(result: CheckInResult): StateKey {
  if (result.success) return result.alreadyCheckedIn ? 'again' : 'ok'
  return result.error?.includes('7:00 AM') ? 'window' : 'fail'
}
