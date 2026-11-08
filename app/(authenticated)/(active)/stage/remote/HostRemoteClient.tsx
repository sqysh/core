'use client'

// ─── Host remote: the run of show ────────────────────────────────────────────
// One step at a time. What's happening, what to do, one big button. Script
// speed lives under the card while the script is up. Override list at the
// bottom for when something goes sideways.

import {
  FOCUS,
  RUN_OF_SHOW,
  ScriptNames,
  Segment,
  SPEAKER_LABEL,
  SPEED_DEFAULT,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_STEP,
  STAGE_CHANNEL,
  STAGE_EVENT,
  StageCommand,
  StagePresentation
} from '@/lib/constants/stage.constants'
import { useSend } from '@/lib/hooks/useSend'
import { useSounds } from '@/lib/hooks/useSounds'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { useEffect, useState } from 'react'
import { LinkStatus } from '../_components/LinkStatus'
import { DeckControls } from '../../present/_components/DeckControls'
import { ChevronRight, Minus, Pause, Play, Plus, RotateCcw, Square } from 'lucide-react'
import { ActionBody } from '@/components/_shared/LinkBody'
import { PollPicker } from '../_components/PollPicker'

export function HostRemoteClient({
  segments,
  presentation,
  names,
  onOpenRound
}: {
  segments: Segment[]
  presentation: StagePresentation | null
  names: ScriptNames
  onOpenRound: () => Promise<{ success: boolean; error?: string }>
}) {
  const { play } = useSounds({ enabled: true, volume: 0.4 })
  const { ok, send } = useSend()
  const [stepIdx, setStepIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(SPEED_DEFAULT)
  const [presenting, setPresenting] = useState(false)
  const [page, setPage] = useState(1)

  const step = RUN_OF_SHOW[stepIdx]
  const done = stepIdx >= RUN_OF_SHOW.length

  // Follow the stage: when the presenter taps Done on their phone, move on here too
  useEffect(() => {
    const channel = getPusherClient().subscribe(STAGE_CHANNEL)
    channel.bind(STAGE_EVENT, (cmd: StageCommand) => {
      if (cmd.type === 'present.end') {
        setPresenting(false)
        setStepIdx((i) =>
          Math.max(
            i,
            RUN_OF_SHOW.findIndex((s) => s.id === 'activity')
          )
        )
      }
      if (cmd.type === 'present.start') setPresenting(true)
    })
    return () => {
      channel.unbind_all()
      releaseChannel(STAGE_CHANNEL)
    }
  }, [])

  async function next() {
    if (!step || busy) return
    setBusy(true)
    setErr('')
    let okStep = true
    switch (step.id) {
      case 'open':
        okStep = await send({ type: 'script.play' })
        setPlaying(okStep)
        break
      case 'shortlist': {
        const r = await onOpenRound()
        okStep = r.success
        if (!r.success) setErr(r.error ?? 'Could not open the round.')
        break
      }
      case 'presentation':
        if (!presentation) {
          okStep = await send({ type: 'script.jump', value: 'activity' })
        } else {
          okStep = await send({ type: 'present.start', presentationId: presentation.id })
          if (okStep) {
            setPresenting(true)
            setPage(1)
            setBusy(false)
            play('se2')
            return // stays on this step until the presenter (or you) ends it
          }
        }
        break
      case 'activity':
        okStep = await send({ type: 'script.jump', value: 'activity' })
        break
      case 'matchups':
        okStep = await send({ type: 'script.jump', value: 'close' })
        break
      case 'close':
        okStep = await send({ type: 'holding' })
        setPlaying(false)
        break
    }
    setBusy(false)
    if (okStep) {
      play('se2')
      setStepIdx((i) => i + 1)
    }
  }

  async function endPresentation() {
    setPresenting(false)
    await send({ type: 'present.end' })
    setStepIdx(RUN_OF_SHOW.findIndex((s) => s.id === 'activity'))
  }

  function togglePlay() {
    const n = !playing
    setPlaying(n)
    send({ type: n ? 'script.play' : 'script.pause' })
  }
  function bump(d: number) {
    const n = Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed + d))
    setSpeed(n)
    send({ type: 'script.speed', value: n })
  }

  const scriptUp = stepIdx > 0 && !done && !presenting && step?.id !== 'matchups'
  const pct = Math.round(((speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100)

  return (
    <div className="min-h-screen bg-bg-light pb-[max(2rem,env(safe-area-inset-bottom))] dark:bg-bg-dark">
      <div className="mx-auto w-full max-w-105 px-4 pt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-f10 font-mono tracking-[0.12em] uppercase text-primary-light dark:text-primary-dark">
              You\u2019re hosting
            </p>
            <h1 className="mt-1 font-sora text-[22px] font-black tracking-tight text-text-light dark:text-text-dark">
              Thursday, step by step
            </h1>
          </div>
          <LinkStatus ok={ok} />
        </div>

        {/* progress */}
        <ol className="mt-5 flex gap-1.5" aria-label="Progress">
          {RUN_OF_SHOW.map((s, i) => (
            <li
              key={s.id}
              className={`h-1.5 flex-1 ${i < stepIdx ? 'bg-primary-light dark:bg-primary-dark' : i === stepIdx ? 'bg-primary-light/40 dark:bg-primary-dark/40' : 'bg-border-light dark:bg-border-dark'}`}
            />
          ))}
        </ol>

        {/* current step */}
        {done ? (
          <div className="mt-5 border border-border-light p-5 dark:border-border-dark">
            <p className="font-sora text-[20px] font-black text-text-light dark:text-text-dark">
              That\u2019s the meeting.
            </p>
            <p className="mt-2 font-nunito text-[14px] leading-relaxed text-muted-light dark:text-muted-dark">
              The TV is back on the check-in board. Nice work.
            </p>
            <button
              type="button"
              onClick={() => setStepIdx(0)}
              className={`mt-4 h-11 w-full border border-border-light font-mono text-[12px] text-muted-light dark:border-border-dark dark:text-muted-dark ${FOCUS}`}
            >
              Start over
            </button>
          </div>
        ) : presenting && presentation ? (
          <div className="mt-5">
            <div className="border border-border-light px-4 py-3 dark:border-border-dark">
              <p className="text-f10 font-mono tracking-[0.12em] uppercase text-primary-light dark:text-primary-dark">
                On the TV now
              </p>
              <p className="mt-1 font-sora text-[18px] font-black text-text-light dark:text-text-dark">
                {presentation.presenter.name}\u2019s presentation
              </p>
              <p className="mt-1 font-nunito text-[13px] text-muted-light dark:text-muted-dark">
                They\u2019re driving from their phone. You can drive from here too if you need to.
              </p>
            </div>
            <div className="mt-2">
              <DeckControls presentation={presentation} page={page} setPage={setPage} send={send} showTimer />
            </div>
            <button
              type="button"
              onClick={endPresentation}
              className={`mt-2 flex h-12 w-full items-center justify-center gap-2 border border-border-light font-mono text-[13px] text-muted-light dark:border-border-dark dark:text-muted-dark ${FOCUS}`}
            >
              <Square size={14} aria-hidden="true" /> End it from here
            </button>
          </div>
        ) : (
          <div className="mt-5 border border-border-light dark:border-border-dark">
            <div className="px-5 pt-5 pb-4">
              <p className="text-f10 font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">
                Step {stepIdx + 1} of {RUN_OF_SHOW.length}
              </p>
              <p className="mt-1 font-sora text-[22px] font-black tracking-tight text-text-light dark:text-text-dark">
                {step.title}
              </p>
              <p className="mt-3 font-nunito text-[15px] leading-relaxed text-text-light/80 dark:text-text-dark/80">
                {step.help(names)}
              </p>
              {step.id === 'presentation' && !presentation && (
                <p className="mt-3 border border-dashed border-border-light px-3 py-2 font-nunito text-[13px] text-muted-light dark:border-border-dark dark:text-muted-dark">
                  Nothing was uploaded this week. The button skips straight to the Activity Round.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={next}
              disabled={busy}
              className={`flex h-20 w-full items-center justify-center gap-3 bg-primary-light font-sora text-[20px] font-black text-white disabled:opacity-60 dark:bg-primary-dark ${FOCUS}`}
            >
              <ActionBody
                pending={busy}
                label={step.id === 'presentation' && !presentation ? 'Skip to the Activity Round' : step.button}
                icon={<ChevronRight size={22} aria-hidden="true" />}
                iconAfter
              />
            </button>
            {err && (
              <p className="px-5 py-3 font-nunito text-[13px] text-red-600 dark:text-red-400" role="alert">
                {err}
              </p>
            )}
          </div>
        )}

        {/* script controls, only while the script is on the TV */}
        {scriptUp && (
          <div className="mt-3 border border-border-light dark:border-border-dark">
            <div className="grid grid-cols-[1fr_auto_1fr]">
              <button
                type="button"
                onClick={() => bump(-SPEED_STEP)}
                disabled={speed <= SPEED_MIN}
                className={`flex h-14 items-center justify-center gap-2 font-sora text-[14px] font-bold text-text-light disabled:opacity-30 dark:text-text-dark ${FOCUS}`}
              >
                <Minus size={18} aria-hidden="true" /> Slower
              </button>
              <button
                type="button"
                onClick={togglePlay}
                aria-pressed={playing}
                className={`flex w-24 items-center justify-center gap-2 border-x border-border-light font-sora text-[14px] font-bold text-text-light dark:border-border-dark dark:text-text-dark ${FOCUS}`}
              >
                {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
                {playing ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                onClick={() => bump(SPEED_STEP)}
                disabled={speed >= SPEED_MAX}
                className={`flex h-14 items-center justify-center gap-2 font-sora text-[14px] font-bold text-text-light disabled:opacity-30 dark:text-text-dark ${FOCUS}`}
              >
                Faster <Plus size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="h-1 bg-border-light dark:bg-border-dark">
              <div className="h-full bg-primary-light dark:bg-primary-dark" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* polls: available any time, independent of the run of show */}
        <div className="mt-3">
          <PollPicker send={send} />
        </div>

        {/* override: jump anywhere in the script */}
        <details className="mt-6">
          <summary
            className={`cursor-pointer list-none font-mono text-[12px] tracking-widest uppercase text-muted-light dark:text-muted-dark ${FOCUS}`}
          >
            Jump to a section
          </summary>
          <ol className="mt-2 divide-y divide-border-light border border-border-light dark:divide-border-dark dark:border-border-dark">
            {segments.map((seg, i) => (
              <li key={seg.id}>
                <button
                  type="button"
                  onClick={() => send({ type: 'script.jump', value: seg.id })}
                  className={`flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-black/3 dark:hover:bg-white/3 ${FOCUS}`}
                >
                  <span className="w-6 font-mono text-[12px] tabular-nums text-muted-light dark:text-muted-dark">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-sora text-[14px] font-semibold text-text-light dark:text-text-dark">
                      {seg.title}
                    </span>
                    <span className="block text-f9 font-mono tracking-[0.08em] uppercase text-muted-light dark:text-muted-dark">
                      {SPEAKER_LABEL[seg.speaker]}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => {
              send({ type: 'holding' })
              setStepIdx(0)
              setPlaying(false)
            }}
            className={`mt-2 flex h-11 w-full items-center justify-center gap-2 border border-border-light font-mono text-[12px] text-muted-light dark:border-border-dark dark:text-muted-dark ${FOCUS}`}
          >
            <RotateCcw size={14} aria-hidden="true" /> Back to the check-in board
          </button>
        </details>
      </div>
    </div>
  )
}
