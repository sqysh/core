'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, FileText, Minus, Pause, Play, Plus, SkipBack } from 'lucide-react'
import { getPusherClient } from '@/lib/pusher/pusherClient'
import {
  Segment,
  SPEED_DEFAULT,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_STEP,
  STAGE_CHANNEL,
  STAGE_EVENT,
  StageCommand
} from '@/lib/constants/stage.constants'
import { useWakeLock } from '@/app/(authenticated)/(active)/check-in/_hooks/useWakeLock'
import { Teleprompter, type TeleprompterHandle } from './Teleprompter'

// The teleprompter, on the host's phone. The script used to scroll across the TV, covering the room's screen while
// the host read it from 20 feet; now it plays here, in her hand, and the TV stays on the harbor. It answers the same
// script commands the TV did, whoever sends them (the host's own remote or the super's command deck), so the remotes
// work exactly as before. When the closing words finish it puts the closing screen up on the TV, as the TV used to
// do itself. It keeps the phone awake while the script is up, and can be tucked away to use the remote mid-read.

export type PrompterState = {
  /** a script is up on this phone */
  up: boolean
  playing: boolean
  speed: number
}

export function PhonePrompter({
  segments,
  send,
  onState
}: {
  segments: Segment[]
  send: (cmd: StageCommand) => Promise<boolean>
  /** told whenever the session starts or ends, plays or pauses, or the speed changes, so a remote can mirror it */
  onState?: (s: PrompterState) => void
}) {
  const tp = useRef<TeleprompterHandle | null>(null)
  /** The script is up: a read has started and nothing else has taken the stage since */
  const [up, setUp] = useState(false)
  /** The host has tucked it away to use the remote */
  const [tucked, setTucked] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(SPEED_DEFAULT)
  // a poll covers whatever's up; if that was the script, it comes back when the poll ends
  const upBeforePoll = useRef(false)
  const upRef = useRef(false)
  upRef.current = up

  useWakeLock(up)
  const onStateRef = useRef(onState)
  onStateRef.current = onState
  useEffect(() => {
    onStateRef.current?.({ up, playing, speed })
  }, [up, playing, speed])

  useEffect(() => {
    const channel = getPusherClient().subscribe(STAGE_CHANNEL)
    const onStage = (cmd: StageCommand) => {
      switch (cmd.type) {
        case 'script.play':
          setUp(true)
          setTucked(false)
          tp.current?.play({ countdown: cmd.countdown })
          break
        case 'script.jump':
          setUp(true)
          setTucked(false)
          tp.current?.jump(cmd.value, { countdown: cmd.countdown, play: cmd.play })
          break
        case 'script.pause':
          tp.current?.pause()
          break
        case 'script.speed':
          setSpeed(cmd.value)
          tp.current?.setSpeed(cmd.value)
          break
        case 'script.rewind':
          tp.current?.rewind()
          break
        case 'holding':
          tp.current?.reset()
          setUp(false)
          break
        case 'poll.show':
          if (upRef.current) upBeforePoll.current = true
          tp.current?.pause()
          setUp(false)
          break
        case 'poll.end':
          if (upBeforePoll.current) setUp(true)
          upBeforePoll.current = false
          break
        // these only steer what's already on the TV
        case 'present.page':
        case 'present.video':
          break
        // anything else takes the stage: the script stops and goes away
        default:
          tp.current?.pause()
          setUp(false)
      }
    }
    channel.bind(STAGE_EVENT, onStage)
    return () => {
      channel.unbind(STAGE_EVENT, onStage)
    }
  }, [])

  const shown = up && !tucked
  const key =
    'flex flex-col items-center justify-center gap-1 rounded-xl border border-white/12 bg-white/6 text-white/85 transition-colors active:bg-white/15 disabled:opacity-35'

  return (
    <>
      <div
        className={`fixed inset-0 z-60 overflow-hidden bg-[#06101b] text-white transition-opacity duration-300 ${
          shown ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!shown}
      >
        <Teleprompter
          ref={tp}
          segments={segments}
          active={shown}
          size="phone"
          onPlaying={setPlaying}
          // the closing words just finished: put the closing screen up, as the TV used to on its own
          onEnd={() => void send({ type: 'closing.show' })}
        />

        {/* transport, under her thumb: along the bottom upright, down the right-hand edge held sideways */}
        <div className="absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-[#06101b] via-[#06101b]/95 to-transparent px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-8 landscape:inset-x-auto landscape:inset-y-0 landscape:right-0 landscape:flex landscape:w-[104px] landscape:items-center landscape:bg-linear-to-l landscape:pb-[max(10px,env(safe-area-inset-bottom))] landscape:pl-3 landscape:pr-[max(12px,env(safe-area-inset-right))] landscape:pt-[max(10px,env(safe-area-inset-top))]">
          <div className="mx-auto grid max-w-md grid-cols-[1fr_1fr_1.6fr_1fr_1fr] gap-2 landscape:h-full landscape:w-full landscape:grid-cols-1 landscape:grid-rows-[1fr_1fr_1.4fr_1fr_1fr]">
            <button
              type="button"
              onClick={() => setTucked(true)}
              className={`${key} h-14 landscape:h-auto`}
              aria-label="Back to the remote"
            >
              <ChevronDown size={18} aria-hidden="true" />
              <span className="font-mono text-[9px] tracking-widest uppercase">Remote</span>
            </button>
            <button
              type="button"
              onClick={() => void send({ type: 'script.rewind' })}
              className={`${key} h-14 landscape:h-auto`}
              aria-label="Rewind"
            >
              <SkipBack size={18} aria-hidden="true" />
              <span className="font-mono text-[9px] tracking-widest uppercase">Back</span>
            </button>
            <button
              type="button"
              onClick={() => void send({ type: playing ? 'script.pause' : 'script.play' })}
              aria-pressed={playing}
              className={`${key} h-14 border-primary-dark/40 text-primary-dark landscape:h-auto`}
            >
              {playing ? <Pause size={22} aria-hidden="true" /> : <Play size={22} aria-hidden="true" />}
              <span className="font-mono text-[9px] tracking-widest uppercase">{playing ? 'Pause' : 'Read'}</span>
            </button>
            <button
              type="button"
              onClick={() => void send({ type: 'script.speed', value: Math.max(SPEED_MIN, speed - SPEED_STEP) })}
              disabled={speed <= SPEED_MIN}
              className={`${key} h-14 landscape:h-auto`}
              aria-label="Slower"
            >
              <Minus size={18} aria-hidden="true" />
              <span className="font-mono text-[9px] tracking-widest uppercase">Slower</span>
            </button>
            <button
              type="button"
              onClick={() => void send({ type: 'script.speed', value: Math.min(SPEED_MAX, speed + SPEED_STEP) })}
              disabled={speed >= SPEED_MAX}
              className={`${key} h-14 landscape:h-auto`}
              aria-label="Faster"
            >
              <Plus size={18} aria-hidden="true" />
              <span className="font-mono text-[9px] tracking-widest uppercase">Faster</span>
            </button>
          </div>
        </div>
      </div>

      {/* tucked away mid-read: one tap brings the script back */}
      {up && tucked && (
        <button
          type="button"
          onClick={() => setTucked(false)}
          className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] left-1/2 z-60 flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary-dark/40 bg-[#06101b]/95 px-5 py-3 font-sora text-[14px] font-black text-white shadow-[0_8px_28px_rgba(0,0,0,0.4)] backdrop-blur"
        >
          <FileText size={16} className="text-primary-dark" aria-hidden="true" />
          {playing ? 'Script is reading · tap to read' : 'Back to the script'}
        </button>
      )}
    </>
  )
}
