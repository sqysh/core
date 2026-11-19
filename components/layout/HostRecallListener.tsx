'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { STAGE_CHANNEL, STAGE_EVENT, StageCommand } from '@/lib/constants/stage.constants'

const REMOTE_HREF = '/stage/remote'

// Mounted for the acting host only. When the super remote sends host.recall,
// pull this phone back to the host remote from wherever it wandered off to.
export default function HostRecallListener() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const channel = getPusherClient().subscribe(STAGE_CHANNEL)
    // unbind only our handler: the host remote shares this channel
    const onCommand = (cmd: StageCommand) => {
      if (cmd.type === 'host.recall' && pathname !== REMOTE_HREF) router.push(REMOTE_HREF)
    }
    channel.bind(STAGE_EVENT, onCommand)
    return () => {
      channel.unbind(STAGE_EVENT, onCommand)
      releaseChannel(STAGE_CHANNEL)
    }
  }, [router, pathname])

  return null
}
