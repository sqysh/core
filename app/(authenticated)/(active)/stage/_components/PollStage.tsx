// Two pieces: the TV screen (results, 20-foot legible, live) and the host's
// picker button for the remote. Both lean on getPoll + the Pusher channel.
'use client'

import { getPoll } from '@/lib/actions/poll/getPoll'
import { usePollResults } from '@/lib/hooks/usePollResults'
import { PollView } from '@/types/poll.types'
import { useEffect, useState } from 'react'
import { Bars } from './Bars'

/** Mount this in StageClient when mode === 'poll'; it loads the poll and stays live. */
export function PollStage({ pollId }: { pollId: string }) {
  const [poll, setPoll] = useState<PollView | null>(null)
  const [live, setLive] = usePollResults(poll)

  useEffect(() => {
    let cancelled = false
    setPoll(null)
    getPoll(pollId).then((res) => {
      if (cancelled || !res.success) return
      setPoll(res.data)
      setLive({
        pollId: res.data.id,
        status: res.data.status,
        options: res.data.options,
        totalVotes: res.data.totalVotes
      })
    })
    return () => {
      cancelled = true
    }
  }, [pollId, setLive])

  if (!poll) return null
  return <Bars poll={poll} live={live} />
}
