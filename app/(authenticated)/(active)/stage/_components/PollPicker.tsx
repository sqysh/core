'use client'

import { closePoll } from '@/lib/actions/poll/closePoll'
import { getLivePoll } from '@/lib/actions/poll/getLivePoll'
import { getPoll } from '@/lib/actions/poll/getPoll'
import { getPolls } from '@/lib/actions/poll/getPolls'
import { launchPoll } from '@/lib/actions/poll/launchPoll'
import { POLL_CLEAR_EVENT, POLL_LAUNCH_EVENT, POLL_LIVE_CHANNEL, PollLaunch } from '@/lib/constants/poll.constants'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { PollView } from '@/types/poll.types'
import { BarChart3, Send } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { LivePollControl } from './LivePollControl'

export function PollPicker({
  send
}: {
  send: (cmd: { type: 'poll.show'; pollId: string } | { type: 'poll.end' }) => void
}) {
  const [polls, setPolls] = useState<PollView[]>([])
  const [live, setLive] = useState<PollView | null>(null)
  const [openList, setOpenList] = useState(false)
  const [pending, start] = useTransition()

  function load() {
    start(async () => {
      const res = await getPolls()
      if (res.success) setPolls(res.data.filter((p) => p.status === 'OPEN'))
    })
  }

  // Recover the live poll on mount and stay in sync, so a phone sleep or reload
  // never drops the inline control.
  useEffect(() => {
    load()
    getLivePoll().then((res) => {
      if (res.success) setLive(res.data)
    })

    const channel = getPusherClient().subscribe(POLL_LIVE_CHANNEL)
    const onLaunch = async (d: PollLaunch) => {
      const res = await getPoll(d.pollId)
      if (res.success) setLive(res.data)
    }
    const onClear = () => setLive(null)
    channel.bind(POLL_LAUNCH_EVENT, onLaunch)
    channel.bind(POLL_CLEAR_EVENT, onClear)
    return () => {
      channel.unbind_all()
      releaseChannel(POLL_LIVE_CHANNEL)
    }
  }, [])

  function launch(poll: PollView) {
    launchPoll(poll.id)
    send({ type: 'poll.show', pollId: poll.id })
    setLive(poll)
    setOpenList(false)
  }

  function end() {
    if (!live) return
    const id = live.id
    setLive(null)
    send({ type: 'poll.end' })
    start(async () => {
      await closePoll(id)
      load()
    })
  }

  if (live) return <LivePollControl poll={live} onEnd={end} pending={pending} />

  if (polls.length === 0) return null

  if (polls.length === 1) {
    const p = polls[0]
    return (
      <button
        type="button"
        onClick={() => launch(p)}
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
                onClick={() => launch(p)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-text-light dark:text-text-dark"
              >
                <span className="h-2 w-2 shrink-0 bg-primary-light dark:bg-primary-dark" aria-hidden="true" />
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
