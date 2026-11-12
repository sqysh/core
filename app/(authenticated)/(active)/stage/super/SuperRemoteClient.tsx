'use client'

import { useState } from 'react'
import {
  CalendarDays,
  ClipboardList,
  Clock3,
  Dices,
  GraduationCap,
  LayoutGrid,
  Megaphone,
  Minus,
  Pause,
  Play,
  Plus,
  Presentation,
  Quote,
  Radio,
  Shuffle,
  SkipBack,
  Smartphone,
  Sparkles,
  Sprout,
  Square,
  Trophy,
  Tv,
  UsersRound,
  Vote,
  Wallet,
  Zap
} from 'lucide-react'
import { useSend } from '@/lib/hooks/useSend'
import { useSounds } from '@/lib/hooks/useSounds'
import {
  ScriptNames,
  SPEED_DEFAULT,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_STEP,
  StageCommand,
  StagePresentation
} from '@/lib/constants/stage.constants'
import { GuidingLightControls } from '../_components/controls/GuidingLightControls'
import { Member } from '@/types/guiding-light.types'
import { createGame } from '@/lib/actions/games/createGame'
import { announceGame } from '@/lib/actions/games/wheel/announceGame'
import { seedGuidingLight } from '@/lib/actions/guiding-light/seedGuidingLight'
import { openElection } from '@/lib/actions/election/openElection'
import { announceElection } from '@/lib/actions/election/announceElection'
import { notifyTreasurer } from '@/lib/actions/treasury/notifyTreasurer'
import { PollPicker } from '../_components/controls/PollPicker'

type Screen = { key: string; label: string; icon: typeof Tv; cmd: StageCommand }

// Every TV screen is one command. Tapping a tile sends it, no order, no state.
const SCREENS: Screen[] = [
  { key: 'holding', label: 'Check-in', icon: Tv, cmd: { type: 'holding' } },
  { key: 'open', label: 'Opening', icon: Play, cmd: { type: 'script.play', countdown: true } },
  { key: 'guiding-light', label: 'Guiding Light', icon: Sparkles, cmd: { type: 'guiding-light.show' } },
  { key: 'sixty', label: '60 Seconds', icon: Clock3, cmd: { type: 'sixty.show' } },
  { key: 'education', label: 'Education', icon: GraduationCap, cmd: { type: 'education.show' } },
  { key: 'co-directors', label: 'Co-Directors', icon: UsersRound, cmd: { type: 'co-directors.show' } },
  { key: 'event-coordinator', label: 'Events', icon: CalendarDays, cmd: { type: 'event-coordinator.show' } },
  { key: 'membership', label: 'Membership', icon: ClipboardList, cmd: { type: 'membership.show' } },
  { key: 'treasurer', label: 'Treasurer', icon: Wallet, cmd: { type: 'treasurer.show' } },
  { key: 'activity', label: 'Activity', icon: Megaphone, cmd: { type: 'activity.show' } },
  { key: 'matchups', label: 'Matchups', icon: Shuffle, cmd: { type: 'matchups.show' } },
  {
    key: 'closing',
    label: 'Closing',
    icon: Quote,
    cmd: { type: 'script.jump', value: 'close', countdown: true, play: true }
  }
]

// Teleprompter reads: jump the script to a section and start reading it.
const JUMPS: { key: string; label: string; value: string }[] = [
  { key: 'jump-welcome', label: 'Welcome', value: 'welcome' },
  { key: 'jump-gl', label: 'GL script', value: 'guiding-light' },
  { key: 'jump-treasurer', label: 'Treasurer', value: 'treasurer' },
  { key: 'jump-close', label: 'Closing words', value: 'close' }
]

const DECK_CSS = `
  .cd-scan { background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34,211,238,0.5) 3px) }
  .cd-pulse { animation: cdPulse 2.6s ease-in-out infinite }
  @keyframes cdPulse { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
  @media (prefers-reduced-motion: reduce) { .cd-pulse { animation: none } }
`

const TILE =
  'group relative flex aspect-square flex-col items-start justify-between overflow-hidden border p-2.5 text-left transition-colors duration-100 active:translate-y-px disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/70'

export function SuperRemoteClient({
  presentation,
  names,
  members,
  openRoundId,
  onOpenRound,
  onGenerateMatchups
}: {
  presentation: StagePresentation | null
  names: ScriptNames
  members: Member[]
  openRoundId: string | null
  onOpenRound: () => Promise<{ success: boolean; error?: string }>
  onGenerateMatchups?: () => Promise<{ success: boolean; error?: string }>
}) {
  const { ok, send } = useSend()
  const { play } = useSounds({ enabled: true, volume: 0.4 })

  const [last, setLast] = useState('holding')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(SPEED_DEFAULT)

  async function fire(key: string, cmd: StageCommand, sound: Parameters<typeof play>[0] = 'ui-tap') {
    if (busy) return
    play(sound)
    setErr('')
    const good = await send(cmd)
    if (good) setLast(key)
    else setErr('Command did not reach the TV.')
  }

  async function openRound() {
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      const r = await onOpenRound()
      if (r.success) {
        await send({ type: 'sixty.show' })
        setLast('sixty')
        play('ui-primary')
      } else setErr(r.error ?? 'Could not open the round.')
    } catch {
      setErr('Open round failed, check the logs.')
    } finally {
      setBusy(false)
    }
  }

  async function genMatchups() {
    if (!onGenerateMatchups || busy) return
    setBusy(true)
    setErr('')
    try {
      const r = await onGenerateMatchups()
      if (r.success) {
        await send({ type: 'matchups.show' })
        setLast('matchups')
        play('ui-primary')
      } else {
        setErr(r.error ?? 'Could not generate the matchups.')
      }
    } catch {
      setErr('Generate failed, check the logs.')
    } finally {
      setBusy(false)
    }
  }

  async function launchGame() {
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      const created = await createGame('WHEEL')
      if (created.success) {
        await announceGame()
        play('ui-primary')
      } else setErr(created.error ?? 'Could not launch the game.')
    } catch {
      setErr('Launch failed, check the logs.')
    } finally {
      setBusy(false)
    }
  }

  async function runElection() {
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      const opened = await openElection()
      if (opened.success) {
        await announceElection()
        play('ui-primary')
      } else setErr(opened.error ?? 'Could not open the election.')
    } catch {
      setErr('Election failed, check the logs.')
    } finally {
      setBusy(false)
    }
  }

  async function seedGL() {
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      const res = await seedGuidingLight()
      if (!res.success) setErr(res.error ?? 'Could not seed guiding light.')
    } catch {
      setErr('Seed failed, check the logs.')
    } finally {
      setBusy(false)
    }
  }

  async function summonTreasurer() {
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      const r = await notifyTreasurer()
      if (r.success) play('ui-primary')
      else setErr(r.error ?? 'Could not reach the treasurer.')
    } catch {
      setErr('Could not reach the treasurer.')
    } finally {
      setBusy(false)
    }
  }

  function jumpScript(value: string, key: string) {
    play('se2')
    send({ type: 'script.jump', value, play: true })
    setPlaying(true)
    setLast(key)
  }

  function togglePlay() {
    const n = !playing
    setPlaying(n)
    play(n ? 'ui-play' : 'ui-pause')
    send({ type: n ? 'script.play' : 'script.pause' })
  }

  function bump(d: number) {
    const n = Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed + d))
    setSpeed(n)
    play('ui-tick')
    send({ type: 'script.speed', value: n })
  }

  const lastLabel = SCREENS.find((s) => s.key === last)?.label ?? JUMPS.find((j) => j.key === last)?.label ?? last

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060a12] text-slate-200 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <style>{DECK_CSS}</style>
      <span className="cd-scan pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden="true" />
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.12),transparent_70%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex w-full max-w-md flex-col gap-4 px-4">
        {/* HUD */}
        <div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-cyan-400" aria-hidden="true" />
              <span className="font-mono text-[11px] tracking-[0.34em] text-cyan-300 uppercase [text-shadow:0_0_12px_rgba(34,211,238,0.6)]">
                CORE // Command Deck
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 ${ok ? 'cd-pulse bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400' : 'bg-red-500 shadow-[0_0_8px] shadow-red-500'}`}
                aria-hidden="true"
              />
              <span className="font-mono text-[9px] tracking-widest text-slate-400">{ok ? 'LINK' : 'NO TV'}</span>
            </div>
          </div>
          <div
            className="mt-2 h-px w-full bg-linear-to-r from-transparent via-cyan-400/50 to-transparent"
            aria-hidden="true"
          />
        </div>

        {/* live readout */}
        <div className="flex items-center gap-2 border border-cyan-500/20 bg-cyan-500/3 px-3 py-2">
          <Radio size={14} className="shrink-0 text-cyan-400" aria-hidden="true" />
          <span className="font-mono text-[10px] tracking-[0.2em] text-slate-400 uppercase">On TV</span>
          <span className="ml-auto truncate font-sora text-[14px] font-black text-cyan-200">{lastLabel}</span>
        </div>
        {err && (
          <p className="font-mono text-[11px] text-red-400" role="alert">
            {err}
          </p>
        )}

        {/* screen grid */}
        <div className="grid grid-cols-3 gap-2">
          {SCREENS.map((s) => {
            const Icon = s.icon
            const active = last === s.key
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => fire(s.key, s.cmd)}
                disabled={busy}
                className={`${TILE} ${
                  active
                    ? 'border-cyan-400/70 bg-cyan-400/10 shadow-[0_0_16px_-4px_rgba(34,211,238,0.6)]'
                    : 'border-cyan-500/15 bg-white/2 active:border-cyan-400/50 active:bg-cyan-400/5'
                }`}
              >
                <Icon size={18} className={active ? 'text-cyan-300' : 'text-slate-400'} aria-hidden="true" />
                <span
                  className={`font-sora text-[12px] font-bold leading-tight ${active ? 'text-cyan-100' : 'text-slate-200'}`}
                >
                  {s.label}
                </span>
                {active && (
                  <span
                    className="absolute right-1.5 top-1.5 h-1.5 w-1.5 bg-cyan-400 shadow-[0_0_6px] shadow-cyan-400"
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* presentation */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              fire(
                'presentation',
                presentation
                  ? { type: 'present.start', presentationId: presentation.id }
                  : { type: 'presenter.spotlight', name: names.presenter },
                'ui-primary'
              )
            }
            disabled={busy}
            className="flex h-12 items-center justify-center gap-2 border border-cyan-500/20 bg-white/2 font-sora text-[13px] font-bold text-slate-200 active:bg-cyan-400/5 disabled:opacity-40"
          >
            <Presentation size={16} aria-hidden="true" /> {presentation ? 'Start deck' : 'Spotlight'}
          </button>
          <button
            type="button"
            onClick={() => fire('activity', { type: 'present.end' }, 'ui-primary')}
            disabled={busy}
            className="flex h-12 items-center justify-center gap-2 border border-cyan-500/20 bg-white/2 font-sora text-[13px] font-bold text-slate-200 active:bg-cyan-400/5 disabled:opacity-40"
          >
            <Square size={15} aria-hidden="true" /> End deck
          </button>
        </div>

        {/* actions that do real work, amber so they read as "fires something" */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={openRound}
            disabled={busy}
            className="flex h-14 items-center justify-center gap-2 border border-amber-400/30 bg-amber-400/6 font-sora text-[13px] font-black text-amber-300 active:bg-amber-400/15 disabled:opacity-40"
          >
            <Trophy size={16} aria-hidden="true" /> Open the round
          </button>
          <button
            type="button"
            onClick={genMatchups}
            disabled={busy || !onGenerateMatchups}
            className="flex h-14 items-center justify-center gap-2 border border-amber-400/30 bg-amber-400/6 font-sora text-[13px] font-black text-amber-300 active:bg-amber-400/15 disabled:opacity-40"
          >
            <Shuffle size={16} aria-hidden="true" /> Generate pairs
          </button>
        </div>

        {/* launch separate TV experiences; the TV follows over Pusher */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={launchGame}
            disabled={busy}
            className="flex h-14 items-center justify-center gap-2 border border-amber-400/30 bg-amber-400/6 font-sora text-[13px] font-black text-amber-300 active:bg-amber-400/15 disabled:opacity-40"
          >
            <Dices size={16} aria-hidden="true" /> Launch game
          </button>
          <button
            type="button"
            onClick={runElection}
            disabled={busy}
            className="flex h-14 items-center justify-center gap-2 border border-amber-400/30 bg-amber-400/6 font-sora text-[13px] font-black text-amber-300 active:bg-amber-400/15 disabled:opacity-40"
          >
            <Vote size={16} aria-hidden="true" /> Open election
          </button>
        </div>

        {/* pull the treasurer back to their screen if they wandered off */}
        <button
          type="button"
          onClick={summonTreasurer}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 border border-cyan-500/20 bg-white/2 font-sora text-[13px] font-bold text-slate-200 active:bg-cyan-400/5 disabled:opacity-40"
        >
          <Smartphone size={16} aria-hidden="true" /> Send treasurer their screen
        </button>

        {/* guiding light operator overrides */}
        <GuidingLightControls members={members} openRoundId={openRoundId} />

        {/* teleprompter */}
        <div className="border border-cyan-500/15 bg-white/2 p-3">
          <p className="mb-2.5 text-center font-mono text-[9px] tracking-[0.3em] text-cyan-400/70 uppercase">
            Teleprompter
          </p>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => {
                play('ui-tick')
                send({ type: 'script.rewind' })
              }}
              className="flex h-14 flex-col items-center justify-center gap-1 border border-cyan-500/15 bg-white/2 text-slate-300 active:bg-cyan-400/5"
            >
              <SkipBack size={18} aria-hidden="true" />
              <span className="font-mono text-[9px] tracking-wide">REW</span>
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-pressed={playing}
              className={`flex h-14 flex-col items-center justify-center gap-1 border bg-white/2 active:bg-cyan-400/5 ${playing ? 'border-cyan-400/50 text-cyan-300' : 'border-cyan-500/15 text-slate-300'}`}
            >
              {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
              <span className="font-mono text-[9px] tracking-wide">{playing ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button
              type="button"
              onClick={() => bump(SPEED_STEP)}
              disabled={speed >= SPEED_MAX}
              className="flex h-14 flex-col items-center justify-center gap-1 border border-cyan-500/15 bg-white/2 text-slate-300 active:bg-cyan-400/5 disabled:opacity-40"
            >
              <Plus size={16} aria-hidden="true" />
              <span className="font-mono text-[9px] tracking-wide">FAST</span>
            </button>
            <button
              type="button"
              onClick={() => bump(-SPEED_STEP)}
              disabled={speed <= SPEED_MIN}
              className="flex h-14 flex-col items-center justify-center gap-1 border border-cyan-500/15 bg-white/2 text-slate-300 active:bg-cyan-400/5 disabled:opacity-40"
            >
              <Minus size={16} aria-hidden="true" />
              <span className="font-mono text-[9px] tracking-wide">SLOW</span>
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {JUMPS.map((j) => (
              <button
                key={j.key}
                type="button"
                onClick={() => jumpScript(j.value, j.key)}
                className={`flex-1 border px-2 py-2 font-mono text-[10px] tracking-wide whitespace-nowrap active:bg-cyan-400/5 ${
                  last === j.key ? 'border-cyan-400/60 text-cyan-200' : 'border-cyan-500/15 text-slate-400'
                }`}
              >
                {j.label}
              </button>
            ))}
          </div>
        </div>

        {/* poll */}
        <div className="border border-cyan-500/15 bg-white/2 p-3">
          <p className="mb-2.5 flex items-center gap-2 font-mono text-[9px] tracking-[0.3em] text-cyan-400/70 uppercase">
            <LayoutGrid size={12} aria-hidden="true" /> Group vote
          </p>
          <PollPicker send={send} />
        </div>

        {/* utility: reseed the guiding light pool */}
        <button
          type="button"
          onClick={seedGL}
          disabled={busy}
          className="flex h-10 items-center justify-center gap-2 border border-cyan-500/15 bg-white/2 font-mono text-[10px] tracking-[0.15em] uppercase text-slate-400 active:bg-cyan-400/5 disabled:opacity-40"
        >
          <Sprout size={13} aria-hidden="true" /> Seed guiding light
        </button>
      </div>
    </div>
  )
}
