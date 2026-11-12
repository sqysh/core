import { castVote } from '@/lib/actions/poll/castVote'
import { usePollResults } from '@/lib/hooks/usePollResults'
import { pct } from '@/lib/utils/math.utils'
import { PollView } from '@/types/poll.types'
import { Check, X } from 'lucide-react'
import { useState, useTransition } from 'react'

export function LivePollCard({ poll }: { poll: PollView }) {
  const [results] = usePollResults(poll)
  const [picked, setPicked] = useState<string | null>(poll.myOptionId)
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
    start(async () => {
      const res = await castVote(poll.id, optionId)
      if (!res.success) setPicked(prev)
    })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-[460px] border border-border-light bg-bg-light shadow-2xl dark:border-border-dark dark:bg-bg-dark">
        <div className="px-4 pt-4 pb-3">
          <p className="text-f10 font-mono tracking-[0.12em] uppercase text-primary-light dark:text-primary-dark">
            {open ? 'Group vote · live' : 'Group vote · final'} · {total} {total === 1 ? 'vote' : 'votes'}
          </p>
          <h2 className="mt-1 font-sora text-[20px] font-black leading-snug tracking-tight text-balance text-text-light dark:text-text-dark">
            {poll.question}
          </h2>
        </div>

        <ul className="divide-y divide-border-light border-t border-border-light dark:divide-border-dark dark:border-border-dark">
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
                  className={`relative flex w-full items-center gap-3 px-4 py-3.5 text-left font-nunito text-[16px] text-text-light dark:text-text-dark ${open ? 'hover:bg-primary-light/5 dark:hover:bg-primary-dark/5' : 'cursor-default'} disabled:opacity-100`}
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

        <p className="border-t border-border-light px-4 py-2.5 font-nunito text-f12 text-muted-light dark:border-border-dark dark:text-muted-dark">
          {open
            ? picked === null
              ? 'Tap an option to vote. You can change it until it closes.'
              : 'Your vote is in.'
            : 'Voting is closed.'}
        </p>
      </div>
    </div>
  )
}
