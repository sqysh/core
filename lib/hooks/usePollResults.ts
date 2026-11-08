'use client'

import { PollResults, PollView } from '@/types/poll.types'
import { useEffect, useState } from 'react'
import { POLL_EVENT, pollChannel } from '../constants/poll.constants'
import { getPusherClient, releaseChannel } from '../pusher/pusherClient'

/** Keep a poll's tallies live over Pusher. Shared by the phone card and the TV. */
export function usePollResults(initial: PollView | PollResults | null) {
  const [results, setResults] = useState<PollResults | null>(
    initial
      ? {
          pollId: 'pollId' in initial ? initial.pollId : initial.id,
          status: initial.status,
          options: initial.options,
          totalVotes: initial.totalVotes
        }
      : null
  )
  const pollId = results?.pollId ?? null

  useEffect(() => {
    if (!pollId) return
    const name = pollChannel(pollId)
    const channel = getPusherClient().subscribe(name)
    channel.bind(POLL_EVENT, (r: PollResults) => setResults(r))
    return () => {
      channel.unbind_all()
      releaseChannel(name)
    }
  }, [pollId])

  return [results, setResults] as const
}
