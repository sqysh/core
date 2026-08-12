'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPusherClient } from '@/lib/pusher/pusherClient'
import { useSession } from 'next-auth/react'

export default function GuidingLightListener() {
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    const pusher = getPusherClient()
    const channel = pusher.subscribe('guiding-light')

    channel.bind('round-opened', (data: { judgeId: string | null }) => {
      if (!session?.user?.id) return
      if (session.user.id === data.judgeId) {
        router.push('/guiding-light/judge')
      }
    })

    channel.bind('winner-selected', (data: { winner: { id: string; name: string }; judgeId: string | null }) => {
      if (!session?.user?.id) return
      if (session.user.id !== data.judgeId) return

      // Only route on mobile
      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
      if (!isMobile) return

      router.push(`/guiding-light/handoff?winner=${encodeURIComponent(data.winner.name)}`)
    })

    return () => {
      channel.unbind_all()
    }
  }, [router, session?.user?.id])

  return null
}
