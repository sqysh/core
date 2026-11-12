// Mount this once in the authenticated layout. It listens chapter-wide for the
// host launching a poll and drops a full-screen vote card onto every member's
// phone, live, wherever they are in the app.
'use client'

import { useEffect, useState } from 'react'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { PollView } from '@/types/poll.types'
import { POLL_CLEAR_EVENT, POLL_LAUNCH_EVENT, POLL_LIVE_CHANNEL, PollLaunch } from '@/lib/constants/poll.constants'
import { getPoll } from '@/lib/actions/poll/getPoll'
import { usePathname } from 'next/navigation'
import { LivePollCard } from './_components/LivePollCard'

const SUPPRESS_ON = ['/attendance', '/stage/remote']

export function LivePoll() {
  const pathname = usePathname()
  const suppressed = SUPPRESS_ON.some((p) => pathname?.startsWith(p))
  const [poll, setPoll] = useState<PollView | null>(null)

  useEffect(() => {
    if (suppressed) return
    const channel = getPusherClient().subscribe(POLL_LIVE_CHANNEL)
    const onLaunch = async (d: PollLaunch) => {
      const res = await getPoll(d.pollId)
      if (res.success) setPoll(res.data)
    }
    const onClear = () => setPoll(null)
    channel.bind(POLL_LAUNCH_EVENT, onLaunch)
    channel.bind(POLL_CLEAR_EVENT, onClear)
    return () => {
      channel.unbind_all()
      releaseChannel(POLL_LIVE_CHANNEL)
    }
  }, [suppressed])

  if (suppressed || !poll) return null
  return <LivePollCard key={poll.id} poll={poll} />
}
