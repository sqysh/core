'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPusherClient } from '@/app/lib/pusher/pusherClient'
import { useSounds } from '@/app/lib/hooks/useSounds'

export function SuperPaymentListener() {
  const { play } = useSounds()
  const router = useRouter()

  useEffect(() => {
    const pusher = getPusherClient()
    const channel = pusher.subscribe('super-admin')

    channel.bind('membership-payment', () => {
      play('se14')
      router.refresh()
    })

    return () => {
      channel.unbind_all()
    }
  }, [play, router])

  return null
}
