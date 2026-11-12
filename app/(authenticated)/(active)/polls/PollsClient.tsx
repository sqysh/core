// Create + manage polls. Voting never happens here anymore: the host launches a
// poll from the remote and everyone votes on their phone. This page is where
// anyone starts a poll, and a read-only record of what's been made.
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { NewPollForm } from './_components/NewPollForm'
import { PollView } from '@/types/poll.types'
import { closePoll } from '@/lib/actions/poll/closePoll'
import { deletePoll } from '@/lib/actions/poll/deletePoll'
import { pct } from '@/lib/utils/math.utils'

function PollRow({ poll, me }: { poll: PollView; me: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const open = poll.status === 'OPEN'
  const total = poll.totalVotes
  const leader = Math.max(0, ...poll.options.map((o) => o.votes))

  function close() {
    start(async () => {
      const res = await closePoll(poll.id)
      if (res.success) router.refresh()
    })
  }
  function remove() {
    start(async () => {
      const res = await deletePoll(poll.id)
      if (res.success) router.refresh()
    })
  }

  return (
    <article
      className={`border ${open ? 'border-primary-light/40 dark:border-primary-dark/40' : 'border-border-light dark:border-border-dark'}`}
    >
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-f10 font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">
            {open ? 'Open' : 'Closed'} · {poll.createdBy.id === me ? 'you' : poll.createdBy.name.split(' ')[0]} ·{' '}
            {total} {total === 1 ? 'vote' : 'votes'}
          </p>
          {open && <span className="h-2 w-2 bg-primary-light dark:bg-primary-dark" aria-hidden="true" />}
        </div>
        <h2 className="mt-1 font-sora text-[18px] font-black leading-snug tracking-tight text-balance text-text-light dark:text-text-dark">
          {poll.question}
        </h2>
      </div>

      <ul className="divide-y divide-border-light border-t border-border-light dark:divide-border-dark dark:border-border-dark">
        {poll.options.map((o) => {
          const p = pct(o.votes, total)
          const winning = !open && o.votes > 0 && o.votes === leader
          return (
            <li key={o.id} className="relative">
              <span
                className={`absolute inset-y-0 left-0 ${winning ? 'bg-primary-light/25 dark:bg-primary-dark/25' : 'bg-primary-light/10 dark:bg-primary-dark/10'}`}
                style={{ width: `${p}%` }}
                aria-hidden="true"
              />
              <div className="relative flex items-center gap-3 px-4 py-2.5 font-nunito text-[15px] text-text-light dark:text-text-dark">
                <span className={`flex-1 ${winning ? 'font-bold' : ''}`}>{o.label}</span>
                <span className="font-mono text-f12 tabular-nums text-muted-light dark:text-muted-dark">
                  {o.votes} · {p}%
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      {poll.canClose && (
        <div className="flex items-center justify-end gap-3 border-t border-border-light px-4 py-2.5 dark:border-border-dark">
          {open ? (
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="font-mono text-f11 tracking-widest uppercase text-primary-light hover:underline dark:text-primary-dark"
            >
              Close poll
            </button>
          ) : (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="font-mono text-f11 tracking-widest uppercase text-muted-light hover:text-red-500 dark:text-muted-dark"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </article>
  )
}

export function PollsClient({ polls, me }: { polls: PollView[]; me: string }) {
  const router = useRouter()
  const [creating, setCreating] = useState(polls.length === 0)
  const open = polls.filter((p) => p.status === 'OPEN')
  const closed = polls.filter((p) => p.status === 'CLOSED')

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <div className="mx-auto w-full max-w-140 px-4 py-6">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-f10 font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">
              Group vote
            </p>
            <h1 className="font-sora text-[22px] font-black tracking-tight text-text-light dark:text-text-dark">
              Polls
            </h1>
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

        <p className="mb-4 border border-dashed border-border-light px-4 py-3 font-nunito text-f12 leading-relaxed text-muted-light dark:border-border-dark dark:text-muted-dark">
          Anyone can start a poll anytime. The host launches it from the remote when it’s time, and everyone votes on
          their phone.
        </p>

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
            <PollRow key={p.id} poll={p} me={me} />
          ))}
          {open.length === 0 && !creating && (
            <p className="border border-dashed border-border-light px-4 py-6 text-center font-nunito text-[14px] text-muted-light dark:border-border-dark dark:text-muted-dark">
              No polls yet. Start one above.
            </p>
          )}
          {closed.length > 0 && (
            <>
              <p className="pt-4 text-f10 font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">
                Recent results
              </p>
              {closed.map((p) => (
                <PollRow key={p.id} poll={p} me={me} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
