'use client'

import { FOCUS, StagePresentation } from '@/lib/constants/stage.constants'
import { useSend } from '@/lib/hooks/useSend'
import { Play, Square } from 'lucide-react'
import { useRef, useState } from 'react'
import { DeckControls } from './_components/DeckControls'
import { LinkStatus } from '../stage/_components/LinkStatus'

export function PresenterRemoteClient({ presentation }: { presentation: StagePresentation }) {
  const { ok, send } = useSend()
  const [live, setLive] = useState(false)
  const [page, setPage] = useState(1)
  const started = useRef(false)

  async function start() {
    if (started.current) return
    started.current = true
    const okSend = await send({ type: 'present.start', presentationId: presentation.id })
    if (okSend) setLive(true)
    else started.current = false
  }

  return (
    <div className="min-h-screen bg-bg-light pb-[max(2rem,env(safe-area-inset-bottom))] dark:bg-bg-dark">
      <div className="mx-auto w-full max-w-105 px-4 pt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-f10 font-mono tracking-[0.12em] uppercase text-primary-light dark:text-primary-dark">
              Your presentation
            </p>
            <h1 className="mt-1 font-sora text-[22px] font-black tracking-tight text-text-light dark:text-text-dark">
              {presentation.fileName}
            </h1>
          </div>
          <LinkStatus ok={ok} />
        </div>

        {!live ? (
          <div className="mt-6 border border-border-light p-4 dark:border-border-dark">
            <p className="font-nunito text-[14px] leading-relaxed text-muted-light dark:text-muted-dark">
              When the host hands it to you, tap below. The TV switches to your{' '}
              {presentation.kind === 'VIDEO' ? 'video' : 'first slide'} and this screen becomes your clicker.
            </p>
            <button
              type="button"
              onClick={start}
              className={`mt-4 flex h-16 w-full items-center justify-center gap-3 bg-primary-light font-sora text-[18px] font-black text-white dark:bg-primary-dark ${FOCUS}`}
            >
              <Play size={22} aria-hidden="true" /> Start on the TV
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <DeckControls presentation={presentation} page={page} setPage={setPage} send={send} showTimer />
            <button
              type="button"
              onClick={() => {
                setLive(false)
                started.current = false
                send({ type: 'present.end' })
              }}
              className={`mt-2 flex h-12 w-full items-center justify-center gap-2 border border-border-light font-mono text-[13px] text-muted-light dark:border-border-dark dark:text-muted-dark ${FOCUS}`}
            >
              <Square size={14} aria-hidden="true" /> I’m done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
