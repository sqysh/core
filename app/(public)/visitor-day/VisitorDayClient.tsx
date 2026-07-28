'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { QRCodeSVG } from 'qrcode.react'
import { getPusherClient } from '@/app/lib/pusher/pusherClient'
import { FloatingEmojiEl } from '../../components/_shared/FloatingEmoji'
import { FloatingEmoji } from '@/types/attendance.types'
import { formatCurrency } from '@/app/lib/utils/currency.utils'

const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false })

interface VisitorDayTVProps {
  date?: string
  presenterName?: string | null
  presenterCompany?: string | null
  presenterBio?: string | null
  initialReactionCount?: number
  isVisitorDay: boolean
  stats?: {
    totalRevenue: number
    totalParleys: number
    totalReferrals: number
  } | null
}

export default function VisitorDayTV({
  date,
  presenterName,
  presenterCompany,
  presenterBio,
  initialReactionCount = 0,
  isVisitorDay,
  stats
}: VisitorDayTVProps) {
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([])
  const [totalReactions, setTotalReactions] = useState(initialReactionCount)

  const t = {
    bg: 'bg-bg-dark',
    border: 'border-border-dark',
    divide: 'divide-border-dark',
    text: 'text-text-dark',
    muted: 'text-muted-dark',
    primary: 'text-primary-dark',
    primaryBg: 'bg-primary-dark/10',
    primaryBorder: 'border-primary-dark/40',
    primaryBar: 'bg-primary-dark',
    fadeFrom: 'from-bg-dark via-bg-dark/70 to-transparent'
  }

  useEffect(() => {
    const pusher = getPusherClient()
    const channel = pusher.subscribe('visitor-reactions')
    channel.bind('reaction', (data: { emoji: string; count: number }) => {
      const id = `${Date.now()}-${Math.random()}`
      const x = 10 + Math.random() * 80
      setFloaters((prev) => [...prev, { id, emoji: data.emoji, x }])
      setTotalReactions(data.count)
    })
    return () => {
      channel.unbind_all()
    }
  }, [])

  return (
    <div
      className={`h-screen w-screen overflow-hidden ${t.bg} ${t.text} flex flex-col transition-colors duration-300 relative`}
    >
      {/* ── Floating emojis ── */}
      <AnimatePresence>
        {floaters.map((f) => (
          <FloatingEmojiEl
            key={f.id}
            emoji={f.emoji}
            x={f.x}
            onDone={() => setFloaters((prev) => prev.filter((fl) => fl.id !== f.id))}
          />
        ))}
      </AnimatePresence>

      {/* ── Globe ── */}
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
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 min-h-0 relative z-10">
        {/* ── Left column ── */}
        <div className={`flex flex-col justify-between px-5 lg:px-10 py-8 flex-1 border-r ${t.border}`}>
          <div>
            <h1
              className={`font-sora font-black text-4xl sm:text-5xl lg:text-7xl xl:text-8xl ${t.text} leading-none tracking-tight mb-1`}
            >
              {isVisitorDay ? 'Visitor Day' : 'Thursday Meeting'}
            </h1>
            <p className={`font-sora font-semibold text-xl lg:text-3xl xl:text-4xl ${t.primary} mb-4 lg:mb-6`}>
              {date}
            </p>
            <p className={`font-nunito text-sm lg:text-lg xl:text-xl ${t.muted} leading-relaxed max-w-sm`}>
              {isVisitorDay
                ? "A local business networking group on Boston's North Shore. One seat per industry."
                : 'North Shore Chapter · One seat per industry · Members only.'}
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
                { value: stats.totalParleys, label: '1-2-1 Meetings' },
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

          <p className={`text-xs lg:text-sm font-mono tracking-widest uppercase ${t.muted}`}>
            ✦ Food & refreshments provided · 7:00 AM – 8:30 AM
          </p>
        </div>

        {/* ── Right column ── */}
        <div className="hidden lg:flex flex-col justify-between px-10 py-8 w-95 xl:w-105 shrink-0">
          <div>
            {/* Presenter — only on visitor days */}
            {isVisitorDay && presenterName && (
              <div className={`border ${t.primaryBorder}`}>
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

            {/* Non-visitor day — group tagline instead */}
            {!isVisitorDay && (
              <div className={`border ${t.border} px-5 py-5`}>
                <p className={`font-mono text-xs tracking-[0.2em] uppercase ${t.primary} mb-2`}>About CORE</p>
                <p className={`font-nunito text-sm lg:text-base ${t.muted} leading-relaxed`}>
                  Coastal Referral Exchange is a curated group of North Shore professionals — one seat per industry,
                  built on trust and real referrals.
                </p>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className={`border ${t.border} p-4 flex flex-col items-center gap-3`}>
            <QRCodeSVG
              value={isVisitorDay ? 'https://coastalreferralxchange.com/visitor' : 'https://coastalreferralxchange.com'}
              size={280}
              bgColor="transparent"
              fgColor="#f8fafc"
            />
            <p className={`text-xs lg:text-sm font-mono tracking-[0.2em] uppercase ${t.primary} text-center`}>
              {isVisitorDay ? 'Scan to interact' : 'coastalreferralxchange.com'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Ticker ── */}
      <div className={`shrink-0 relative z-10 border-t-2 border-primary-dark bg-primary-dark/10 overflow-hidden`}>
        <div className="flex items-center">
          <div
            className={`shrink-0 flex items-center gap-2 px-4 py-3 border-r-2 border-primary-dark bg-primary-dark text-white`}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
            <p className="text-xs lg:text-sm font-mono tracking-[0.2em] uppercase whitespace-nowrap">Represented</p>
          </div>
          <div className="overflow-hidden flex-1" />
        </div>
      </div>
    </div>
  )
}
