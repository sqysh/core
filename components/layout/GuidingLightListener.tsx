'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { useSession } from 'next-auth/react'

export default function GuidingLightListener() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()

  // Read the session and path live inside the handlers so the subscription survives
  // the loading to authenticated transition instead of tearing down and resubscribing
  const userIdRef = useRef<string | undefined>(undefined)
  userIdRef.current = session?.user?.id
  const pathRef = useRef(pathname)
  pathRef.current = pathname

  useEffect(() => {
    const channel = getPusherClient().subscribe('guiding-light')

    channel.bind('round-opened', (data: { judgeId: string | null }) => {
      const userId = userIdRef.current
      if (!userId || userId !== data.judgeId) return
      const path = pathRef.current ?? ''
      // check-in runs its own send-off; /attendance and /stage/* are driving the meeting
      if (path === '/check-in' || path === '/attendance' || path.startsWith('/stage')) return
      router.push('/stage/guiding-light/judge')
    })

    channel.bind('winner-selected', (data: { winner: { id: string; name: string }; judgeId: string | null }) => {
      const userId = userIdRef.current
      if (!userId || userId !== data.judgeId) return

      // Only route on mobile. The laptop is driving the TV and shouldn't jump pages mid-reveal
      if (!/iPhone|iPad|Android/i.test(navigator.userAgent)) return

      router.push(`/stage/guiding-light/handoff?winner=${encodeURIComponent(data.winner.name)}`)
    })

    return () => {
      channel.unbind_all()
      releaseChannel('guiding-light')
    }
  }, [router])

  return null
}
