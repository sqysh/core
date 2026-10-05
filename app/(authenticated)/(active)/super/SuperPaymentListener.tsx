'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { useSounds } from '@/lib/hooks/useSounds'

export function SuperPaymentListener() {
  const { play } = useSounds()
  const router = useRouter()

  useEffect(() => {
    const channel = getPusherClient().subscribe('super-admin')

    const onPayment = () => {
      play('se14')
      router.refresh()
    }

    channel.bind('membership-payment', onPayment)

    return () => {
      channel.unbind('membership-payment', onPayment)
      releaseChannel('super-admin')
    }
  }, [play, router])

  return null
}
