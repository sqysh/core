'use client'

// Wheel-of-Fortune TV view with the spinning wheel + two-pot money model.
// Lobby → draft animation → live board. When a SPIN broadcast arrives, the
// wheel animates to the wedge; when it settles, the board state (already updated
// server-side) is shown — phones unlock for the consonant guess if it was a value.

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LobbyMember, SerializedGame } from '@/types/game.types'
import { Wedge, WheelState } from '@/types/_wheel.types'
import { GAME_EVENTS, GAME_REGISTRY } from '@/app/lib/games/registry'
import { getActiveGame } from '@/app/lib/actions/games/getActiveGame'
import { createGame } from '@/app/lib/actions/games/createGame'
import { getLobby } from '@/app/lib/actions/games/getLobby'
import { draftTeamsAction } from '@/app/lib/actions/games/draftTeamsAction'
import { GameHeader, TVShell } from '../shared/Shell'
import Wheel from './Wheel'
import TeamRoster from '../TeamRoster'
import DraftAnimation from '../DraftAnimation'
import LetterTray from '../LetterTray'
import PhraseBoard from '../PhraseBoard'
import { getPusherClient } from '@/app/lib/pusher/pusherClient'
import { useSounds } from '@/app/lib/hooks/useSounds'

type WheelGame = SerializedGame<WheelState>

interface Props {
  initialGame: WheelGame | null
  initialLobby: LobbyMember[]
}

interface SpinInfo {
  wedge: Wedge
  wedgeIndex: number
  nonce: number
  turnEnded: boolean
  by: string
  team: 'A' | 'B'
}

export default function WheelTVClient({ initialGame, initialLobby }: Props) {
  const [game, setGame] = useState<WheelGame | null>(initialGame)
  const [lobby, setLobby] = useState<LobbyMember[]>(initialLobby)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [drafting, setDrafting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [spin, setSpin] = useState<SpinInfo | null>(null)
  const [spinning, setSpinning] = useState(true)
  // Wheel size for the fullscreen overlay. Computed after mount (never during
  // render) so server and client markup match — avoids hydration mismatch.
  const [spinSize, setSpinSize] = useState(680)
  const [mounted, setMounted] = useState(false)
  const { play } = useSounds()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const compute = () => setSpinSize(Math.min(window.innerWidth, window.innerHeight) * 0.82)
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  useEffect(() => {
    const pusher = getPusherClient()
    const channel = pusher.subscribe(GAME_REGISTRY.WHEEL.channel)

    const onDrafted = (data: WheelGame) => {
      setGame(data)
      setDrafting(true)
    }
    const onStateChanged = (data: WheelGame & { spin?: SpinInfo }) => {
      if (data.spin) {
        play('spin')
        // A spin happened — animate the wheel, hold the rest of the UI until it settles.
        setSpin(data.spin)
        setSpinning(true)
      }
      setGame(data)
    }

    const onReset = async () => {
      setSpinning(false)
      setSpin(null)
      setDrafting(false)
      const res = await getActiveGame()
      if (res.success) setGame(res.data as WheelGame | null)
    }

    channel.bind(GAME_EVENTS.TEAMS_DRAFTED, onDrafted)
    channel.bind(GAME_EVENTS.STATE_CHANGED, onStateChanged)
    channel.bind(GAME_EVENTS.GAME_RESET, onReset)

    return () => {
      // Only remove THIS component's handlers — leave the shared socket + subscription alive
      channel.unbind(GAME_EVENTS.TEAMS_DRAFTED, onDrafted)
      channel.unbind(GAME_EVENTS.STATE_CHANGED, onStateChanged)
      channel.unbind(GAME_EVENTS.GAME_RESET, onReset)
    }
  }, [play])

  async function handleNewGame() {
    setBusy(true)
    const [g, l] = await Promise.all([createGame('WHEEL'), getLobby()])
    if (g.success) setGame(g.data as WheelGame)
    if (l.success) setLobby(l.data)
    setExcluded(new Set())
    setSpin(null)
    setSpinning(false) // ← clear any stuck spin overlay
    setDrafting(false) // ← also clear drafting
    setBusy(false)
  }

  async function handleDraft() {
    if (!game) return
    const players = lobby.filter((m) => !excluded.has(m.userId))

    if (players.length < 2) return
    setBusy(true)
    const res = await draftTeamsAction(game.id, players)
    if (res.success) {
      setGame(res.data as WheelGame)
      setDrafting(true)
    }
    setBusy(false)
  }

  function toggleExclude(userId: string) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const showLobby = !game || game.status === 'LOBBY'
  const s = game?.state
  const activeUserId = game?.activePlayer?.userId ?? null

  const spinResultLabel =
    spin?.wedge === 'BANKRUPT'
      ? 'BANKRUPT!'
      : spin?.wedge === 'LOSE_TURN'
        ? 'LOSE A TURN'
        : spin
          ? `$${spin.wedge}`
          : ''

  return (
    <TVShell>
      <GameHeader label={GAME_REGISTRY.WHEEL.label} />

      {showLobby && (
        <div className="min-h-[70vh] flex flex-col justify-center max-w-6xl mx-auto w-full px-6">
          {/* Header */}
          <div className="text-center mb-10">
            <p className="font-mono text-sm tracking-[0.3em] uppercase text-white/40">
              Checked in today · {lobby.length} members
            </p>
            <p className="font-mono text-xs tracking-[0.2em] uppercase text-white/25 mt-2">
              Tap to bench anyone sitting out
            </p>
          </div>

          {lobby.length === 0 ? (
            <p className="font-nunito text-white/50 py-20 text-center text-xl">No one is checked in yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
              {lobby.map((m) => {
                const benched = excluded.has(m.userId)
                return (
                  <button
                    key={m.userId}
                    onClick={() => toggleExclude(m.userId)}
                    className={`px-6 py-6 border-2 text-center transition-all ${
                      benched
                        ? 'border-white/5 text-white/25 line-through scale-95'
                        : 'border-white/15 text-white hover:border-sky-400 hover:scale-[1.03]'
                    }`}
                  >
                    <span className="font-quicksand font-black text-2xl">{m.name}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Action */}
          <div className="flex justify-center">
            {!game ? (
              <button
                onClick={handleNewGame}
                disabled={busy}
                className="px-12 py-5 bg-sky-500 text-white font-quicksand font-black text-2xl disabled:opacity-40 hover:bg-sky-400 transition-colors"
              >
                Start Game
              </button>
            ) : (
              <button
                onClick={handleDraft}
                disabled={busy || lobby.length - excluded.size < 2}
                className="px-12 py-5 bg-sky-500 text-white font-quicksand font-black text-2xl disabled:opacity-40 hover:bg-sky-400 transition-colors"
              >
                Draft Teams →
              </button>
            )}
          </div>

          {/* Live count of who's actually playing */}
          <p className="text-center font-mono text-xs tracking-[0.2em] uppercase text-white/30 mt-5">
            {lobby.length - excluded.size} playing
            {excluded.size > 0 && ` · ${excluded.size} benched`}
          </p>
        </div>
      )}

      {drafting && game && <DraftAnimation players={game.players} onDone={() => setDrafting(false)} />}

      {/* ── FULLSCREEN SPIN OVERLAY ── the wheel alone + huge while it turns ── */}
      <AnimatePresence>
        {mounted && spinning && s && game?.status === 'PLAYING' && s.spinNonce > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              background: 'radial-gradient(120% 120% at 50% 40%, #0f2233 0%, #03080d 75%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <p className="font-mono text-[12px] tracking-[0.4em] uppercase text-white/40 mb-6">{spin?.by} spinning…</p>
            <Wheel
              targetIndex={s.lastSpinIndex}
              nonce={s.spinNonce}
              size={spinSize}
              onSettled={() => setSpinning(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!showLobby && !drafting && game && s && (
        <div className="space-y-10 max-w-6xl mx-auto">
          {/* Spin result banner (after the overlay closes) */}
          <div className="h-14 text-center">
            <AnimatePresence>
              {!spinning && spin && game.status === 'PLAYING' && (
                <motion.p
                  key={spin.nonce}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className={`font-quicksand font-black text-5xl ${
                    spin.wedge === 'BANKRUPT'
                      ? 'text-red-400'
                      : spin.wedge === 'LOSE_TURN'
                        ? 'text-slate-300'
                        : 'text-sky-300'
                  }`}
                >
                  {spinResultLabel}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* The phrase board — the focus once the wheel has landed */}
          <div>
            <PhraseBoard phrase={s.phrase} revealed={s.revealed} />
            <p className="text-center font-mono text-sm tracking-widest text-white/40 mt-8">Hint: {s.hint}</p>
          </div>

          {/* Money */}
          <div className="flex gap-6">
            <div className="flex-1 border-2 border-sky-500/40 bg-sky-500/5 px-8 py-5">
              <p className="font-mono text-xs tracking-[0.25em] uppercase text-sky-400">Team A · round</p>
              <p className="font-quicksand font-black text-4xl text-white mt-1">${s.roundMoneyA}</p>
            </div>
            <div className="flex-1 border-2 border-red-400/40 bg-red-400/5 px-8 py-5">
              <p className="font-mono text-xs tracking-[0.25em] uppercase text-red-300">Team B · round</p>
              <p className="font-quicksand font-black text-4xl text-white mt-1">${s.roundMoneyB}</p>
            </div>
          </div>

          {/* Turn / win status */}
          <div className="text-center min-h-10">
            <AnimatePresence mode="wait">
              {game.status === 'FINISHED' ? (
                <motion.p
                  key="win"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-quicksand font-black text-4xl uppercase tracking-wide text-sky-300"
                >
                  {s.winner === 'TIE' ? "It's a tie" : `Team ${s.winner} wins`}
                </motion.p>
              ) : (
                <motion.p
                  key="turn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-nunito text-2xl text-white/80"
                >
                  {game.activePlayer ? (
                    <>
                      <span className="font-bold text-white">{game.activePlayer.name}</span> — Team{' '}
                      {game.activePlayer.team} {s.phase === 'AWAITING_GUESS' ? 'pick a consonant' : 'to spin'}
                    </>
                  ) : (
                    'Waiting…'
                  )}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <LetterTray revealed={s.revealed} guessed={s.guessed} />
          <TeamRoster
            players={game.players}
            scoreA={s.roundMoneyA + s.bankedA}
            scoreB={s.roundMoneyB + s.bankedB}
            activeUserId={activeUserId}
          />

          {game.status === 'FINISHED' && (
            <div className="text-center pt-4">
              <button
                onClick={handleNewGame}
                disabled={busy}
                className="px-12 py-5 bg-sky-500 text-white font-quicksand font-black text-2xl disabled:opacity-40 hover:bg-sky-400 transition-colors"
              >
                New Game
              </button>
            </div>
          )}
        </div>
      )}
    </TVShell>
  )
}
