'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Check } from 'lucide-react'
import { useSounds } from '@/lib/hooks/useSounds'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { Member } from '@/types/attendance.types'
import { CheckInAnnouncement } from './_components/CheckInAnnouncement'

type Props = {
  members: Member[]
  initialAttendees?: string[]
}

const CHECK_IN_URL = 'https://coastalreferralxchange.com/check-in'

export default function AttendanceClient({ members, initialAttendees = [] }: Props) {
  const [checkedIn, setCheckedIn] = useState<Map<string, string>>(new Map(initialAttendees.map((id) => [id, ''])))
  const [justId, setJustId] = useState<string | null>(null)
  const [announced, setAnnounced] = useState<Member | null>(null)
  const [announceKey, setAnnounceKey] = useState(0)
  const { play } = useSounds({ enabled: true, volume: 1 })
  const comboRef = useRef({ level: 0, last: 0 })
  const COMBO_WINDOW = 1800 // ms; scans closer than this climb the ladder

  function playCheckInTone() {
    const now = Date.now()
    const c = comboRef.current
    c.level = now - c.last < COMBO_WINDOW ? Math.min(c.level + 1, 5) : 0
    c.last = now
    const file = c.level === 0 ? '/sound-effects/check-in.mp3' : `/sound-effects/check-in-${c.level + 1}.mp3`
    new Audio(file).play().catch(() => {})
  }

  useEffect(() => {
    const channel = getPusherClient().subscribe('meeting-attendance')
    const onCheckIn = (data: { userId: string; checkedInAt: string }) => {
      playCheckInTone()
      setCheckedIn((prev) => new Map([...prev, [data.userId, data.checkedInAt]]))
      setJustId(data.userId)
      setTimeout(() => setJustId(null), 3000)
    }
    channel.bind('check-in', onCheckIn)
    return () => {
      channel.unbind('check-in', onCheckIn)
      releaseChannel('meeting-attendance')
    }
  }, [play])

  useEffect(() => {
    if (!justId) return
    const m = members.find((x) => x.id === justId)
    if (!m) return
    setAnnounced(m)
    setAnnounceKey((k) => k + 1)
  }, [justId, members])

  const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name))
  const cols = members.length <= 12 ? 4 : 5
  const rows = Math.ceil(members.length / cols)

  function simulate() {
    const unchecked = sorted.filter((m) => !checkedIn.has(m.id))
    if (!unchecked.length) return
    const pick = unchecked[Math.floor(Math.random() * unchecked.length)]
    playCheckInTone()
    const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    setCheckedIn((prev) => new Map([...prev, [pick.id, time]]))
    setJustId(pick.id)
    setTimeout(() => setJustId(null), 3000)
  }

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-bg-dark text-text-dark">
      <AnimatePresence>
        {announced && <CheckInAnnouncement key={announceKey} member={announced} onDone={() => setAnnounced(null)} />}
      </AnimatePresence>

      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={simulate}
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2 border border-border-dark bg-bg-dark px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-dark hover:text-primary-dark"
        >
          Simulate check-in
        </button>
      )}

      {/* body: grid + QR */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div
          className="grid min-h-0 flex-1 gap-2 p-3"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
        >
          {sorted.map((m) => {
            const isIn = checkedIn.has(m.id)
            const just = justId === m.id
            return (
              <div
                key={m.id}
                className={`relative flex items-center justify-center overflow-hidden border transition-all duration-500 ${
                  isIn ? 'border-primary-dark' : 'border-border-dark'
                } ${just ? 'ring-2 ring-primary-dark' : ''}`}
              >
                {m.profileImage ? (
                  <img
                    src={m.profileImage}
                    alt={m.name}
                    className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ${isIn ? '' : 'brightness-50 grayscale'}`}
                  />
                ) : (
                  <p
                    className={`px-3 text-center font-sora text-[clamp(14px,1.6vw,22px)] font-bold leading-tight ${isIn ? 'text-text-dark' : 'text-muted-dark'}`}
                  >
                    {m.name}
                  </p>
                )}

                {m.profileImage && (
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-bg-dark/90 to-transparent px-2 pb-1.5 pt-6">
                    <p className="truncate text-center font-sora text-[clamp(11px,1.2vw,16px)] font-bold text-white">
                      {m.name}
                    </p>
                  </div>
                )}

                {isIn && (
                  <span className="absolute right-1.5 top-1.5 flex items-center gap-1 bg-primary-dark px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white">
                    <Check size={11} strokeWidth={3} aria-hidden="true" />
                    {checkedIn.get(m.id) || 'in'}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <aside className="flex shrink-0 flex-col items-center justify-center gap-4 border-t border-border-dark p-6 lg:w-80 lg:border-l lg:border-t-0 xl:w-96">
          <div className="border border-border-dark bg-white p-4">
            <QRCodeSVG value={CHECK_IN_URL} size={220} bgColor="#ffffff" fgColor="#06101b" />
          </div>
          <p className="font-mono text-sm uppercase tracking-widest text-primary-dark">Scan to check in</p>
        </aside>
      </div>
    </div>
  )
}
