'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { usePdf, usePdfPage } from '@/lib/hooks/usePdf'
import { PollStage } from '../polls/_components/PollStage'
import {
  Matchup,
  Segment,
  Speaker,
  SPEAKER_LABEL,
  SPEED_DEFAULT,
  STAGE_CHANNEL,
  STAGE_EVENT,
  StageCommand,
  StagePresentation
} from '@/lib/constants/stage.constants'

// The TV: Greg's laptop on /attendance. Five states, all driven by the host's
// remote over Pusher. Nothing on this screen is ever touched directly.
//   holding   the live check-in board (your existing component, passed in)
//   script    the opening, scrolled past a reading line, read from 20 feet
//   slides    the presenter's PDF, one page at a time
//   video     the presenter's MP4
//   matchups  this week's 1-2-1 pairs

type Mode = 'holding' | 'script' | 'slides' | 'video' | 'matchups' | 'poll'

const SPEAKER_STYLE: Record<Speaker, { badge: string; rule: string }> = {
  HOST: { badge: 'bg-primary-light text-white', rule: 'border-primary-light' },
  GUIDING_LIGHT: { badge: 'bg-[#f5c542] text-[#1a1400]', rule: 'border-[#f5c542]' },
  EDUCATION: { badge: 'bg-emerald-500 text-white', rule: 'border-emerald-500' }
}

const READ_LINE = 0.34

export default function StageClient({
  segments,
  presentation,
  matchups,
  board
}: {
  segments: Segment[]
  presentation: StagePresentation | null
  matchups: Matchup[]
  /** The live check-in board: name tiles, QR, sound. Shown whenever the stage is idle. */
  board: ReactNode
}) {
  const [mode, setMode] = useState<Mode>('holding')
  const [pollId, setPollId] = useState<string | null>(null)

  // script
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(SPEED_DEFAULT)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const offset = useRef(0)
  const playingRef = useRef(false)
  const speedRef = useRef(SPEED_DEFAULT)

  // presentation
  const [page, setPage] = useState(1)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [size, setSize] = useState({ w: 1920, h: 1080 })

  const { doc } = usePdf(mode === 'slides' && presentation?.kind === 'SLIDES' ? presentation.fileUrl : null)
  const canvasRef = usePdfPage(doc, page, size.w, size.h)

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Script scroll engine: a single rAF loop reading refs, so commands never restart it
  useEffect(() => {
    let frame = 0
    let last = performance.now()
    function loop(now: number) {
      const dt = (now - last) / 1000
      last = now
      const el = trackRef.current
      if (playingRef.current && el) {
        offset.current += speedRef.current * dt
        const max = el.scrollHeight - window.innerHeight * READ_LINE
        if (offset.current >= max) {
          offset.current = max
          playingRef.current = false
          setPlaying(false)
        }
        el.style.transform = `translateY(${-offset.current}px)`
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  function jumpTo(id: string) {
    const el = document.getElementById(`seg-${id}`)
    const track = trackRef.current
    if (!el || !track) return
    offset.current = el.offsetTop
    track.style.transition = 'transform 600ms cubic-bezier(.16,1,.3,1)'
    track.style.transform = `translateY(${-offset.current}px)`
    setTimeout(() => {
      track.style.transition = ''
    }, 650)
  }

  useEffect(() => {
    const channel = getPusherClient().subscribe(STAGE_CHANNEL)

    channel.bind(STAGE_EVENT, (cmd: StageCommand) => {
      switch (cmd.type) {
        case 'holding':
          playingRef.current = false
          setPlaying(false)
          offset.current = 0
          if (trackRef.current) trackRef.current.style.transform = 'translateY(0)'
          setMode('holding')
          break
        case 'script.play':
          setMode('script')
          playingRef.current = true
          setPlaying(true)
          break
        case 'script.pause':
          playingRef.current = false
          setPlaying(false)
          break
        case 'script.speed':
          speedRef.current = cmd.value
          setSpeed(cmd.value)
          break
        case 'script.jump':
          setMode('script')
          // let the script mount before measuring
          requestAnimationFrame(() => jumpTo(cmd.value))
          break
        case 'present.start':
          if (!presentation || presentation.id !== cmd.presentationId) return
          playingRef.current = false
          setPlaying(false)
          setPage(1)
          setMode(presentation.kind === 'VIDEO' ? 'video' : 'slides')
          break
        case 'present.page':
          setPage(cmd.value)
          break
        case 'present.video': {
          const v = videoRef.current
          if (!v) return
          if (cmd.value === 'play') v.play().catch(() => {})
          if (cmd.value === 'pause') v.pause()
          if (cmd.value === 'restart') {
            v.currentTime = 0
            v.play().catch(() => {})
          }
          break
        }
        case 'present.end':
          setMode('script')
          requestAnimationFrame(() => jumpTo('activity'))
          break
        case 'matchups.show':
          playingRef.current = false
          setPlaying(false)
          setMode('matchups')
          break
        case 'poll.show':
          playingRef.current = false
          setPlaying(false)
          setPollId(cmd.pollId)
          setMode('poll')
          break
      }
    })

    return () => {
      channel.unbind_all()
      releaseChannel(STAGE_CHANNEL)
    }
  }, [presentation])

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#06101b] text-white">
      {/* ── Holding: the check-in board ── */}
      {mode === 'holding' && <div className="absolute inset-0">{board}</div>}

      {/* ── Script ── */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${mode === 'script' ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <div
          className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
          style={{ top: `${READ_LINE * 100}vh` }}
          aria-hidden="true"
        >
          <span className="ml-10 h-0 w-0 border-y-18 border-l-26 border-y-transparent border-l-primary-dark" />
          <span className="ml-6 h-px flex-1 bg-white/15" />
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[22vh] bg-linear-to-b from-[#06101b] to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[30vh] bg-linear-to-t from-[#06101b] to-transparent"
          aria-hidden="true"
        />

        <div
          ref={trackRef}
          className="mx-auto w-full max-w-375 px-24 will-change-transform"
          style={{ paddingTop: `${READ_LINE * 100}vh` }}
        >
          {segments.map((seg) => {
            const s = SPEAKER_STYLE[seg.speaker]
            return (
              <section key={seg.id} id={`seg-${seg.id}`} className="pb-40">
                <div className="mb-10 flex items-center gap-6">
                  <span className={`px-6 py-2 font-mono text-[30px] tracking-[0.2em] uppercase ${s.badge}`}>
                    {SPEAKER_LABEL[seg.speaker]}
                  </span>
                  <span className="font-mono text-[30px] tracking-[0.2em] uppercase text-white/45">{seg.title}</span>
                </div>
                {seg.lines.length === 0 && (
                  <p className="mb-12 font-sora text-[150px] font-black leading-[1.02] tracking-[-0.04em] text-balance">
                    {seg.title}
                  </p>
                )}
                {seg.lines.map((line, i) => (
                  <p
                    key={i}
                    className="mb-12 font-sora text-[112px] font-bold leading-[1.18] tracking-[-0.02em] text-balance"
                  >
                    {line}
                  </p>
                ))}
                {seg.handoff && (
                  <div className={`mt-6 border-l-14 pl-10 ${s.rule}`}>
                    <p className="font-mono text-[30px] tracking-[0.2em] uppercase text-white/50">Hand off to</p>
                    <p className="mt-2 font-sora text-[88px] font-black leading-none tracking-[-0.03em]">
                      {seg.handoff.name}
                    </p>
                    {seg.handoff.note && (
                      <p className="mt-4 font-nunito text-[48px] text-white/65">{seg.handoff.note}</p>
                    )}
                  </div>
                )}
              </section>
            )
          })}
          <div className="h-[70vh]" />
        </div>
      </div>

      {/* ── Slides ── */}
      {mode === 'slides' && presentation && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <canvas ref={canvasRef} className="block" />
          <p className="absolute right-10 bottom-8 font-mono text-[26px] tabular-nums text-white/35">
            {presentation.presenter.name} · {page}
            {doc ? ` / ${doc.numPages}` : ''}
          </p>
        </div>
      )}

      {/* ── Video ── */}
      {mode === 'video' && presentation && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            src={presentation.fileUrl}
            className="h-full w-full object-contain"
            playsInline
            preload="auto"
          />
        </div>
      )}

      {/* ── Matchups ── */}
      {mode === 'matchups' && (
        <div className="absolute inset-0 flex flex-col px-24 py-20">
          <p className="font-mono text-[34px] tracking-[0.3em] uppercase text-primary-dark">
            This week\u2019s 1-2-1 matchups
          </p>
          <div className="mt-12 grid flex-1 grid-cols-2 content-start gap-x-20 gap-y-8">
            {matchups.map((m, i) => (
              <div key={i} className="flex items-center gap-8 border-l-10 border-primary-dark pl-8">
                <p className="font-sora text-[64px] font-black leading-none tracking-[-0.03em]">{m.a.name}</p>
                <span className="font-mono text-[40px] text-white/40">+</span>
                <p className="font-sora text-[64px] font-black leading-none tracking-[-0.03em]">{m.b.name}</p>
              </div>
            ))}
            {matchups.length === 0 && (
              <p className="font-nunito text-[48px] text-white/60">No matchups generated for this week.</p>
            )}
          </div>
          <p className="font-nunito text-[44px] text-white/60">
            Find your partner. Get it on the calendar before you leave.
          </p>
        </div>
      )}

      {/* ── Poll ── */}
      {mode === 'poll' && pollId && <PollStage pollId={pollId} />}

      {mode === 'script' && (
        <p className="absolute right-10 bottom-8 z-30 font-mono text-[26px] tabular-nums text-white/30">
          {playing ? 'playing' : 'paused'} · {speed}
        </p>
      )}
    </div>
  )
}
