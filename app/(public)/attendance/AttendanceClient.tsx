'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { useSounds } from '@/lib/hooks/useSounds'
import { getPusherClient } from '@/lib/pusher/pusherClient'
import { FloatingEmoji, Member } from '@/types/attendance.types'
import { FloatingEmojiEl } from '../../../components/_shared/FloatingEmoji'
import { NextMeetingCountdown } from './_components/NextMeetingCountdown'
import { NameTile } from './_components/NameTile'
import { CheckInAnnouncement } from './_components/CheckInAnnouncement'

type Props = {
  date?: string
  members: Member[]
  initialAttendees: string[]
  initialReactionCount?: number
}

export default function AttendanceClient({
  date = 'Thursday',
  members,
  initialAttendees = [],
  initialReactionCount = 0
}: Props) {
  const [dark] = useState(true)
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([])
  const [totalReactions, setTotalReactions] = useState(initialReactionCount)
  const [checkedInIds, setCheckedInIds] = useState<Map<string, string>>(new Map(initialAttendees.map((id) => [id, ''])))
  const [justCheckedInId, setJustCheckedInId] = useState<string | null>(null)
  const { play } = useSounds({ enabled: true, volume: 0.4 })
  const [announcedMember, setAnnouncedMember] = useState<Member | null>(null)
  const [announcementKey, setAnnouncementKey] = useState(0)

  useEffect(() => {
    if (!justCheckedInId) return
    const member = members.find((m) => m.id === justCheckedInId) ?? null
    if (!member) return
    setAnnouncedMember(member)
    setAnnouncementKey((k) => k + 1) // force remount so animation replays
  }, [justCheckedInId, members])

  const t = {
    bg: dark ? 'bg-bg-dark' : 'bg-bg-light',
    border: dark ? 'border-border-dark' : 'border-border-light',
    text: dark ? 'text-text-dark' : 'text-text-light',
    muted: dark ? 'text-muted-dark' : 'text-muted-light',
    primary: dark ? 'text-primary-dark' : 'text-primary-light',
    primaryBar: dark ? 'bg-primary-dark' : 'bg-primary-light'
  }

  useEffect(() => {
    const pusher = getPusherClient()

    const attendanceChannel = pusher.subscribe('meeting-attendance')
    attendanceChannel.bind('check-in', (data: { userId: string; checkedInAt: string }) => {
      play('se0')
      setCheckedInIds((prev) => new Map([...prev, [data.userId, data.checkedInAt]]))
      setJustCheckedInId(data.userId)
      setTimeout(() => setJustCheckedInId(null), 3000)
    })

    const reactionChannel = pusher.subscribe('visitor-reactions')
    reactionChannel.bind('reaction', (data: { emoji: string; count: number }) => {
      const id = `${Date.now()}-${Math.random()}`
      const x = 10 + Math.random() * 80
      setFloaters((prev) => [...prev, { id, emoji: data.emoji, x }])
      setTotalReactions(data.count)
    })

    return () => {
      attendanceChannel.unbind_all()
      reactionChannel.unbind_all()
    }
  }, [play])

  function removeFloater(id: string) {
    setFloaters((prev) => prev.filter((f) => f.id !== id))
  }

  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name))
  const checkedInCount = checkedInIds.size

  return (
    <div
      className={`h-screen w-screen overflow-hidden ${t.bg} ${t.text} flex flex-col transition-colors duration-300 relative`}
    >
      <AnimatePresence>
        {announcedMember && (
          <CheckInAnnouncement key={announcementKey} member={announcedMember} onDone={() => setAnnouncedMember(null)} />
        )}
      </AnimatePresence>

      {/* ── Floating emojis ── */}
      <AnimatePresence>
        {floaters.map((f) => (
          <FloatingEmojiEl key={f.id} emoji={f.emoji} x={f.x} onDone={() => removeFloater(f.id)} />
        ))}
      </AnimatePresence>

      {/* Dev only — remove before deploy */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => {
            const unchecked = sortedMembers.filter((m) => !checkedInIds.has(m.id))
            if (!unchecked.length) return
            const random = unchecked[Math.floor(Math.random() * unchecked.length)]
            play('se0')
            const time = new Date().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
            setCheckedInIds((prev) => new Map([...prev, [random.id, time]]))
            setJustCheckedInId(random.id)
            setTimeout(() => setJustCheckedInId(null), 3000)
          }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-500 text-white text-xs font-mono"
        >
          Simulate Check-In
        </button>
      )}

      {/* ── Top bar ── */}
      <div
        className={`flex items-center justify-between px-5 lg:px-10 py-3 border-b ${t.border} shrink-0 relative z-10`}
      >
        <div className="flex items-center gap-3 lg:gap-4">
          <span className={`block w-5 lg:w-6 h-px ${t.primaryBar} shrink-0`} aria-hidden="true" />
          <p className={`text-xs lg:text-sm font-mono tracking-[0.25em] uppercase ${t.primary}`}>
            Coastal Referral Exchange
          </p>
        </div>
        <div className="flex items-center gap-3 lg:gap-6">
          <p className={`text-xs lg:text-sm font-mono tracking-[0.15em] uppercase ${t.muted} hidden sm:block`}>
            {date} · 25 N Common St · Lynn, MA 01902
          </p>

          {/* Countdown */}
          <NextMeetingCountdown />
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 min-h-0 relative z-10">
        {/* ── Left — name grid ── */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className={`flex items-center justify-between px-5 lg:px-8 py-2 border-b ${t.border} shrink-0`}>
            <div className="flex items-center gap-3">
              <span className={`block w-4 h-px ${t.primaryBar} shrink-0`} aria-hidden="true" />
              <p className={`text-xs font-mono tracking-[0.2em] uppercase ${t.primary}`}>Attendance</p>
            </div>
            <p className={`text-xs font-mono tracking-widest uppercase ${t.muted}`}>
              {checkedInCount} / {members.length}
            </p>
          </div>

          {/* Name grid — 4 or 5 cols depending on count */}
          <div
            className="flex-1 min-h-0 overflow-hidden grid p-3 gap-2"
            style={{
              gridTemplateColumns: `repeat(${members.length <= 12 ? 4 : 5}, 1fr)`,
              gridTemplateRows: `repeat(${Math.ceil(members.length / (members.length <= 12 ? 4 : 5))}, 1fr)`
            }}
          >
            {sortedMembers.map((member, i) => (
              <NameTile
                key={member.id}
                member={member}
                checkedIn={checkedInIds.has(member.id)}
                checkedInTime={checkedInIds.get(member.id) ?? null}
                justCheckedIn={justCheckedInId === member.id}
              />
            ))}
          </div>
        </div>

        {/* ── Right — instructions + QR ── */}
        <div className={`hidden lg:flex flex-col justify-between px-6 py-5 w-72 xl:w-80 shrink-0 border-l ${t.border}`}>
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className={`block w-4 h-px ${t.primaryBar} shrink-0`} aria-hidden="true" />
              <p className={`text-xs font-mono tracking-[0.2em] uppercase ${t.primary}`}>How to Check In</p>
            </div>

            <div className="flex flex-col gap-4">
              {[
                { step: '01', text: 'Open your phone camera' },
                { step: '02', text: 'Point it at the QR code' },
                { step: '03', text: 'Tap the link that appears' },
                { step: '04', text: 'Sign in if prompted' },
                { step: '05', text: 'Watch your name light up!' }
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className={`text-xs font-mono ${t.primary} shrink-0`}>{step}</span>
                  <p className={`font-nunito text-sm lg:text-base ${t.text} leading-snug`}>{text}</p>
                </div>
              ))}
            </div>

            {totalReactions > 0 && (
              <div className="mt-6">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={totalReactions}
                    initial={{ opacity: 0, y: -8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className={`font-sora font-black text-4xl xl:text-5xl ${t.primary} leading-none`}
                  >
                    {totalReactions}
                  </motion.p>
                </AnimatePresence>
                <p className={`text-xs font-mono tracking-widest uppercase ${t.muted} mt-1`}>
                  {totalReactions === 1 ? 'reaction' : 'reactions'} in the room
                </p>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className={`border ${t.border} p-3 flex flex-col items-center gap-2`}>
            <QRCodeSVG
              value="https://coastalreferralxchange.com/check-in"
              size={200}
              bgColor="transparent"
              fgColor={dark ? '#f8fafc' : '#0f172a'}
            />
            <p className={`text-xs font-mono tracking-[0.2em] uppercase ${t.primary} text-center`}>Scan to check in</p>
          </div>
        </div>
      </div>

      {/* ── Ticker ── */}
      <div
        className={`shrink-0 relative z-10 border-t-2 ${dark ? 'border-primary-dark bg-primary-dark/10' : 'border-primary-light bg-primary-light/10'} overflow-hidden`}
      >
        <div className="flex items-center">
          <div
            className={`shrink-0 flex items-center gap-2 px-4 py-2 border-r-2 ${dark ? 'border-primary-dark bg-primary-dark text-white' : 'border-primary-light bg-primary-light text-white'}`}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
            <p className="text-xs font-mono tracking-[0.2em] uppercase whitespace-nowrap">CORE</p>
          </div>
        </div>
      </div>
    </div>
  )
}
