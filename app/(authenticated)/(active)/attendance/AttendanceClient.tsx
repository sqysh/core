'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { Member } from '@/types/attendance.types'
import { HarborScene } from './_components/harbor/HarborScene'
import { RosterStrip } from './_components/RosterStrip'
import { ScanPanel } from './_components/ScanPanel'
import { useHarbor } from './_hooks/useHarbor'
import { playHorn } from './_lib/boatSounds'
import { HONK_EVENT } from '@/lib/constants/honk.constants'
import { STORM_EVENT } from '@/lib/constants/storm.constants'
import { SCENE_W } from './_lib/harborMap'

type Props = {
  members: Member[]
  /** Today's check-ins, earliest first, so a reload moors every boat back in its own berth */
  initialAttendees?: string[]
}

const CHECK_IN_URL = 'https://coastalreferralxchange.com/check-in'
const COMBO_WINDOW = 1800 // ms; scans closer than this climb the ladder

export default function AttendanceClient({ members, initialAttendees = [] }: Props) {
  const [checkedIn, setCheckedIn] = useState<Map<string, string>>(() => new Map(initialAttendees.map((id) => [id, ''])))
  const { fleet, arrive } = useHarbor(members, initialAttendees)
  const comboRef = useRef({ level: 0, last: 0 })
  const [stormKey, setStormKey] = useState(0)
  const [swellKey, setSwellKey] = useState(0)
  const [honks, setHonks] = useState<Record<string, number>>({})
  const fleetRef = useRef(fleet)
  fleetRef.current = fleet

  function playCheckInTone() {
    const now = Date.now()
    const c = comboRef.current
    c.level = now - c.last < COMBO_WINDOW ? Math.min(c.level + 1, 5) : 0
    c.last = now
    const file = c.level === 0 ? '/sound-effects/check-in.mp3' : `/sound-effects/check-in-${c.level + 1}.mp3`
    new Audio(file).play().catch(() => {})
  }

  function checkIn(userId: string, time: string) {
    setCheckedIn((prev) => (prev.has(userId) ? prev : new Map([...prev, [userId, time]])))
    arrive(userId)
  }

  useEffect(() => {
    const channel = getPusherClient().subscribe('meeting-attendance')
    const onCheckIn = (data: { userId: string; checkedInAt: string }) => {
      playCheckInTone()
      checkIn(data.userId, data.checkedInAt)
    }
    // a member's honk: their own boat's horn, panned to where it sits, and a bubble over its nameplate
    const onHonk = (data: { userId: string }) => {
      const boat = fleetRef.current.find((b) => b.id === data?.userId)
      if (!boat) return
      playHorn(boat.voice, (boat.berth.x / SCENE_W) * 2 - 1)
      setHonks((prev) => ({ ...prev, [boat.id]: (prev[boat.id] ?? 0) + 1 }))
    }
    const onStorm = () => setStormKey((k) => k + 1)
    channel.bind('check-in', onCheckIn)
    channel.bind(HONK_EVENT, onHonk)
    channel.bind(STORM_EVENT, onStorm)
    return () => {
      channel.unbind('check-in', onCheckIn)
      channel.unbind(HONK_EVENT, onHonk)
      channel.unbind(STORM_EVENT, onStorm)
      releaseChannel('meeting-attendance')
    }
    // checkIn only touches state setters and the stable arrive, so the first render's copy stays correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sorted = useMemo(() => [...members].sort((a, b) => a.name.localeCompare(b.name)), [members])

  // Development only: check in one or more random members at once to watch boats arrive
  function simulate(count = 1) {
    const unchecked = sorted.filter((m) => !checkedIn.has(m.id))
    for (let i = 0; i < count && unchecked.length; i++) {
      const pick = unchecked.splice(Math.floor(Math.random() * unchecked.length), 1)[0]
      playCheckInTone()
      checkIn(pick.id, new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }))
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-dark text-text-dark">
      <HarborScene fleet={fleet} honks={honks} stormKey={stormKey} swellKey={swellKey} />

      <RosterStrip members={sorted} checkedIn={checkedIn} />
      <ScanPanel url={CHECK_IN_URL} />

      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-2">
          <button
            onClick={() => setStormKey((k) => k + 1)}
            className="border border-border-dark bg-bg-dark px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-dark hover:text-primary-dark"
          >
            Storm
          </button>
          <button
            onClick={() => setSwellKey((k) => k + 1)}
            className="border border-border-dark bg-bg-dark px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-dark hover:text-primary-dark"
          >
            Swell
          </button>
          {[1, 5].map((n) => (
            <button
              key={n}
              onClick={() => simulate(n)}
              className="border border-border-dark bg-bg-dark px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-dark hover:text-primary-dark"
            >
              Simulate {n} check-in{n > 1 ? 's' : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
