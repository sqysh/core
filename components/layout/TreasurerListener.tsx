'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { useSession } from 'next-auth/react'
import { TREASURY_CHANNEL } from '@/lib/constants/stage.constants'

// When the host/super sends the treasurer their screen, pull only the treasurer
// back to /treasurer. Read session and path live so the subscription survives the
// loading to authenticated transition.
export default function TreasurerListener() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()

  const userIdRef = useRef<string | undefined>(undefined)
  userIdRef.current = session?.user?.id
  const pathRef = useRef(pathname)
  pathRef.current = pathname

  useEffect(() => {
    const channel = getPusherClient().subscribe(TREASURY_CHANNEL)

    channel.bind('open-treasurer', (data: { treasurerId: string | null }) => {
      const userId = userIdRef.current
      if (!userId || userId !== data.treasurerId) return
      const path = pathRef.current ?? ''
      // already there, or on a stage/TV surface that's driving the meeting
      if (path === '/treasurer' || path === '/attendance' || path.startsWith('/stage')) return
      router.push('/treasurer')
    })

    return () => {
      channel.unbind_all()
      releaseChannel(TREASURY_CHANNEL)
    }
  }, [router])

  return null
}
