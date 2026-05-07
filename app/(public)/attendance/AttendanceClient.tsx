'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Check } from 'lucide-react'
// import dynamic from 'next/dynamic'
import Pusher from 'pusher-js'
import Marquee from 'react-fast-marquee'
import { QRCodeSVG } from 'qrcode.react'

// const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false })

// ─── Types ────────────────────────────────────────────────────────────────────

interface FloatingEmoji {
  id: string
  emoji: string
  x: number
}

interface Member {
  id: string
  name: string
  company: string
}

interface AttendanceTVProps {
  date?: string
  members: Member[]
  initialAttendees: string[] // user ids
  initialReactionCount?: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TICKER_MESSAGES = [
  "⚓ Scan the QR code to check in for today's meeting",
  '📋 Attendance is recorded every Thursday',
  '✦ Check in to keep your membership in good standing',
  '👋 Welcome — grab some food and find a seat',
  '📱 Open your camera and point it at the QR code'
]

// ─── Floating emoji ───────────────────────────────────────────────────────────

function FloatingEmojiEl({ emoji, x, onDone }: { emoji: string; x: number; onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.8, x: 0 }}
      animate={{
        opacity: [1, 1, 1, 0],
        y: typeof window !== 'undefined' ? -window.innerHeight : -900,
        scale: [0.8, 1.4, 1.2, 1],
        x: [0, 30, -25, 20, -15, 0]
      }}
      transition={{
        duration: 5,
        ease: 'easeOut',
        x: { duration: 5, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 0.9, 1] },
        opacity: { duration: 5, times: [0, 0.6, 0.8, 1] }
      }}
      onAnimationComplete={onDone}
      className="fixed bottom-32 z-50 pointer-events-none select-none text-4xl"
      style={{ left: `${x}%` }}
    >
      {emoji}
    </motion.div>
  )
}

// ─── Member card ──────────────────────────────────────────────────────────────

function MemberCard({ member, checkedIn, t }: { member: Member; checkedIn: boolean; t: Record<string, string> }) {
  return (
    <motion.div
      layout
      className={`relative flex items-center gap-3 px-3 py-3 border transition-all duration-500 ${
        checkedIn ? `border-green-500/50 bg-green-500/10` : `${t.border} opacity-40`
      }`}
    >
      {/* Check indicator */}
      <div
        className={`shrink-0 w-5 h-5 flex items-center justify-center border transition-all duration-500 ${
          checkedIn ? 'border-green-500 bg-green-500' : `${t.border}`
        }`}
      >
        <AnimatePresence>
          {checkedIn && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Check size={11} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p
          className={`font-sora font-bold text-sm lg:text-base leading-tight truncate transition-colors duration-500 ${
            checkedIn ? 'text-text-dark' : t.text
          }`}
        >
          {member.name}
        </p>
        <p
          className={`text-f10 lg:text-xs font-mono truncate transition-colors duration-500 ${
            checkedIn ? 'text-green-400' : t.muted
          }`}
        >
          {member.company}
        </p>
      </div>

      {/* Glow on check in */}
      {checkedIn && (
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 bg-green-400/20 pointer-events-none"
        />
      )}
    </motion.div>
  )
}

function speak(name: string) {
  const utterance = new SpeechSynthesisUtterance(`Thank you for checking in, ${name}`)
  utterance.rate = 0.9
  utterance.pitch = 1
  window.speechSynthesis.speak(utterance)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AttendanceClient({
  date = 'Thursday',
  members,
  initialAttendees = [],
  initialReactionCount = 0
}: AttendanceTVProps) {
  const [dark, setDark] = useState(true)
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([])
  const [totalReactions, setTotalReactions] = useState(initialReactionCount)
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set(initialAttendees))

  const t = {
    bg: dark ? 'bg-bg-dark' : 'bg-bg-light',
    border: dark ? 'border-border-dark' : 'border-border-light',
    divide: dark ? 'divide-border-dark' : 'divide-border-light',
    text: dark ? 'text-text-dark' : 'text-text-light',
    muted: dark ? 'text-muted-dark' : 'text-muted-light',
    primary: dark ? 'text-primary-dark' : 'text-primary-light',
    primaryBar: dark ? 'bg-primary-dark' : 'bg-primary-light',
    primaryBorder: dark ? 'border-primary-dark/40' : 'border-primary-light/40',
    primaryBg: dark ? 'bg-primary-dark/10' : 'bg-primary-light/10'
  }

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!
    })

    const channel = pusher.subscribe('meeting-attendance')
    channel.bind('check-in', (data: { userId: string; emoji: string; count: number; name: string }) => {
      setCheckedInIds((prev) => new Set([...prev, data.userId]))
      speak(data.name.split(' ')[0]) // just first name
    })

    const reactionChannel = pusher.subscribe('visitor-reactions')
    reactionChannel.bind('reaction', (data: { emoji: string; count: number }) => {
      const id = `${Date.now()}-${Math.random()}`
      const x = 10 + Math.random() * 80
      setFloaters((prev) => [...prev, { id, emoji: data.emoji, x }])
      setTotalReactions(data.count)
    })

    return () => {
      channel.unbind_all()
      reactionChannel.unbind_all()
      pusher.unsubscribe('meeting-attendance')
      pusher.unsubscribe('visitor-reactions')
      pusher.disconnect()
    }
  }, [])

  function removeFloater(id: string) {
    setFloaters((prev) => prev.filter((f) => f.id !== id))
  }

  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name))
  const checkedInCount = checkedInIds.size

  return (
    <div
      className={`h-screen w-screen overflow-hidden ${t.bg} ${t.text} flex flex-col transition-colors duration-300 relative`}
    >
      {/* ── Floating emojis ── */}
      <AnimatePresence>
        {floaters.map((f) => (
          <FloatingEmojiEl key={f.id} emoji={f.emoji} x={f.x} onDone={() => removeFloater(f.id)} />
        ))}
      </AnimatePresence>

      {/* ── Top bar ── */}
      <div
        className={`flex items-center justify-between px-5 lg:px-10 py-4 border-b ${t.border} shrink-0 relative z-10`}
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
          <button
            onClick={() => setDark((d) => !d)}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`w-7 h-7 flex items-center justify-center border ${t.border} ${t.muted} transition-colors focus-visible:outline-none`}
          >
            {dark ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 min-h-0 relative z-10">
        {/* ── Left — member grid (dominant) ── */}
        <div className={`flex flex-col flex-1 px-5 lg:px-8 py-6 border-r ${t.border} min-h-0`}>
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <span className={`block w-4 h-px ${t.primaryBar} shrink-0`} aria-hidden="true" />
              <p className={`text-xs lg:text-sm font-mono tracking-[0.2em] uppercase ${t.primary}`}>Attendance</p>
            </div>
            <p className={`text-xs lg:text-sm font-mono tracking-widest uppercase ${t.muted}`}>
              {checkedInCount} / {members.length} checked in
            </p>
          </div>

          {/* Member grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 overflow-y-auto flex-1">
            {sortedMembers.map((member) => (
              <MemberCard key={member.id} member={member} checkedIn={checkedInIds.has(member.id)} t={t} />
            ))}
          </div>
        </div>

        {/* ── Right — instructions + QR ── */}
        <div className="hidden lg:flex flex-col justify-between px-8 py-6 w-80 xl:w-96 shrink-0">
          {/* Instructions */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className={`block w-4 h-px ${t.primaryBar} shrink-0`} aria-hidden="true" />
              <p className={`text-xs lg:text-sm font-mono tracking-[0.2em] uppercase ${t.primary}`}>How to Check In</p>
            </div>

            <div className="flex flex-col gap-4">
              {[
                { step: '01', text: 'Open your phone camera' },
                { step: '02', text: 'Point it at the QR code below' },
                { step: '03', text: 'Tap the link that appears' },
                { step: '04', text: 'Sign in if prompted' },
                { step: '05', text: "You're checked in — watch for your name!" }
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className={`text-xs font-mono ${t.primary} shrink-0 mt-0.5`}>{step}</span>
                  <p className={`font-nunito text-sm lg:text-base ${t.text} leading-snug`}>{text}</p>
                </div>
              ))}
            </div>

            {/* Reaction count */}
            {totalReactions > 0 && (
              <div className="mt-8">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={totalReactions}
                    initial={{ opacity: 0, y: -8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className={`font-sora font-black text-5xl xl:text-6xl ${t.primary} leading-none`}
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
          <div className={`border ${t.border} p-4 flex flex-col items-center gap-3`}>
            <QRCodeSVG
              value="https://coastal-referral-exchange.com/check-in"
              size={220}
              bgColor="transparent"
              fgColor={dark ? '#f8fafc' : '#0f172a'}
            />
            <p className={`text-xs lg:text-sm font-mono tracking-[0.2em] uppercase ${t.primary} text-center`}>
              Scan to check in
            </p>
          </div>
        </div>
      </div>

      {/* ── Ticker ── */}
      <div
        className={`shrink-0 relative z-10 border-t-2 ${dark ? 'border-primary-dark bg-primary-dark/10' : 'border-primary-light bg-primary-light/10'} overflow-hidden`}
      >
        <div className="flex items-center">
          <div
            className={`shrink-0 flex items-center gap-2 px-4 py-3 border-r-2 ${dark ? 'border-primary-dark bg-primary-dark text-white' : 'border-primary-light bg-primary-light text-white'}`}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
            <p className="text-xs lg:text-sm font-mono tracking-[0.2em] uppercase whitespace-nowrap">CORE</p>
          </div>
          <div className="overflow-hidden flex-1">
            <Marquee speed={40} gradientWidth={0} pauseOnHover={false}>
              {TICKER_MESSAGES.map((msg, i) => (
                <span
                  key={i}
                  className={`mx-16 text-xs lg:text-sm font-mono tracking-[0.15em] uppercase ${t.text} py-3 inline-block`}
                >
                  {msg}
                </span>
              ))}
            </Marquee>
          </div>
        </div>
      </div>
    </div>
  )
}
