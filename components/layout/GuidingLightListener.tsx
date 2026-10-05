'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { useSession } from 'next-auth/react'

export default function GuidingLightListener() {
  const router = useRouter()
  const { data: session } = useSession()

  // Read the session live inside the handlers so the subscription survives the
  // loading to authenticated transition instead of tearing down and resubscribing
  const userIdRef = useRef<string | undefined>(undefined)
  userIdRef.current = session?.user?.id

  useEffect(() => {
    const channel = getPusherClient().subscribe('guiding-light')

    channel.bind('round-opened', (data: { judgeId: string | null }) => {
      const userId = userIdRef.current
      if (!userId) return
      if (userId === data.judgeId) router.push('/guiding-light/judge')
    })

    channel.bind('winner-selected', (data: { winner: { id: string; name: string }; judgeId: string | null }) => {
      const userId = userIdRef.current
      if (!userId || userId !== data.judgeId) return

      // Only route on mobile. The laptop is driving the TV and shouldn't jump pages mid-reveal
      if (!/iPhone|iPad|Android/i.test(navigator.userAgent)) return

      router.push(`/guiding-light/handoff?winner=${encodeURIComponent(data.winner.name)}`)
    })

    return () => {
      channel.unbind_all()
      releaseChannel('guiding-light')
    }
  }, [router])

  return null
}
