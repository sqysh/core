'use client'

// Phone controller for the spin-first WoF flow. The active player's controls
// change with the game phase:
//   AWAITING_SPIN  → big SPIN button (+ Buy Vowel / Solve)
//   SPINNING       → everything locked while the TV wheel turns
//   AWAITING_GUESS → consonant keyboard (vowels disabled — those are bought)
// Everyone else sees a locked "waiting" view. Turn + phase enforced server-side.

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GAME_EVENTS, GAME_REGISTRY } from '@/app/lib/games/registry'
import { spinWheel } from '@/app/lib/actions/games/wheel/spinWheel'
import { guessLetter } from '@/app/lib/actions/games/wheel/guessLetter'
import { buyVowel } from '@/app/lib/actions/games/wheel/buyVowel'
import { solvePhrase } from '@/app/lib/actions/games/wheel/solvePhrase'
import { getActiveGame } from '@/app/lib/actions/games/getActiveGame'
import { isConsonant, VOWEL_COST, VOWELS, WheelState } from '@/types/_wheel.types'
import { Centered, PhoneShell } from '../shared/Shell'
import PhraseBoard from '../PhraseBoard'
import { SerializedGame, Team } from '@/types/game.types'
import { getPusherClient } from '@/app/lib/pusher/pusherClient'

type WheelGame = SerializedGame<WheelState>
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ'.split('')
const TEAM_COLOR: Record<Team, string> = { A: '#38bdf8', B: '#FF6B6B' }

interface Props {
  userId: string
  initialGame: WheelGame | null
}

export default function WheelPhoneClient({ userId, initialGame }: Props) {
  const [game, setGame] = useState<WheelGame | null>(initialGame)
  const [busy, setBusy] = useState(false)
  const [solving, setSolving] = useState(false)
  const [solveText, setSolveText] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Local lock while the TV plays the spin animation (≈4.3s) so the player
  // can't guess before the wheel visibly stops.
  const [spinLock, setSpinLock] = useState(false)

  useEffect(() => {
    const pusher = getPusherClient()
    const channel = pusher.subscribe(GAME_REGISTRY.WHEEL.channel)

    channel.bind_global((eventName: string, data: unknown) => {
      console.log('PHONE received:', eventName, data)
    })

    const onDrafted = (d: WheelGame) => {
      setGame(d)
      setError(null)
    }

    const onStateChanged = (data: WheelGame & { spin?: unknown }) => {
      setGame(data)
      setError(null)
      if ((data as any).spin) {
        // Lock briefly so the keyboard doesn't appear before the TV wheel lands.
        setSpinLock(true)
        setTimeout(() => setSpinLock(false), 4300)
      }
    }

    const onReset = async () => {
      const res = await getActiveGame()
      if (res.success) setGame(res.data as WheelGame | null)
    }

    channel.bind(GAME_EVENTS.TEAMS_DRAFTED, onDrafted)
    channel.bind(GAME_EVENTS.STATE_CHANGED, onStateChanged)
    channel.bind(GAME_EVENTS.GAME_RESET, onReset)

    return () => {
      channel.unbind(GAME_EVENTS.TEAMS_DRAFTED, onDrafted)
      channel.unbind(GAME_EVENTS.STATE_CHANGED, onStateChanged)
      channel.unbind(GAME_EVENTS.GAME_RESET, onReset)
    }
  }, [])

  const me = game?.players.find((p) => p.userId === userId) ?? null
  const myTeam = me?.team ?? null
  const isMyTurn = game?.status === 'PLAYING' && game.activePlayer?.userId === userId
  const s = game?.state
  const guessedSet = new Set(s?.guessed ?? [])
  const revealedSet = new Set(s?.revealed ?? [])
  const myRoundMoney = s ? (myTeam === 'A' ? s.roundMoneyA : myTeam === 'B' ? s.roundMoneyB : 0) : 0
  const canBuyVowel = isMyTurn && s?.phase === 'AWAITING_SPIN' && myRoundMoney >= VOWEL_COST && !spinLock

  async function run(fn: () => Promise<any>) {
    if (busy) return
    setBusy(true)
    const res = await fn()
    if (res && !res.success) setError(res.error)
    setBusy(false)
  }

  // States that aren't "I'm playing"
  if (!game || game.status === 'LOBBY') {
    return (
      <PhoneShell>
        <Centered>
          <p className="font-quicksand font-black text-xl mb-2">Crack the Phrase</p>
          <p className="font-nunito text-white/60 text-sm">Waiting for the host to draft teams.</p>
        </Centered>
      </PhoneShell>
    )
  }
  if (!me) {
    return (
      <PhoneShell>
        <Centered>
          <p className="font-nunito text-white/60 text-sm">You're not in this round — you'll be in the next one.</p>
        </Centered>
      </PhoneShell>
    )
  }
  if (game.status === 'FINISHED' && s) {
    const youWon = s.winner === myTeam
    return (
      <PhoneShell>
        <Centered>
          <p
            className="font-quicksand font-black text-2xl mb-1"
            style={{ color: myTeam ? TEAM_COLOR[myTeam] : '#fff' }}
          >
            {s.winner === 'TIE' ? "It's a tie" : youWon ? 'Your team won' : `Team ${s.winner} won`}
          </p>
          <p className="font-nunito text-white/50 text-sm">The phrase was “{s.phrase}”.</p>
        </Centered>
      </PhoneShell>
    )
  }
  if (!s) return null

  const locked = !isMyTurn || spinLock || busy

  return (
    <PhoneShell>
      <div className="text-center mb-4">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/40">You're on</p>
        <p className="font-quicksand font-black text-xl" style={{ color: myTeam ? TEAM_COLOR[myTeam] : '#fff' }}>
          Team {myTeam} · ${myRoundMoney}
        </p>
      </div>

      <div className="mb-5">
        <PhraseBoard phrase={s.phrase} revealed={s.revealed} compact />
        <p className="text-center font-mono text-[11px] text-white/40 mt-3">Hint: {s.hint}</p>
      </div>

      <div className="text-center mb-4 min-h-6">
        <AnimatePresence mode="wait">
          {!isMyTurn ? (
            <motion.p
              key="wait"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-nunito text-white/55 text-sm"
            >
              {game.activePlayer?.name}’s turn (Team {game.activePlayer?.team})
            </motion.p>
          ) : spinLock ? (
            <motion.p
              key="spinning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-quicksand font-black text-lg text-white/80"
            >
              Watch the wheel…
            </motion.p>
          ) : s.phase === 'AWAITING_GUESS' ? (
            <motion.p
              key="guess"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-quicksand font-black text-lg"
              style={{ color: myTeam ? TEAM_COLOR[myTeam] : '#fff' }}
            >
              ${s.lastSpin} — pick a consonant
            </motion.p>
          ) : (
            <motion.p
              key="spin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-quicksand font-black text-lg"
              style={{ color: myTeam ? TEAM_COLOR[myTeam] : '#fff' }}
            >
              Your turn — spin the wheel
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {error && <p className="text-center font-nunito text-xs text-red-400 mb-3">{error}</p>}

      {/* SPIN phase: big spin button + buy vowel + solve */}
      {isMyTurn && s.phase === 'AWAITING_SPIN' && !spinLock && (
        <div className="space-y-3">
          <button
            onClick={() => run(() => spinWheel(game.id))}
            disabled={busy}
            className="w-full py-5 bg-sky-500 text-white font-quicksand font-black text-xl disabled:opacity-40"
          >
            SPIN
          </button>

          {/* Buy a vowel */}
          <div>
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/40 mb-1 text-center">
              Buy a vowel · ${VOWEL_COST}
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {VOWELS.map((v) => {
                const used = guessedSet.has(v)
                const hit = revealedSet.has(v)
                const disabled = used || !canBuyVowel
                let cls = 'border-white/15 text-white'
                if (used && hit) cls = 'border-sky-400 text-sky-300 bg-sky-400/10'
                else if (used) cls = 'border-white/5 text-white/25 line-through'
                else if (!canBuyVowel) cls = 'border-white/10 text-white/30'
                return (
                  <button
                    key={v}
                    onClick={() => run(() => buyVowel(game.id, v))}
                    disabled={disabled}
                    className={`aspect-square border font-quicksand font-black text-base ${cls}`}
                  >
                    {v}
                  </button>
                )
              })}
            </div>
          </div>

          {!solving ? (
            <button
              onClick={() => setSolving(true)}
              disabled={busy}
              className="w-full py-3 border border-white/20 font-nunito text-sm text-white/80"
            >
              Solve the whole phrase
            </button>
          ) : (
            <SolveBox
              solveText={solveText}
              setSolveText={setSolveText}
              busy={busy}
              onBack={() => {
                setSolving(false)
                setSolveText('')
              }}
              onSolve={() =>
                run(async () => {
                  const r = await solvePhrase(game.id, solveText)
                  if (r.success) {
                    setSolving(false)
                    setSolveText('')
                  }
                  return r
                })
              }
            />
          )}
        </div>
      )}

      {/* GUESS phase: consonant keyboard */}
      {isMyTurn && s.phase === 'AWAITING_GUESS' && !spinLock && (
        <div className="grid grid-cols-7 gap-1.5">
          {CONSONANTS.map((L) => {
            const used = guessedSet.has(L)
            const hit = revealedSet.has(L)
            const disabled = used || locked || !isConsonant(L)
            let cls = 'border-white/15 text-white'
            if (used && hit) cls = 'border-sky-400 text-sky-300 bg-sky-400/10'
            else if (used) cls = 'border-white/5 text-white/25 line-through'
            return (
              <button
                key={L}
                onClick={() => run(() => guessLetter(game.id, L))}
                disabled={disabled}
                className={`aspect-square border font-quicksand font-black text-base ${cls}`}
              >
                {L}
              </button>
            )
          })}
        </div>
      )}

      {/* Locked while spinning */}
      {isMyTurn && spinLock && (
        <div className="text-center py-8 font-nunito text-white/40 text-sm">The wheel is spinning…</div>
      )}
    </PhoneShell>
  )
}

function SolveBox({
  solveText,
  setSolveText,
  busy,
  onBack,
  onSolve
}: {
  solveText: string
  setSolveText: (s: string) => void
  busy: boolean
  onBack: () => void
  onSolve: () => void
}) {
  return (
    <div className="space-y-2">
      <input
        value={solveText}
        onChange={(e) => setSolveText(e.target.value)}
        placeholder="Type the full phrase"
        className="w-full py-3 px-3 bg-white/5 border border-white/20 font-nunito text-white placeholder:text-white/30 focus:outline-none focus:border-sky-400"
      />
      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 py-2.5 border border-white/15 font-nunito text-sm text-white/60">
          Back
        </button>
        <button
          onClick={onSolve}
          disabled={busy || !solveText.trim()}
          className="flex-1 py-2.5 bg-sky-500 text-white font-quicksand font-black disabled:opacity-40"
        >
          Lock it in
        </button>
      </div>
      <p className="font-nunito text-[11px] text-white/40 text-center">Wrong solve passes your turn.</p>
    </div>
  )
}
