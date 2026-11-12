'use client'

// app/(authenticated)/(active)/stage/_components/Teleprompter.tsx
// The scrolling script on the TV: the speaking engine (a cursor that moves
// through reading "cost", lighting letters and easing the scroll), the 3-2-1
// countdown before a read, and the stop-at-section-end behavior. The stage
// drives it through the ref handle below instead of reaching into its internals.

import { forwardRef, Fragment, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Segment, Speaker, SPEAKER_LABEL, SPEED_DEFAULT } from '@/lib/constants/stage.constants'

// kept-alive audio per sound, rewound before each play (plays once the TV is armed
// by the start gate). public/sound-effects/<name>.mp3
const audioCache = new Map<string, HTMLAudioElement>()
function playSfx(name: string, vol = 0.5) {
  try {
    let a = audioCache.get(name)
    if (!a) {
      a = new Audio(`/sound-effects/${name}.mp3`)
      audioCache.set(name, a)
    }
    a.volume = vol
    a.currentTime = 0
    a.play().catch(() => {})
  } catch {}
}

const SPEAKER_STYLE: Record<Speaker, { badge: string; rule: string }> = {
  HOST: { badge: 'bg-primary-light text-white', rule: 'border-primary-light' },
  GUIDING_LIGHT: { badge: 'bg-[#f5c542] text-[#1a1400]', rule: 'border-[#f5c542]' },
  EDUCATION: { badge: 'bg-emerald-500 text-white', rule: 'border-emerald-500' },
  CO_DIRECTOR: { badge: 'bg-slate-500 text-white', rule: 'border-slate-500' },
  TREASURER: { badge: 'bg-indigo-500 text-white', rule: 'border-indigo-500' },
  EVENT_COORDINATOR: { badge: 'bg-orange-500 text-white', rule: 'border-orange-500' },
  MEMBERSHIP: { badge: 'bg-teal-500 text-white', rule: 'border-teal-500' }
}

const READ_LINE = 0.34

export interface TeleprompterHandle {
  /** start reading; with { countdown: true } a 3-2-1 plays first */
  play: (opts?: { countdown?: boolean }) => void
  pause: () => void
  setSpeed: (value: number) => void
  /** jump to a section id; { countdown } plays a 3-2-1 first, { play } reads on its own with no countdown */
  jump: (id: string, opts?: { countdown?: boolean; play?: boolean }) => void
  rewind: () => void
  /** clear everything back to the top (for the holding state) */
  reset: () => void
}

export const Teleprompter = forwardRef<
  TeleprompterHandle,
  { segments: Segment[]; active: boolean; onEnd?: () => void }
>(function Teleprompter({ segments, active, onEnd }, ref) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeedState] = useState(SPEED_DEFAULT)
  // the big 3-2-1 before a read starts
  const [countdown, setCountdown] = useState<number | null>(null)

  // fires when the read reaches the very end of the script (the closing words),
  // so the stage can move on by itself. kept in a ref for the mount-once loop.
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const trackRef = useRef<HTMLDivElement | null>(null)
  const offset = useRef(0)
  const playingRef = useRef(false)
  const speedRef = useRef(SPEED_DEFAULT)

  // speaking cursor: every character, its reading cost, and its line position.
  const charsRef = useRef<{ el: HTMLElement; cum: number; top: number }[]>([])
  const totalCostRef = useRef(0)
  const cursorRef = useRef(0)
  const litRef = useRef(0)
  const activeRef = useRef(-1)
  // cumulative cost at the end of each text segment, so play stops there and
  // waits instead of running on into the next section's lines
  const segEndsRef = useRef<number[]>([])

  // tick the countdown down once a second, a beep on each number, then start
  // the reading on its own with a go tone
  useEffect(() => {
    if (countdown === null) return
    playSfx('ui-tick', 0.5)
    const id = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1)
      } else {
        setCountdown(null)
        playSfx('ui-play', 0.5)
        playingRef.current = true
        setPlaying(true)
      }
    }, 1000)
    return () => clearTimeout(id)
  }, [countdown])

  // Speaking engine: one rAF loop. The cursor moves through reading "cost" at a
  // talking rate; letters light as it passes; the scroll eases to the active one.
  useEffect(() => {
    let frame = 0
    let last = performance.now()
    function loop(now: number) {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const chars = charsRef.current
      const track = trackRef.current

      if (playingRef.current && chars.length) {
        // speedRef is px/sec in the old model; here read it as chars/sec ÷ 4
        const prev = cursorRef.current
        cursorRef.current += dt * (speedRef.current / 4)
        // stop at the end of the current segment (the first boundary strictly
        // past where this frame started), so the host advances when ready
        let stop = totalCostRef.current
        for (const e of segEndsRef.current) {
          if (e > prev) {
            stop = e
            break
          }
        }
        if (cursorRef.current >= stop) {
          cursorRef.current = stop
          playingRef.current = false
          setPlaying(false)
          // closing words just finished: only when we actually read INTO the end
          // (prev < stop), never when play started already parked at the end
          if (prev < stop && stop >= totalCostRef.current - 1) onEndRef.current?.()
        }
      }

      if (chars.length) {
        const cursor = cursorRef.current
        let target = litRef.current
        while (target < chars.length && chars[target].cum <= cursor) {
          chars[target].el.classList.add('tp-lit')
          target++
        }
        while (target > 0 && chars[target - 1].cum > cursor) {
          target--
          chars[target].el.classList.remove('tp-lit', 'tp-active')
        }
        const activeIdx = target - 1
        if (activeIdx !== activeRef.current) {
          if (activeRef.current >= 0 && chars[activeRef.current])
            chars[activeRef.current].el.classList.remove('tp-active')
          if (activeIdx >= 0 && chars[activeIdx]) chars[activeIdx].el.classList.add('tp-active')
          activeRef.current = activeIdx
        }
        litRef.current = target

        // ease the scroll so the active letter sits on the reading line
        if (track && activeIdx >= 0) {
          const want = chars[activeIdx].top - window.innerHeight * READ_LINE
          offset.current += (want - offset.current) * Math.min(1, dt * 5)
          track.style.transform = `translateY(${-Math.max(0, offset.current)}px)`
        }
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  // measure every character: its line position and cumulative reading cost
  // (letters cost 1, spaces less, punctuation more so the cursor lingers)
  const [measureTick, setMeasureTick] = useState(0)
  useEffect(() => {
    const onResize = () => setMeasureTick((t) => t + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const raf = requestAnimationFrame(() => {
      const tr = track.getBoundingClientRect()
      const els = Array.from(track.querySelectorAll<HTMLElement>('[data-char]'))
      let cum = 0
      charsRef.current = els.map((el) => {
        const ch = el.textContent ?? ''
        const cost = /[.!?]/.test(ch) ? 7 : /[,;:—…]/.test(ch) ? 3.5 : ch === ' ' ? 0.6 : 1
        cum += cost
        el.classList.remove('tp-lit', 'tp-active')
        return { el, cum, top: el.getBoundingClientRect().top - tr.top }
      })
      totalCostRef.current = cum

      // record the cumulative cost at the last character of each text segment;
      // a segment marked `flow` reads straight into the next one, so no stop there
      const ends: number[] = []
      for (const seg of segments) {
        if (seg.flow) continue
        const sec = document.getElementById(`seg-${seg.id}`)
        if (!sec) continue
        let lastCum = -1
        for (const c of charsRef.current) if (sec.contains(c.el)) lastCum = c.cum
        if (lastCum >= 0) ends.push(lastCum)
      }
      segEndsRef.current = ends.sort((a, b) => a - b)

      cursorRef.current = 0
      litRef.current = 0
      activeRef.current = -1
      offset.current = 0
    })
    return () => cancelAnimationFrame(raf)
  }, [segments, measureTick])

  function jumpTo(id: string) {
    const section = document.getElementById(`seg-${id}`)
    const track = trackRef.current
    const chars = charsRef.current
    if (!section || !track || !chars.length) return

    const first = chars.findIndex((c) => section.contains(c.el))
    if (first >= 0) {
      // readable segment: put its first letter on the reading line, ready to read
      cursorRef.current = chars[first].cum
      litRef.current = first + 1
      activeRef.current = first
      for (let k = 0; k < chars.length; k++) {
        chars[k].el.classList.toggle('tp-lit', k <= first)
        chars[k].el.classList.toggle('tp-active', k === first)
      }
      // the loop eases the scroll to the active letter from here
      return
    }

    // cue-card segment (no text): scroll straight to it, no active letter
    const before = (el: Element) => !!(el.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING)
    let b = 0
    while (b < chars.length && before(chars[b].el)) b++
    cursorRef.current = b === 0 ? 0 : chars[b - 1].cum
    litRef.current = b
    activeRef.current = -1
    for (let k = 0; k < chars.length; k++) {
      chars[k].el.classList.toggle('tp-lit', k < b)
      chars[k].el.classList.remove('tp-active')
    }
    const top = section.getBoundingClientRect().top - track.getBoundingClientRect().top
    offset.current = Math.max(0, top - window.innerHeight * 0.15)
    track.style.transform = `translateY(${-offset.current}px)`
  }

  useImperativeHandle(ref, () => ({
    play: (opts) => {
      if (opts?.countdown) {
        // opening the meeting: start the read from the very top, so a restart
        // after the closing words doesn't begin parked at the end
        cursorRef.current = 0
        litRef.current = 0
        activeRef.current = -1
        offset.current = 0
        for (const c of charsRef.current) c.el.classList.remove('tp-lit', 'tp-active')
        if (trackRef.current) trackRef.current.style.transform = 'translateY(0)'
        playingRef.current = false
        setPlaying(false)
        setCountdown(3)
      } else {
        setCountdown(null)
        playingRef.current = true
        setPlaying(true)
      }
    },
    pause: () => {
      playingRef.current = false
      setPlaying(false)
      setCountdown(null)
    },
    setSpeed: (value) => {
      speedRef.current = value
      setSpeedState(value)
    },
    jump: (id, opts) => {
      // let the script mount/measure before jumping
      requestAnimationFrame(() => jumpTo(id))
      if (opts?.countdown) {
        playingRef.current = false
        setPlaying(false)
        setCountdown(3)
      } else if (opts?.play) {
        // read straight away, no countdown
        setCountdown(null)
        requestAnimationFrame(() => {
          playingRef.current = true
          setPlaying(true)
        })
      }
    },
    rewind: () => {
      cursorRef.current = Math.max(0, cursorRef.current - 90)
    },
    reset: () => {
      playingRef.current = false
      setPlaying(false)
      offset.current = 0
      if (trackRef.current) trackRef.current.style.transform = 'translateY(0)'
      for (const c of charsRef.current) c.el.classList.remove('tp-lit', 'tp-active')
      cursorRef.current = 0
      litRef.current = 0
      activeRef.current = -1
      setCountdown(null)
    }
  }))

  return (
    <>
      <style>{`
          [data-char] { color: rgba(255,255,255,0.22); }
          [data-char].tp-lit { color: #fff; }
          [data-char].tp-active { color: #fff; text-shadow: 0 0 26px rgba(96,165,250,0.6); }
          .cd-pop { animation: cdPop 1s ease-out both }
          @keyframes cdPop {
            0% { transform: scale(1.4); opacity: 0 }
            18% { transform: scale(1); opacity: 1 }
            82% { opacity: 1 }
            100% { transform: scale(0.94); opacity: 0 }
          }
        `}</style>

      {/* ── Countdown before the read ── */}
      {active && countdown !== null && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#06101b]">
          <span
            key={countdown}
            className="cd-pop font-sora text-[42vh] font-black leading-none tabular-nums text-white [text-shadow:0_0_80px_rgba(96,165,250,0.55)]"
          >
            {countdown}
          </span>
        </div>
      )}

      {/* ── Script ── */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
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
                {seg.lines.map((line, i) => {
                  const ws = line.split(' ')
                  return (
                    <p
                      key={i}
                      className="mb-16 font-sora text-[112px] font-bold leading-[1.4] tracking-[-0.02em] text-balance"
                    >
                      {ws.map((word, wi) => (
                        <Fragment key={wi}>
                          <span className="inline-block whitespace-nowrap">
                            {word.split('').map((ch, ci) => (
                              <span key={ci} data-char className="transition-colors duration-100 ease-out">
                                {ch}
                              </span>
                            ))}
                          </span>
                          {wi < ws.length - 1 && (
                            <span data-char className="transition-colors duration-100 ease-out">
                              {' '}
                            </span>
                          )}
                        </Fragment>
                      ))}
                    </p>
                  )
                })}
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

      {/* ── Transport readout ── */}
      {active && (
        <p className="absolute right-10 bottom-8 z-30 font-mono text-[26px] tabular-nums text-white/30">
          {playing ? 'playing' : 'paused'} &middot; {speed}
        </p>
      )}
    </>
  )
})
