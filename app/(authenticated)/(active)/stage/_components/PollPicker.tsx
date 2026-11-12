'use client'

import { getPolls } from '@/lib/actions/poll/getPolls'
import { launchPoll } from '@/lib/actions/poll/launchPoll'
import { PollView } from '@/types/poll.types'
import { BarChart3, Send } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'

/**
 * Drop into HostRemoteClient next to the matchups button. Lists open polls
 * (then the latest closed one so final results can go back up) and sends
 * poll.show for the tap. `send` is the remote's existing useSend().
 */
export function PollPicker({ send }: { send: (cmd: { type: 'poll.show'; pollId: string }) => void }) {
  const [polls, setPolls] = useState<PollView[]>([])
  const [openList, setOpenList] = useState(false)
  const [, start] = useTransition()

  function load() {
    start(async () => {
      const res = await getPolls()
      if (res.success)
        setPolls(
          res.data.filter((p, i, arr) => p.status === 'OPEN' || arr.findIndex((q) => q.status === 'CLOSED') === i)
        )
    })
  }

  useEffect(load, [])

  // send it to every phone AND the TV
  function launch(pollId: string) {
    launchPoll(pollId)
    send({ type: 'poll.show', pollId })
  }

  if (polls.length === 0) return null

  // one poll: a single button, no list to pick from
  if (polls.length === 1) {
    const p = polls[0]
    return (
      <button
        type="button"
        onClick={() => launch(p.id)}
        className="flex h-16 w-full items-center gap-3 border border-border-light px-4 text-left dark:border-border-dark"
      >
        <Send size={20} className="shrink-0 text-primary-light dark:text-primary-dark" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block font-sora text-[15px] font-black text-text-light dark:text-text-dark">
            Launch poll to everyone
          </span>
          <span className="block truncate font-nunito text-f12 text-muted-light dark:text-muted-dark">
            {p.question} · {p.totalVotes} {p.totalVotes === 1 ? 'vote' : 'votes'}
          </span>
        </span>
      </button>
    )
  }

  return (
    <div className="border border-border-light dark:border-border-dark">
      <button
        type="button"
        onClick={() => setOpenList((v) => !v)}
        className="flex h-16 w-full items-center gap-3 px-4 text-left text-text-light dark:text-text-dark"
      >
        <Send size={20} className="shrink-0 text-primary-light dark:text-primary-dark" aria-hidden="true" />
        <span className="font-sora text-[15px] font-black">Launch a poll to everyone</span>
        <span className="ml-auto font-mono text-f11 text-muted-light dark:text-muted-dark">
          {polls.length} {polls.length === 1 ? 'poll' : 'polls'}
        </span>
      </button>
      {openList && (
        <ul className="divide-y divide-border-light border-t border-border-light dark:divide-border-dark dark:border-border-dark">
          {polls.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  launch(p.id)
                  setOpenList(false)
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-text-light dark:text-text-dark"
              >
                <span
                  className={`h-2 w-2 shrink-0 ${p.status === 'OPEN' ? 'bg-primary-light dark:bg-primary-dark' : 'bg-muted-light/40 dark:bg-muted-dark/40'}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate font-nunito text-[14px]">{p.question}</span>
                <span className="shrink-0 font-mono text-f11 tabular-nums text-muted-light dark:text-muted-dark">
                  {p.totalVotes}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
