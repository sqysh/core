'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronRight, List, Minus, Pause, Play, Plus, RotateCcw, SkipBack, Square, Tv, X } from 'lucide-react'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { ActionBody } from '@/components/_shared/LinkBody'
import { useSounds } from '@/lib/hooks/useSounds'
import { useSend } from '@/lib/hooks/useSend'
import { SqyshVector, TypeText, type SqyshMode } from '@/components/_shared/SqyshVector'
import {
  FOCUS,
  RUN_OF_SHOW,
  ScriptNames,
  Segment,
  SPEED_DEFAULT,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_STEP,
  STAGE_CHANNEL,
  STAGE_EVENT,
  StageCommand,
  StagePresentation,
  StepId
} from '@/lib/constants/stage.constants'
import { DeckControls } from '../../present/_components/DeckControls'
import { PollPicker } from '../_components/PollPicker'

// Each run-of-show step maps to the ONE screen command that should land on the TV
// for that step. This is what the Jump menu uses, so "jump to Treasurer" actually
// shows the treasurer board instead of scrubbing the teleprompter script.
function screenCommandFor(
  id: StepId,
  presentation: StagePresentation | null,
  presenterName: string | null
): StageCommand {
  switch (id) {
    case 'open':
      return { type: 'script.play', countdown: true }
    case 'guiding-light':
      return { type: 'guiding-light.show' }
    case 'education':
      return { type: 'education.show' }
    case 'sixty':
      return { type: 'sixty.show' }
    case 'co-directors':
      return { type: 'co-directors.show' }
    case 'event-coordinator':
      return { type: 'event-coordinator.show' }
    case 'membership':
      return { type: 'membership.show' }
    case 'treasurer':
      return { type: 'treasurer.show' }
    case 'presentation':
      return presentation
        ? { type: 'present.start', presentationId: presentation.id }
        : { type: 'presenter.spotlight', name: presenterName }
    case 'activity':
      return { type: 'activity.show' }
    case 'matchups':
      return { type: 'matchups.show' }
    case 'close':
      return { type: 'script.jump', value: 'close' }
  }
}

// the light sweeps and the breathing glow; both sit out under reduced motion
const CONSOLE_CSS = `
  .hr-sheen { animation: hrSheen 6s ease-in-out infinite }
  @keyframes hrSheen { 0% { transform: translateX(-130%) skewX(-12deg) } 55%, 100% { transform: translateX(380%) skewX(-12deg) } }
  .hr-breathe { animation: hrBreathe 3.4s ease-in-out infinite }
  @keyframes hrBreathe { 0%, 100% { opacity: .25 } 50% { opacity: .65 } }
  @media (prefers-reduced-motion: reduce) { .hr-sheen, .hr-breathe { animation: none } }
`

export function HostRemoteClient({
  presentation,
  names,
  onOpenRound,
  onGenerateMatchups,
  glRevealed: glRevealedInit = false
}: {
  segments: Segment[]
  presentation: StagePresentation | null
  names: ScriptNames
  onOpenRound: () => Promise<{ success: boolean; error?: string }>
  /** generates this week's pairs, so the host never pre-runs it by hand */
  onGenerateMatchups?: () => Promise<{ success: boolean; error?: string }>
  /** true when today's round is already revealed (remote reloaded after the pick) */
  glRevealed?: boolean
}) {
  const { play } = useSounds({ enabled: true, volume: 0.4 })
  const { ok, send } = useSend()
  // stepIdx = the step the big button will run next. liveIdx = the step actually
  // on the TV right now (-1 before anything is sent). Keeping them separate means
  // the remote mirrors the TV after a jump instead of running a step ahead.
  const [stepIdx, setStepIdx] = useState(0)
  const [liveIdx, setLiveIdx] = useState(-1)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(SPEED_DEFAULT)
  const [presenting, setPresenting] = useState(false)
  const [page, setPage] = useState(1)
  const [menuOpen, setMenuOpen] = useState(false)
  // treasurer is a two-tap step: first the teleprompter intro, then the board
  const [treasurerBoard, setTreasurerBoard] = useState(false)
  // presenter with nothing uploaded: their name + clock on the TV until the host ends it
  const [spotlight, setSpotlight] = useState(false)
  // once the judge picks, the Guiding Light step shows the winner, not the intro
  const [glRevealed, setGlRevealed] = useState(glRevealedInit)

  const nextStep = RUN_OF_SHOW[stepIdx]
  const live = liveIdx >= 0 && liveIdx < RUN_OF_SHOW.length ? RUN_OF_SHOW[liveIdx] : null
  const done = stepIdx >= RUN_OF_SHOW.length

  // what the readout shows as the hero: the section on the TV once started, else what's up next
  const shown = live ?? nextStep
  const shownIdx = live ? liveIdx : stepIdx
  const lcdKey = done ? 'done' : presenting && presentation ? 'presenting' : `${shown?.id}-${live ? 'live' : 'next'}`

  // sqyshvertex: one sentence telling the host what to do right now
  const guideLine = done
    ? 'That’s a wrap, nice work.'
    : presenting && presentation
      ? 'They run the deck from their phone, so take over below only if you need to.'
      : nextStep?.id === 'guiding-light' && glRevealed
        ? 'Tap to put the winner back up on the TV.'
        : nextStep?.id === 'treasurer' && treasurerBoard
          ? 'Now tap to put the treasurer board on the TV.'
          : nextStep?.id === 'presentation' && !presentation && spotlight
            ? 'Tap again when they wrap up and the script moves on to the Activity Round.'
            : nextStep?.id === 'presentation' && !presentation
              ? `Nothing was uploaded, so tap to put ${names.presenter ?? 'the presenter'}’s name and the clock on the TV while they talk.`
              : (shown?.guide(names) ?? '')

  // Sqysh reacts to the meeting: waves hello, splats excited when the step moves,
  // thinks while a command is in flight, and otherwise idles.
  const reduce = !!useReducedMotion()
  const [sqMode, setSqMode] = useState<SqyshMode>('wave')
  const firstLine = useRef(true)
  useEffect(() => {
    const id = setTimeout(() => setSqMode('idle'), 1900)
    return () => clearTimeout(id)
  }, [])
  useEffect(() => {
    if (firstLine.current) {
      firstLine.current = false
      return
    }
    setSqMode('excited')
    const id = setTimeout(() => setSqMode('idle'), 900)
    return () => clearTimeout(id)
  }, [guideLine])
  const mode: SqyshMode = busy ? 'think' : sqMode

  // Follow the stage: when the presenter taps Done on their phone, move on here too
  useEffect(() => {
    const channel = getPusherClient().subscribe(STAGE_CHANNEL)
    channel.bind(STAGE_EVENT, (cmd: StageCommand) => {
      if (cmd.type === 'present.end') {
        setPresenting(false)
        const activityIdx = RUN_OF_SHOW.findIndex((s) => s.id === 'activity')
        setLiveIdx((i) =>
          Math.max(
            i,
            RUN_OF_SHOW.findIndex((s) => s.id === 'presentation')
          )
        )
        setStepIdx((i) => Math.max(i, activityIdx))
      }
      if (cmd.type === 'present.start') setPresenting(true)
    })
    // the judge's pick lands on its own channel; once it does, the Guiding Light
    // step shows the winner instead of the intro
    const gl = getPusherClient().subscribe('guiding-light')
    const onWinner = () => setGlRevealed(true)
    gl.bind('winner-selected', onWinner)
    return () => {
      channel.unbind_all()
      releaseChannel(STAGE_CHANNEL)
      gl.unbind('winner-selected', onWinner)
    }
  }, [])

  async function next() {
    const step = RUN_OF_SHOW[stepIdx]
    if (!step || busy) return
    setBusy(true)
    setErr('')
    let okStep = true
    switch (step.id) {
      case 'open':
        okStep = await send({ type: 'script.play', countdown: true })
        setPlaying(okStep)
        break
      case 'guiding-light':
        okStep = await send({ type: 'guiding-light.show' })
        break
      case 'education':
        okStep = await send({ type: 'education.show' })
        break
      case 'sixty': {
        // open the shortlist on the judge's phone AND put the GL screen on the TV
        const r = await onOpenRound()
        okStep = r.success
        if (!r.success) setErr(r.error ?? 'Could not open the round.')
        else okStep = await send({ type: 'sixty.show' })
        break
      }
      case 'co-directors':
        okStep = await send({ type: 'co-directors.show' })
        break
      case 'event-coordinator':
        okStep = await send({ type: 'event-coordinator.show' })
        break
      case 'membership':
        okStep = await send({ type: 'membership.show' })
        break
      case 'treasurer':
        if (!treasurerBoard) {
          // first tap: teleprompter counts 3-2-1, then reads the treasurer intro
          okStep = await send({ type: 'script.jump', value: 'treasurer', countdown: true })
          if (okStep) {
            setTreasurerBoard(true)
            setPlaying(true)
            setLiveIdx(stepIdx)
            setBusy(false)
            play('ui-primary')
            return // stay on this step; next tap puts the board up
          }
          break
        }
        // second tap: switch to the treasurer board
        okStep = await send({ type: 'treasurer.show' })
        if (okStep) setTreasurerBoard(false)
        break
      case 'presentation':
        if (!presentation) {
          if (!spotlight) {
            // nothing uploaded: put their name and the clock on the TV while they talk
            okStep = await send({ type: 'presenter.spotlight', name: names.presenter })
            if (okStep) {
              setSpotlight(true)
              setLiveIdx(stepIdx)
              setBusy(false)
              play('ui-primary')
              return // stay on this step; tap again when they wrap up
            }
            break
          }
          // they're done: move on to the Activity Round screen
          okStep = await send({ type: 'activity.show' })
          if (okStep) {
            setSpotlight(false)
            play('ui-primary')
            const activityIdx = RUN_OF_SHOW.findIndex((s) => s.id === 'activity')
            setLiveIdx(activityIdx)
            setStepIdx(activityIdx + 1)
            setBusy(false)
            return
          }
          break
        }
        okStep = await send({ type: 'present.start', presentationId: presentation.id })
        if (okStep) {
          setPresenting(true)
          setLiveIdx(stepIdx)
          setPage(1)
          setBusy(false)
          play('ui-primary')
          return // stays on this step until the presenter (or you) ends it
        }
        break
      case 'activity':
        okStep = await send({ type: 'activity.show' })
        break
      case 'matchups': {
        // generate this week's pairs first, so they exist before the TV pulls them
        if (onGenerateMatchups) {
          const r = await onGenerateMatchups()
          if (!r.success) {
            setErr(r.error ?? 'Could not generate the matchups.')
            okStep = false
            break
          }
        }
        okStep = await send({ type: 'matchups.show' })
        break
      }
      case 'close':
        // teleprompter reads the closing words; when it finishes, the TV moves to
        // the quotes on its own
        okStep = await send({ type: 'script.jump', value: 'close', play: true })
        break
    }
    setBusy(false)
    if (okStep) {
      play('ui-primary')
      setLiveIdx(stepIdx)
      setStepIdx((i) => i + 1)
    }
  }

  // Jump straight to a section: put that section on the TV and leave the remote
  // sitting ON that section, with the big button ready to move to the next one.
  async function jumpTo(i: number) {
    const target = RUN_OF_SHOW[i]
    if (!target || busy) return
    setMenuOpen(false)
    setBusy(true)
    setErr('')
    setPresenting(false)
    setTreasurerBoard(false)
    setSpotlight(false)
    const okStep = await send(screenCommandFor(target.id, presentation, names.presenter))
    setBusy(false)
    if (!okStep) {
      setErr('Could not jump to that section.')
      return
    }
    play('se2')
    setPlaying(target.id === 'open')
    setLiveIdx(i)
    if (target.id === 'presentation') {
      // either kind waits on this step until the host (or presenter) ends it
      if (presentation) setPresenting(true)
      else setSpotlight(true)
      setStepIdx(i)
    } else {
      setStepIdx(i + 1)
    }
  }

  async function endPresentation() {
    play('ui-primary')
    setPresenting(false)
    await send({ type: 'present.end' })
    const activityIdx = RUN_OF_SHOW.findIndex((s) => s.id === 'activity')
    setLiveIdx(RUN_OF_SHOW.findIndex((s) => s.id === 'presentation'))
    setStepIdx(activityIdx)
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

  // transport keys stay on like a real remote, except while the presenter's deck is up
  const scriptUp = !presenting
  const pct = Math.round(((speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100)
  const speedPips = Math.max(1, Math.round((pct / 100) * 7))

  // flat console key: square, hairline border, primary tint on press
  const KEY =
    'relative flex items-center justify-center gap-2 border border-border-light bg-black/5 font-sora font-bold text-text-light transition-colors duration-100 active:border-primary-light/50 active:bg-primary-light/15 disabled:opacity-35 dark:border-white/10 dark:bg-white/5 dark:text-text-dark dark:active:border-primary-dark/50 dark:active:bg-primary-dark/15'

  return (
    <div className="relative flex min-h-screen flex-col bg-bg-light pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] dark:bg-bg-dark">
      <style>{CONSOLE_CSS}</style>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mx-auto flex w-full max-w-140 flex-1 flex-col gap-4 px-5"
      >
        {/* status bar */}
        <div>
          <div className="flex items-center justify-between px-1 pb-3 pt-1">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 bg-primary-light shadow-[0_0_10px] shadow-primary-light dark:bg-primary-dark dark:shadow-primary-dark"
                aria-hidden="true"
              />
              <span className="font-mono text-[11px] tracking-[0.34em] text-primary-light [text-shadow:0_0_10px_rgba(96,165,250,0.35)] dark:text-primary-dark dark:[text-shadow:0_0_12px_rgba(96,165,250,0.55)]">
                CORE
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 ${ok ? 'animate-pulse bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500 dark:bg-emerald-400 dark:shadow-emerald-400' : 'bg-red-500 shadow-[0_0_8px] shadow-red-500'}`}
                aria-hidden="true"
              />
              <span className="font-mono text-[9px] tracking-widest text-text-light/40 dark:text-text-dark/40">
                {ok ? 'LINK' : 'NO TV'}
              </span>
            </div>
          </div>
          <div
            className="h-px w-full bg-linear-to-r from-transparent via-primary-light/50 to-transparent dark:via-primary-dark/60"
            aria-hidden="true"
          />
        </div>

        {/* readout: scanlines, a periodic light sweep, content slides in per step */}
        <div className="relative overflow-hidden border border-border-light bg-black/3 dark:border-white/10 dark:bg-black/30">
          <span
            className="pointer-events-none absolute inset-0 opacity-5 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(147,197,253,0.7)_3px)]"
            aria-hidden="true"
          />
          <span
            className="hr-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-black/4 to-transparent dark:via-white/6"
            aria-hidden="true"
          />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={lcdKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative px-5 py-5"
            >
              {done ? (
                <>
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary-light/90 dark:text-primary-dark/80">
                    Done
                  </p>
                  <p className="mt-1.5 font-sora text-[24px] font-black text-text-light dark:text-text-dark">
                    That&rsquo;s the meeting.
                  </p>
                </>
              ) : presenting && presentation ? (
                <>
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary-light/90 dark:text-primary-dark/80">
                    On the TV now
                  </p>
                  <p className="mt-1.5 font-sora text-[22px] font-black text-text-light dark:text-text-dark">
                    {presentation.presenter.name}&rsquo;s presentation
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary-light/90 dark:text-primary-dark/80">
                      {live ? 'On the TV now' : 'Up next'} &middot; {shownIdx + 1} of {RUN_OF_SHOW.length}
                    </span>
                    <div className="flex gap-1" aria-hidden="true">
                      {RUN_OF_SHOW.map((s, i) => (
                        <span
                          key={s.id}
                          className={`h-1 w-3 ${
                            i <= liveIdx
                              ? 'bg-primary-light shadow-[0_0_6px] shadow-primary-light/60 dark:bg-primary-dark dark:shadow-primary-dark/60'
                              : i === stepIdx
                                ? 'animate-pulse bg-primary-light/60 dark:bg-primary-dark/60'
                                : 'bg-black/10 dark:bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 font-sora text-[26px] font-black leading-tight text-text-light dark:text-text-dark">
                    {shown.title}
                  </p>
                  {nextStep?.id === 'presentation' && !presentation && !spotlight && (
                    <p className="mt-2 font-mono text-[11px] tracking-wide text-amber-600 dark:text-amber-400/80">
                      Nothing uploaded. The TV shows their name and the clock instead.
                    </p>
                  )}
                  {err && (
                    <p className="mt-2 font-mono text-[11px] text-red-500 dark:text-red-400" role="alert">
                      {err}
                    </p>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* sqyshvertex: Sqysh coaches the host, one sentence per step */}
          <div className="relative flex items-center gap-3 border-t border-border-light px-5 py-3 [--key:var(--color-primary-light)] dark:border-white/10 dark:[--key:var(--color-primary-dark)]">
            <div className="h-14 shrink-0 drop-shadow-[0_0_14px_rgba(168,85,247,0.4)]" aria-hidden="true">
              <SqyshVector mode={mode} reduce={reduce} id="sq-skin-host" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[9px] tracking-[0.3em] text-primary-light/70 dark:text-primary-dark/70">
                sqyshvertex
              </p>
              <p className="mt-0.5 font-nunito text-[14px] leading-snug text-text-light/70 dark:text-text-dark/70">
                <TypeText key={guideLine} text={guideLine} startAt={0.1} reduce={reduce} />
              </p>
            </div>
          </div>
        </div>

        {/* primary action — the one thing Eileen taps to move the meeting forward */}
        {done ? (
          <button
            type="button"
            onClick={() => {
              play('ui-tap')
              setStepIdx(0)
              setLiveIdx(-1)
              setTreasurerBoard(false)
              setSpotlight(false)
            }}
            className={`${KEY} h-18 w-full text-[17px] ${FOCUS}`}
          >
            <RotateCcw size={20} aria-hidden="true" /> <span>Start over</span>
          </button>
        ) : presenting && presentation ? (
          <button type="button" onClick={endPresentation} className={`${KEY} h-18 w-full text-[16px] ${FOCUS}`}>
            <Square size={18} aria-hidden="true" /> <span>End the presentation</span>
          </button>
        ) : (
          <div className="relative">
            <span
              className="hr-breathe pointer-events-none absolute -inset-1 bg-primary-light/30 blur-lg dark:bg-primary-dark/35"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={next}
              disabled={busy}
              className={`relative flex min-h-26 w-full flex-col items-center justify-center gap-1 overflow-hidden border border-primary-light/60 bg-primary-light px-4 text-center font-sora text-[22px] font-black text-white transition-[filter,transform] duration-75 active:translate-y-px active:brightness-110 disabled:opacity-60 dark:border-primary-dark/60 dark:bg-primary-dark ${FOCUS}`}
            >
              <span
                className="hr-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/15 to-transparent"
                aria-hidden="true"
              />
              <span className="font-mono text-[10px] font-bold tracking-[0.3em] text-white/60 uppercase">
                {live ? 'Up next — tap' : 'Tap to begin'}
              </span>
              <ActionBody
                pending={busy}
                label={
                  nextStep?.id === 'presentation' && !presentation && spotlight
                    ? 'End the presentation'
                    : nextStep?.id === 'treasurer' && treasurerBoard
                      ? 'Show the treasurer board'
                      : nextStep?.id === 'guiding-light' && glRevealed
                        ? 'Show the winner'
                        : nextStep?.button
                }
                icon={<ChevronRight size={24} aria-hidden="true" />}
                iconAfter
              />
            </button>
          </div>
        )}

        {/* presenter deck controls while presenting */}
        {presenting && presentation && (
          <DeckControls presentation={presentation} page={page} setPage={setPage} send={send} showTimer />
        )}

        {/* transport — only while the script is on the TV */}
        {scriptUp && (
          <div className="border border-border-light bg-black/3 px-4 py-4 dark:border-white/10 dark:bg-black/20">
            <p className="mb-3 text-center font-mono text-[9px] tracking-[0.3em] text-primary-light/70 uppercase dark:text-primary-dark/60">
              Teleprompter
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  play('ui-tick')
                  send({ type: 'script.rewind' })
                }}
                className={`${KEY} h-20 flex-col ${FOCUS}`}
              >
                <SkipBack size={22} aria-hidden="true" />
                <span className="text-[12px] font-semibold">Rewind</span>
              </button>
              <button
                type="button"
                onClick={togglePlay}
                aria-pressed={playing}
                className={`${KEY} h-20 flex-col ${playing ? 'border-primary-light/50 text-primary-light dark:border-primary-dark/50 dark:text-primary-dark' : ''} ${FOCUS}`}
              >
                {playing ? (
                  <Pause size={24} className="animate-pulse" aria-hidden="true" />
                ) : (
                  <Play size={24} aria-hidden="true" />
                )}
                <span className="text-[12px] font-semibold">{playing ? 'Pause' : 'Play'}</span>
              </button>
              <div className="grid grid-rows-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => bump(SPEED_STEP)}
                  disabled={speed >= SPEED_MAX}
                  className={`${KEY} text-[12px] ${FOCUS}`}
                >
                  <Plus size={16} aria-hidden="true" />
                  <span className="font-semibold">Faster</span>
                </button>
                <button
                  type="button"
                  onClick={() => bump(-SPEED_STEP)}
                  disabled={speed <= SPEED_MIN}
                  className={`${KEY} text-[12px] ${FOCUS}`}
                >
                  <Minus size={16} aria-hidden="true" />
                  <span className="font-semibold">Slower</span>
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="font-mono text-[9px] tracking-widest text-text-light/40 uppercase dark:text-text-dark/40">
                Speed
              </span>
              <div className="flex gap-1" aria-hidden="true">
                {Array.from({ length: 7 }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-2.5 transition-colors duration-200 ${
                      i < speedPips
                        ? 'bg-primary-light shadow-[0_0_6px] shadow-primary-light/60 dark:bg-primary-dark dark:shadow-primary-dark/60'
                        : 'bg-black/10 dark:bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* poll — available any time */}
        <PollPicker send={send} />

        {/* bottom actions: jump menu + back to board */}
        <div className="mt-auto grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              play('ui-tap')
              setMenuOpen((v) => !v)
            }}
            aria-expanded={menuOpen}
            className={`${KEY} h-14 text-[14px] ${FOCUS}`}
          >
            <List size={17} aria-hidden="true" /> <span>Jump to section</span>
          </button>
          <button
            type="button"
            onClick={() => {
              play('ui-tap')
              send({ type: 'holding' })
              setStepIdx(0)
              setLiveIdx(-1)
              setPlaying(false)
              setTreasurerBoard(false)
              setSpotlight(false)
              setMenuOpen(false)
            }}
            className={`${KEY} h-14 text-[14px] ${FOCUS}`}
          >
            <Tv size={17} aria-hidden="true" /> <span>Check-in board</span>
          </button>
        </div>
      </motion.div>

      {/* jump panel — full bleed, one row per run-of-show section */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10, transition: { duration: 0.14 } }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 z-10 flex flex-col bg-bg-light/98 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm dark:bg-bg-dark/98"
          >
            <div className="mx-auto flex w-full max-w-140 flex-1 flex-col px-5">
              <div className="flex items-center justify-between pb-3 pt-1">
                <span className="font-mono text-[12px] tracking-widest text-primary-light uppercase [text-shadow:0_0_10px_rgba(96,165,250,0.3)] dark:text-primary-dark dark:[text-shadow:0_0_10px_rgba(96,165,250,0.45)]">
                  Jump to a section
                </span>
                <button
                  type="button"
                  onClick={() => {
                    play('ui-tap')
                    setMenuOpen(false)
                  }}
                  aria-label="Close"
                  className={`flex items-center gap-1 font-mono text-[11px] tracking-widest text-text-light/50 uppercase dark:text-text-dark/50 ${FOCUS}`}
                >
                  <X size={14} aria-hidden="true" /> Close
                </button>
              </div>
              <div
                className="mb-3 h-px w-full bg-linear-to-r from-transparent via-primary-light/50 to-transparent dark:via-primary-dark/60"
                aria-hidden="true"
              />
              <p className="mb-3 font-nunito text-[12px] leading-snug text-text-light/50 dark:text-text-dark/45">
                Taps the TV straight to that part of the meeting. Use it to skip ahead or go back — the big button keeps
                going from there.
              </p>
              <motion.ol
                className="flex-1 space-y-2 overflow-y-auto"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035 } } }}
                initial="hidden"
                animate="show"
              >
                {RUN_OF_SHOW.map((s, i) => (
                  <motion.li key={s.id} variants={{ hidden: { opacity: 0, x: 14 }, show: { opacity: 1, x: 0 } }}>
                    <button
                      type="button"
                      onClick={() => jumpTo(i)}
                      disabled={busy}
                      className={`flex min-h-16 w-full items-center gap-3 border px-4 py-3 text-left transition-colors duration-100 active:bg-black/5 disabled:opacity-40 dark:active:bg-white/10 ${
                        i === liveIdx
                          ? 'border-primary-light/60 bg-primary-light/10 dark:border-primary-dark/60 dark:bg-primary-dark/10'
                          : 'border-border-light bg-black/3 dark:border-white/10 dark:bg-white/3'
                      } ${FOCUS}`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center font-mono text-[12px] tabular-nums ${
                          i === liveIdx
                            ? 'bg-primary-light text-white shadow-[0_0_10px] shadow-primary-light/50 dark:bg-primary-dark dark:shadow-primary-dark/50'
                            : 'bg-black/5 text-text-light/40 dark:bg-white/5 dark:text-text-dark/40'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-sora text-[16px] font-bold text-text-light dark:text-text-dark">
                          {s.title}
                        </span>
                        <span className="block font-nunito text-[12px] leading-snug text-text-light/50 dark:text-text-dark/45">
                          {s.help(names)}
                        </span>
                      </span>
                      <ChevronRight
                        size={18}
                        className="shrink-0 text-text-light/30 dark:text-text-dark/30"
                        aria-hidden="true"
                      />
                    </button>
                  </motion.li>
                ))}
              </motion.ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
