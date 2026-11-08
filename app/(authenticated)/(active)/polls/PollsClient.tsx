'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PollView } from '@/types/poll.types'
import { NewPollForm } from './_components/NewPollForm'
import { Plus } from 'lucide-react'
import { PollCard } from './_components/PollCard'

export function PollsClient({ polls, me }: { polls: PollView[]; me: string }) {
  const router = useRouter()
  const [creating, setCreating] = useState(polls.length === 0)
  const open = polls.filter((p) => p.status === 'OPEN')
  const closed = polls.filter((p) => p.status === 'CLOSED')

  return (
    <div className="mx-auto w-full max-w-140 px-4 py-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-f10 font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">
            Group vote
          </p>
          <h1 className="font-sora text-[22px] font-black tracking-tight text-text-light dark:text-text-dark">Polls</h1>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-10 items-center gap-2 border border-border-light px-3 font-mono text-f11 tracking-widest uppercase text-text-light hover:border-primary-light dark:border-border-dark dark:text-text-dark dark:hover:border-primary-dark"
          >
            <Plus size={14} /> New poll
          </button>
        )}
      </div>

      <div className="space-y-4">
        {creating && (
          <NewPollForm
            onCancel={() => setCreating(false)}
            onDone={() => {
              setCreating(false)
              router.refresh()
            }}
          />
        )}
        {open.map((p) => (
          <PollCard key={p.id} poll={p} me={me} />
        ))}
        {open.length === 0 && !creating && (
          <p className="border border-dashed border-border-light px-4 py-6 text-center font-nunito text-[14px] text-muted-light dark:border-border-dark dark:text-muted-dark">
            Nothing to vote on right now. Anyone can start one.
          </p>
        )}
        {closed.length > 0 && (
          <>
            <p className="pt-4 text-f10 font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">
              Recent results
            </p>
            {closed.map((p) => (
              <PollCard key={p.id} poll={p} me={me} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
