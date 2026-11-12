import { castVote } from '@/lib/actions/poll/castVote'
import { usePollResults } from '@/lib/hooks/usePollResults'
import { pct } from '@/lib/utils/math.utils'
import { PollView } from '@/types/poll.types'
import { Check, Square } from 'lucide-react'
import { useState, useTransition } from 'react'

export function LivePollControl({
  poll,
  onEnd,
  pending
}: {
  poll: PollView | null
  onEnd: () => void
  pending: boolean
}) {
  const [results] = usePollResults(poll)
  const [picked, setPicked] = useState<string | null>(poll?.myOptionId ?? null)
  const [voting, startVote] = useTransition()

  const options = results?.options ?? poll?.options ?? []
  const total = results?.totalVotes ?? poll?.totalVotes ?? 0
  const status = results?.status ?? poll?.status ?? 'OPEN'
  const open = status === 'OPEN'
  const leader = Math.max(0, ...options.map((o) => o.votes))

  function vote(optionId: string) {
    if (!poll || !open || voting) return
    const prev = picked
    setPicked(optionId)
    startVote(async () => {
      const res = await castVote(poll.id, optionId)
      if (!res.success) setPicked(prev)
    })
  }

  return (
    <div className="border border-primary-light/50 dark:border-primary-dark/50">
      <div className="px-4 pt-3 pb-2.5">
        <p className="flex items-center gap-2 font-mono text-f11 tracking-[0.12em] uppercase text-primary-light dark:text-primary-dark">
          <span className="h-2 w-2 animate-pulse bg-primary-light dark:bg-primary-dark" aria-hidden="true" /> Live on
          every phone
        </p>
        <p className="mt-1 font-sora text-[15px] font-black text-text-light dark:text-text-dark">
          {poll?.question ?? 'Poll'}
        </p>
        <p className="mt-0.5 font-mono text-f12 tabular-nums text-muted-light dark:text-muted-dark">
          {total} {total === 1 ? 'vote' : 'votes'} and counting
        </p>
      </div>

      <ul className="border-t border-border-light dark:border-border-dark">
        {options.map((o) => {
          const mine = picked === o.id
          const p = pct(o.votes, total)
          const winning = !open && o.votes > 0 && o.votes === leader
          return (
            <li key={o.id} className="relative border-b border-border-light last:border-b-0 dark:border-border-dark">
              <span
                className={`absolute inset-y-0 left-0 transition-[width] duration-500 ease-out ${winning ? 'bg-primary-light/20 dark:bg-primary-dark/20' : 'bg-primary-light/10 dark:bg-primary-dark/10'}`}
                style={{ width: `${p}%` }}
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => vote(o.id)}
                disabled={!open || voting}
                aria-pressed={mine}
                className="relative flex w-full items-center gap-2.5 px-4 py-2.5 text-left font-nunito text-[14px] text-text-light disabled:opacity-100 dark:text-text-dark"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center border ${mine ? 'border-primary-light bg-primary-light text-white dark:border-primary-dark dark:bg-primary-dark' : 'border-border-light dark:border-border-dark'}`}
                  aria-hidden="true"
                >
                  {mine && <Check size={11} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                <span className="shrink-0 font-mono text-f11 tabular-nums text-muted-light dark:text-muted-dark">
                  {o.votes} · {p}%
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={onEnd}
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 border-t border-border-light font-sora text-[14px] font-black text-red-500 disabled:opacity-60 dark:border-border-dark"
      >
        <Square size={16} aria-hidden="true" /> {pending ? 'Ending' : 'End the poll'}
      </button>
    </div>
  )
}
