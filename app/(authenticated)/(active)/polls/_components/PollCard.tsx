import { castVote } from '@/lib/actions/poll/castVote'
import { closePoll } from '@/lib/actions/poll/closePoll'
import { deletePoll } from '@/lib/actions/poll/deletePoll'
import { usePollResults } from '@/lib/hooks/usePollResults'
import { pct } from '@/lib/utils/math.utils'
import { PollView } from '@/types/poll.types'
import { Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export function PollCard({ poll, me }: { poll: PollView; me: string }) {
  const router = useRouter()
  const [results] = usePollResults(poll)
  const [picked, setPicked] = useState<string | null>(poll.myOptionId)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const status = results?.status ?? poll.status
  const options = results?.options ?? poll.options
  const total = results?.totalVotes ?? poll.totalVotes
  const open = status === 'OPEN'
  const showBars = !open || picked !== null
  const leader = Math.max(0, ...options.map((o) => o.votes))

  function vote(optionId: string) {
    if (!open || pending) return
    const prev = picked
    setPicked(optionId)
    setError(null)
    start(async () => {
      const res = await castVote(poll.id, optionId)
      if (!res.success) {
        setPicked(prev)
        setError(res.error)
      }
    })
  }

  function close() {
    start(async () => {
      const res = await closePoll(poll.id)
      if (!res.success) setError(res.error)
      else router.refresh()
    })
  }

  function remove() {
    start(async () => {
      const res = await deletePoll(poll.id)
      if (!res.success) setError(res.error)
      else router.refresh()
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
        <h2 className="mt-1 font-sora text-[18px] font-black leading-snug tracking-tight text-text-light dark:text-text-dark text-balance">
          {poll.question}
        </h2>
      </div>

      <ul className="divide-y divide-border-light dark:divide-border-dark border-t border-border-light dark:border-border-dark">
        {options.map((o) => {
          const mine = picked === o.id
          const p = pct(o.votes, total)
          const winning = !open && o.votes > 0 && o.votes === leader
          return (
            <li key={o.id} className="relative">
              {showBars && (
                <span
                  className={`absolute inset-y-0 left-0 transition-[width] duration-500 ease-out ${winning ? 'bg-primary-light/25 dark:bg-primary-dark/25' : 'bg-primary-light/10 dark:bg-primary-dark/10'}`}
                  style={{ width: `${p}%` }}
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                onClick={() => vote(o.id)}
                disabled={!open || pending}
                aria-pressed={mine}
                className={`relative flex w-full items-center gap-3 px-4 py-3 text-left font-nunito text-[15px] text-text-light dark:text-text-dark ${open ? 'hover:bg-primary-light/5 dark:hover:bg-primary-dark/5' : 'cursor-default'} disabled:opacity-100`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center border ${mine ? 'border-primary-light bg-primary-light text-white dark:border-primary-dark dark:bg-primary-dark' : 'border-border-light dark:border-border-dark'}`}
                  aria-hidden="true"
                >
                  {mine && <Check size={14} strokeWidth={3} />}
                </span>
                <span className={`flex-1 ${winning ? 'font-bold' : ''}`}>{o.label}</span>
                {showBars && (
                  <span className="font-mono text-f12 tabular-nums text-muted-light dark:text-muted-dark">
                    {o.votes} · {p}%
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {(error || poll.canClose || (open && picked === null)) && (
        <div className="flex items-center justify-between gap-3 border-t border-border-light px-4 py-2.5 dark:border-border-dark">
          <p className={`font-nunito text-f12 ${error ? 'text-red-500' : 'text-muted-light dark:text-muted-dark'}`}>
            {error ??
              (open && picked === null
                ? 'Tap an option to vote. You can change it until the poll closes.'
                : open
                  ? 'Your vote is in.'
                  : '')}
          </p>
          {poll.canClose && (
            <div className="flex shrink-0 gap-3">
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
        </div>
      )}
    </article>
  )
}
