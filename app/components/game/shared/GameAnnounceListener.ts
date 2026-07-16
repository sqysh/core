'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { GAME_REGISTRY } from '@/app/lib/games/registry'
import { getPusherClient } from '@/app/lib/pusher/pusherClient'

export default function GameAnnounceListener() {
  const router = useRouter()
  const pathname = usePathname()

  // Keep the latest pathname in a ref so the handler reads it live, without
  // resubscribing on every navigation (which would thrash the socket).
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  useEffect(() => {
    const pusher = getPusherClient()
    const channel = pusher.subscribe(GAME_REGISTRY.WHEEL.channel)

    const onAnnounced = () => {
      // Don't yank the host off the TV view, and don't redirect if already there
      if (pathnameRef.current.startsWith('/games')) return
      router.push('/games')
    }

    channel.bind('game-announced', onAnnounced)

    return () => {
      // Only remove this handler — leave the shared socket + subscription alive
      channel.unbind('game-announced', onAnnounced)
    }
  }, [router])

  return null
}
