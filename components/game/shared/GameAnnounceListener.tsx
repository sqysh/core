'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { GAME_REGISTRY } from '@/lib/games/registry'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'

export default function GameAnnounceListener() {
  const router = useRouter()
  const pathname = usePathname()

  // Keep the latest pathname in a ref so the handler reads it live, without
  // resubscribing on every navigation (which would thrash the socket).
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  useEffect(() => {
    const channel = getPusherClient().subscribe(GAME_REGISTRY.WHEEL.channel)

    const onAnnounced = () => {
      // Don't yank the host off the TV view, and don't redirect if already there
      if (pathnameRef.current.startsWith('/games')) return
      router.push('/games')
    }

    channel.bind('game-announced', onAnnounced)

    return () => {
      // This listener lives in the layout, so it outlives the wheel pages and is the last
      // holder of the channel. The pages only unbind their own handlers.
      channel.unbind('game-announced', onAnnounced)
      releaseChannel(GAME_REGISTRY.WHEEL.channel)
    }
  }, [router])

  return null
}
