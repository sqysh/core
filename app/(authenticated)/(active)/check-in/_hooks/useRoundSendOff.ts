import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { JUDGE_HREF } from '@/app/(authenticated)/(active)/check-in/_lib/roles'
import type { Spot, SqyshMode } from '@/app/(authenticated)/(active)/check-in/_lib/types'

interface Options {
  active: boolean
  previewOpen: boolean
  settle: number
  setSpot: Dispatch<SetStateAction<Spot>>
  setMode: Dispatch<SetStateAction<SqyshMode>>
  jumpToCorner: () => boolean
}

// The judge waits here for the round to open. The global listener skips this
// path so Sqysh can do the send-off: lift off the ring, get excited, say so,
// then go to the shortlist. A hard cut would be the first thing they'd notice.
export function useRoundSendOff({ active, previewOpen, settle, setSpot, setMode, jumpToCorner }: Options) {
  const router = useRouter()
  const [sendOff, setSendOff] = useState(false)

  useEffect(() => {
    if (!active) return
    const timers: ReturnType<typeof setTimeout>[] = []

    // Hop up, get excited, say the line, jump to the corner, then change page.
    // He drops into that same corner on the judge screen, so it reads as one move.
    function sendOffAndGo() {
      setSendOff(true)
      setSpot('hover')
      setMode('excited')
      timers.push(
        setTimeout(() => setMode('idle'), 900),
        setTimeout(jumpToCorner, 2300),
        setTimeout(() => router.push(previewOpen ? `${JUDGE_HREF}?preview=1` : JUDGE_HREF), 3500)
      )
    }

    if (previewOpen) {
      timers.push(setTimeout(sendOffAndGo, (settle + 9) * 1000))
      return () => timers.forEach(clearTimeout)
    }

    const channel = getPusherClient().subscribe('guiding-light')
    channel.bind('round-opened', sendOffAndGo)

    return () => {
      timers.forEach(clearTimeout)
      channel.unbind_all()
      releaseChannel('guiding-light')
    }
  }, [active, router, previewOpen, settle, setSpot, setMode, jumpToCorner])

  return sendOff
}
