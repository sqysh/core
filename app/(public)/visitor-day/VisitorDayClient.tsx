'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import dynamic from 'next/dynamic'
import Pusher from 'pusher-js'
import { QRCodeSVG } from 'qrcode.react'

const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false })

// ─── Types ────────────────────────────────────────────────────────────────────

interface FloatingEmoji {
  id: string
  emoji: string
  x: number
}

interface VisitorDayTVProps {
  date?: string
  presenterName?: string | null
  presenterCompany?: string | null
  presenterBio?: string | null
  initialReactionCount?: number
  stats?: {
    totalRevenue: number
    totalParleys: number
    totalReferrals: number
  } | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

// const COMPANIES = [
//   { name: 'Sqysh' },
//   { name: 'Century21' },
//   { name: 'Eastern Bank' },
//   { name: 'Touchstone Closing & Escrow' },
//   { name: 'Boys & Girls Club of Lynn' },
//   { name: 'The Drumlin Group' },
//   { name: 'Zellik Insurance' },
//   { name: 'CrossCountry Mortgage LLC' },
//   { name: 'Northwestern Mutual' },
//   { name: 'Commonwealth Payroll & HR' },
//   { name: 'Prudential Life Insurance' },
//   { name: 'Finneran & Nicholson' }
// ]

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function VisitorDayTV({
  date = 'Thursday, May 7th',
  presenterName,
  presenterCompany,
  presenterBio,
  initialReactionCount = 0,
  stats
}: VisitorDayTVProps) {
  const [dark, setDark] = useState(true)
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([])
  const [totalReactions, setTotalReactions] = useState(initialReactionCount)

  const t = {
    bg: dark ? 'bg-bg-dark' : 'bg-bg-light',
    border: dark ? 'border-border-dark' : 'border-border-light',
    divide: dark ? 'divide-border-dark' : 'divide-border-light',
    text: dark ? 'text-text-dark' : 'text-text-light',
    muted: dark ? 'text-muted-dark' : 'text-muted-light',
    primary: dark ? 'text-primary-dark' : 'text-primary-light',
    primaryBg: dark ? 'bg-primary-dark/10' : 'bg-primary-light/10',
    primaryBorder: dark ? 'border-primary-dark/40' : 'border-primary-light/40',
    primaryBar: dark ? 'bg-primary-dark' : 'bg-primary-light',
    primarySolid: dark ? 'bg-primary-dark' : 'bg-primary-light',
    fadeFrom: dark ? 'from-bg-dark via-bg-dark/70 to-transparent' : 'from-bg-light via-bg-light/80 to-transparent'
  }

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!
    })

    const channel = pusher.subscribe('visitor-reactions')

    channel.bind('reaction', (data: { emoji: string; count: number }) => {
      const id = `${Date.now()}-${Math.random()}`
      const x = 10 + Math.random() * 80
      setFloaters((prev) => [...prev, { id, emoji: data.emoji, x }])
      setTotalReactions(data.count)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe('visitor-reactions')
      pusher.disconnect()
    }
  }, [])

  function removeFloater(id: string) {
    setFloaters((prev) => prev.filter((f) => f.id !== id))
  }

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

      {/* Globe — desktop only */}
      <div className="absolute right-[-15%] top-1/2 -translate-y-1/2 z-0 pointer-events-none w-250 h-250 hidden lg:block">
        <div className={`absolute inset-0 z-1 pointer-events-none bg-linear-to-r ${t.fadeFrom}`} />
        <Spline
          scene="https://prod.spline.design/nSlEQFeacYQgy4hm/scene.splinecode"
          style={{ background: 'transparent' }}
        />
      </div>

      {/* ── Top bar ── */}
      <div
        className={`flex items-center justify-between px-5 lg:px-10 py-4 border-b ${t.border} shrink-0 relative z-10`}
      >
        <div className="flex items-center gap-3 lg:gap-4">
          <span className={`block w-5 lg:w-6 h-px ${t.primaryBar} shrink-0`} aria-hidden="true" />
          <p className={`text-xs lg:text-sm font-mono tracking-[0.2em] lg:tracking-[0.25em] uppercase ${t.primary}`}>
            Coastal Referral Exchange
          </p>
        </div>
        <div className="flex items-center gap-3 lg:gap-6">
          <p className={`text-xs lg:text-sm font-mono tracking-[0.15em] uppercase ${t.muted} hidden sm:block`}>
            25 N Common St · Lynn, MA 01902
          </p>
          <button
            onClick={() => setDark((d) => !d)}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`w-7 h-7 flex items-center justify-center border ${t.border} ${t.muted} transition-colors focus-visible:outline-none focus-visible:ring-2`}
          >
            {dark ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 min-h-0 relative z-10">
        {/* ── Left column ── */}
        <div className={`flex flex-col justify-between px-5 lg:px-10 py-8 flex-1 border-r ${t.border}`}>
          {/* Title */}
          <div>
            <h1
              className={`font-sora font-black text-4xl sm:text-5xl lg:text-7xl xl:text-8xl ${t.text} leading-none tracking-tight mb-1`}
            >
              Visitor Day
            </h1>
            <p className={`font-sora font-semibold text-xl lg:text-3xl xl:text-4xl ${t.primary} mb-4 lg:mb-6`}>
              {date}
            </p>
            <p className={`font-nunito text-sm lg:text-lg xl:text-xl ${t.muted} leading-relaxed max-w-sm`}>
              A local business networking group on Boston's North Shore. One seat per industry.
            </p>
          </div>

          {/* Reaction count */}
          {totalReactions > 0 && (
            <div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={totalReactions}
                  initial={{ opacity: 0, y: -12, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.9 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className={`font-sora font-black text-6xl lg:text-8xl xl:text-9xl ${t.primary} leading-none`}
                >
                  {totalReactions}
                </motion.p>
              </AnimatePresence>
              <p className={`text-xs lg:text-sm font-mono tracking-widest uppercase ${t.muted} mt-1.5`}>
                {totalReactions === 1 ? 'reaction' : 'reactions'} in the room
              </p>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="flex items-end gap-6 lg:gap-10">
              {[
                { value: formatCurrency(stats.totalRevenue), label: 'Closed Business' },
                { value: stats.totalParleys, label: 'Meetings' },
                { value: stats.totalReferrals, label: 'Referrals' }
              ].map(({ value, label }) => (
                <div key={label}>
                  <p
                    className={`font-sora font-black text-3xl sm:text-4xl lg:text-6xl xl:text-7xl ${t.text} leading-none`}
                  >
                    {value}
                  </p>
                  <p className={`text-xs lg:text-sm font-mono tracking-widest uppercase ${t.muted} mt-1.5`}>{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Food note */}
          <p className={`text-xs lg:text-sm font-mono tracking-widest uppercase ${t.muted}`}>
            ✦ Food & refreshments provided · 7:00 AM – 8:30 AM
          </p>
        </div>

        {/* ── Right column ── */}
        <div className="hidden lg:flex flex-col justify-between px-10 py-8 w-95 xl:w-105 shrink-0">
          <div>
            {/* Schedule */}
            {/* <div className="flex items-center gap-3 mb-4">
              <span className={`block w-4 h-px ${t.primaryBar} shrink-0`} aria-hidden="true" />
              <p className={`text-xs lg:text-sm font-mono tracking-[0.2em] uppercase ${t.primary}`}>Today's Schedule</p>
            </div>

            <div className={`divide-y ${t.divide}`}>
              {SCHEDULE.map(({ time, label }) => (
                <div key={label} className="flex items-center gap-4 py-2.5">
                  <p className={`text-xs lg:text-sm font-mono tracking-wide ${t.primary} w-24 lg:w-32 shrink-0`}>
                    {time}
                  </p>
                  <p className={`font-sora font-bold text-sm lg:text-base xl:text-lg ${t.text} leading-tight`}>
                    {label}
                  </p>
                </div>
              ))}
            </div> */}

            {/* Presenter */}
            {presenterName && (
              <div className={`border ${t.primaryBorder} mt-6`}>
                <div className={`px-4 py-2 border-b ${t.primaryBorder} ${t.primaryBg}`}>
                  <p className={`text-xs lg:text-sm font-mono tracking-[0.2em] uppercase ${t.primary}`}>
                    Feature Presentation
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className={`font-sora font-black text-xl lg:text-2xl xl:text-3xl ${t.text} leading-tight`}>
                    {presenterName}
                  </p>
                  {presenterCompany && (
                    <p className={`font-sora font-semibold text-base lg:text-xl ${t.primary} mt-0.5`}>
                      {presenterCompany}
                    </p>
                  )}
                  {presenterBio && (
                    <p className={`font-nunito text-sm lg:text-base ${t.muted} leading-relaxed mt-2`}>{presenterBio}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className={`border ${t.border} p-4 flex flex-col items-center gap-3`}>
            <QRCodeSVG
              value="https://coastalreferralxchange.com/visitor"
              size={280}
              bgColor="transparent"
              fgColor={dark ? '#f8fafc' : '#0f172a'}
            />
            <p className={`text-xs lg:text-sm font-mono tracking-[0.2em] uppercase ${t.primary} text-center`}>
              Scan to interact
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
            <p className="text-xs lg:text-sm font-mono tracking-[0.2em] uppercase whitespace-nowrap">Represented</p>
          </div>
          <div className="overflow-hidden flex-1">
            {/* <Marquee speed={50} gradientWidth={0} pauseOnHover={false}>
              {[...COMPANIES, ...COMPANIES].map((company, i) => (
                <span
                  key={`${company.name}-${i}`}
                  className={`mx-10 text-xs lg:text-sm font-mono tracking-[0.25em] uppercase ${t.text} py-3 inline-block`}
                >
                  ◆ {company.name}
                </span>
              ))}
            </Marquee> */}
          </div>
        </div>
      </div>
    </div>
  )
}
