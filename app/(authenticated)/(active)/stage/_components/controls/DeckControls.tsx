import { PRESENTATION_MINUTES, StageCommand, StagePresentation } from '@/lib/constants/stage.constants'
import { usePdf, usePdfThumbs } from '@/lib/hooks/usePdf'
import { useSounds } from '@/lib/hooks/useSounds'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark'

export function DeckControls({
  presentation,
  page,
  setPage,
  send,
  showTimer
}: {
  presentation: StagePresentation
  page: number
  setPage: (p: number) => void
  send: (c: StageCommand) => Promise<boolean>
  showTimer: boolean
}) {
  const { play } = useSounds({ enabled: true, volume: 0.3 })
  const { doc } = usePdf(presentation.kind === 'SLIDES' ? presentation.fileUrl : null)
  const thumbs = usePdfThumbs(doc, 140)
  const total = doc?.numPages ?? presentation.pageCount ?? 0
  const [videoState, setVideoState] = useState<'paused' | 'playing'>('paused')

  // elapsed timer against the ten minutes
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(id)
  }, [])
  const limit = PRESENTATION_MINUTES * 60
  const timerTone =
    elapsed >= limit
      ? 'text-red-600 dark:text-red-400'
      : elapsed >= limit - 120
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-text-light dark:text-text-dark'
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  function go(p: number) {
    if (p < 1 || (total && p > total)) return
    setPage(p)
    play('se2')
    send({ type: 'present.page', value: p })
  }

  // volume keys / clicker / keyboard on a laptop remote
  useEffect(() => {
    if (presentation.kind !== 'SLIDES') return
    function onKey(e: KeyboardEvent) {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault()
        go(page + 1)
      }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) {
        e.preventDefault()
        go(page - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, total, presentation.kind])

  if (presentation.kind === 'VIDEO') {
    return (
      <div className="border border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between border-b border-border-light px-4 py-3 dark:border-border-dark">
          <p className="min-w-0 truncate font-mono text-[13px] text-muted-light dark:text-muted-dark">
            {presentation.fileName}
          </p>
          {showTimer && (
            <p className={`font-sora text-[20px] font-black tabular-nums ${timerTone}`}>
              {mm}:{ss}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            const next = videoState === 'playing' ? 'pause' : 'play'
            setVideoState(next === 'play' ? 'playing' : 'paused')
            send({ type: 'present.video', value: next })
          }}
          className={`flex h-28 w-full items-center justify-center gap-4 font-sora text-[26px] font-black text-white ${
            videoState === 'playing' ? 'bg-amber-500' : 'bg-primary-light dark:bg-primary-dark'
          } ${FOCUS}`}
        >
          {videoState === 'playing' ? <Pause size={34} aria-hidden="true" /> : <Play size={34} aria-hidden="true" />}
          {videoState === 'playing' ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={() => {
            setVideoState('playing')
            send({ type: 'present.video', value: 'restart' })
          }}
          className={`flex h-12 w-full items-center justify-center gap-2 border-t border-border-light font-mono text-[13px] text-muted-light dark:border-border-dark dark:text-muted-dark ${FOCUS}`}
        >
          <RotateCcw size={14} aria-hidden="true" /> From the top
        </button>
      </div>
    )
  }

  return (
    <div className="border border-border-light dark:border-border-dark">
      <div className="flex items-center justify-between border-b border-border-light px-4 py-3 dark:border-border-dark">
        <p className="font-sora text-[20px] font-black tabular-nums text-text-light dark:text-text-dark">
          {page}
          <span className="text-muted-light dark:text-muted-dark"> / {total || '…'}</span>
        </p>
        {showTimer && (
          <p className={`font-sora text-[20px] font-black tabular-nums ${timerTone}`}>
            {mm}:{ss}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          aria-label="Previous slide"
          className={`flex h-32 items-center justify-center border-r border-border-light text-text-light hover:bg-black/3 disabled:opacity-30 dark:border-border-dark dark:text-text-dark dark:hover:bg-white/3 ${FOCUS}`}
        >
          <ChevronLeft size={44} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={total > 0 && page >= total}
          aria-label="Next slide"
          className={`flex h-32 items-center justify-center bg-primary-light text-white hover:opacity-90 disabled:opacity-30 dark:bg-primary-dark ${FOCUS}`}
        >
          <ChevronRight size={56} aria-hidden="true" />
        </button>
      </div>

      {/* thumbnail strip */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-border-light p-3 dark:border-border-dark">
        {thumbs.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i + 1)}
            aria-label={`Slide ${i + 1}`}
            aria-current={page === i + 1 ? 'true' : undefined}
            className={`shrink-0 border-2 ${page === i + 1 ? 'border-primary-light dark:border-primary-dark' : 'border-transparent'} ${FOCUS}`}
          >
            <img src={src} alt="" className="block h-16 w-auto" />
          </button>
        ))}
      </div>

      {presentation.notes && (
        <div className="border-t border-border-light px-4 py-3 dark:border-border-dark">
          <p className="text-f9 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark">
            Your notes
          </p>
          <p className="mt-1 whitespace-pre-wrap font-nunito text-[14px] leading-relaxed text-text-light dark:text-text-dark">
            {presentation.notes}
          </p>
        </div>
      )}
    </div>
  )
}
