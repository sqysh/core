'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'

export default function ElectionListener() {
  const router = useRouter()
  const { data: session } = useSession()

  const userIdRef = useRef<string | undefined>(undefined)
  userIdRef.current = session?.user?.id

  useEffect(() => {
    const channel = getPusherClient().subscribe('election')

    const onVotingOpened = () => {
      if (!userIdRef.current) return

      // The laptop is driving the TV and stays on the status screen
      if (!/iPhone|iPad|Android/i.test(navigator.userAgent)) return

      router.push('/election/ballot')
    }

    channel.bind('voting-opened', onVotingOpened)

    return () => {
      channel.unbind('voting-opened', onVotingOpened)
      releaseChannel('election')
    }
  }, [router])

  return null
}
