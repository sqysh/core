'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Pusher from 'pusher-js'
import { triggerReaction } from '@/app/lib/actions/triggerReaction'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FloatingEmoji {
  id: string
  emoji: string
  x: number
}

interface VisitorClientProps {
  date: string
  presenterName?: string | null
  presenterCompany?: string | null
  presenterBio?: string | null
  stats?: {
    totalRevenue: number
    totalParleys: number
    totalReferrals: number
  } | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REACTIONS = [
  { emoji: '❤️', label: 'Love' },
  { emoji: '🙌', label: 'Hands' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '💡', label: 'Idea' },
  { emoji: '💼', label: 'Business' },
  { emoji: '🤝', label: 'Deal' },
  { emoji: '⭐', label: 'Star' },
  { emoji: '👏', label: 'Applause' },
  { emoji: '💰', label: 'Money' },
  { emoji: '🚀', label: 'Rocket' }
]

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

const SCHEDULE = [
  { time: '7:00 AM', label: 'Arrive', note: 'Grab food, grab a seat.' },
  { time: '7:00–7:15', label: 'Open Networking', note: 'Mingle before the meeting starts.' },
  {
    time: '7:15 AM',
    label: 'Meeting Starts',
    note: `Brendan opens up. Leadership introductions, Guiding Light's memorable moment, Education Moment from Page.`
  },
  {
    time: 'Commercials',
    label: '60-Second Commercials',
    note: `Members intro themselves. Visitors go after — you'll have a moment to introduce yourself.`
  },
  { time: 'Feature', label: 'Feature Presentation', note: 'Our keynote speaker takes the floor.' },
  {
    time: 'Events',
    label: 'Member Announcements',
    note: 'Members share upcoming events from other groups they belong to.'
  },
  {
    time: 'Round Up',
    label: 'Group Round-Up',
    note: 'We share recent referrals, face-to-face meetings, and closed business thank-yous.'
  }
]

// ─── Floating emoji ───────────────────────────────────────────────────────────

export function FloatingEmojiEl({ emoji, x, onDone }: { emoji: string; x: number; onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.8, x: 0 }}
      animate={{
        opacity: [1, 1, 1, 0],
        y: -window.innerHeight,
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
      className="fixed bottom-32 z-50 pointer-events-none select-none text-3xl"
      style={{ left: `${x}%` }}
    >
      {emoji}
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VisitorClient({
  date,
  presenterName,
  presenterCompany,
  presenterBio,
  stats
}: VisitorClientProps) {
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([])
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({})
  const pusherRef = useRef<Pusher | null>(null)
  const router = useRouter()

  // ── Pusher setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!
    })

    const channel = pusherRef.current.subscribe('visitor-reactions')

    channel.bind('reaction', (data: { emoji: string }) => {
      spawnFloater(data.emoji)
      setReactionCounts((prev) => ({
        ...prev,
        [data.emoji]: (prev[data.emoji] ?? 0) + 1
      }))
    })

    return () => {
      channel.unbind_all()
      pusherRef.current?.unsubscribe('visitor-reactions')
      pusherRef.current?.disconnect()
    }
  }, [])

  function spawnFloater(emoji: string) {
    const id = `${Date.now()}-${Math.random()}`
    const x = 10 + Math.random() * 80
    setFloaters((prev) => [...prev, { id, emoji, x }])
  }

  function removeFloater(id: string) {
    setFloaters((prev) => prev.filter((f) => f.id !== id))
  }

  async function handleReaction(emoji: string) {
    spawnFloater(emoji)
    setReactionCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }))
    await triggerReaction(emoji)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      {/* ── Floating emojis ── */}
      <AnimatePresence>
        {floaters.map((f) => (
          <FloatingEmojiEl key={f.id} emoji={f.emoji} x={f.x} onDone={() => removeFloater(f.id)} />
        ))}
      </AnimatePresence>

      {/* ── Header ── */}
      <header className="border-b border-border-light dark:border-border-dark">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
            <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
              Coastal Referral Exchange
            </p>
          </div>
          <Link
            href="/application"
            className="h-7 px-3 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark hover:border-primary-light dark:hover:border-primary-dark transition-colors text-f10 font-mono tracking-widest uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark inline-flex items-center"
          >
            Apply
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 sm:px-8 pb-40">
        {/* ── Hero ── */}
        <section className="pt-8 pb-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-3 mb-4">
            <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
            <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
              Visitor Day
            </p>
          </div>
          <h1 className="font-sora font-black text-4xl sm:text-5xl text-text-light dark:text-text-dark leading-[1.05] tracking-tight mb-2">
            Glad you're here.
          </h1>
          <p className="font-sora font-semibold text-lg text-primary-light dark:text-primary-dark mb-4">
            {date} · 25 N Common St, Lynn, MA 01902
          </p>
          <p className="font-nunito text-sm text-muted-light dark:text-muted-dark leading-relaxed max-w-lg">
            Coastal Referral Exchange is a professional networking group on Boston's North Shore. We meet every Thursday
            at 7 AM — one seat per industry, one goal: real business relationships.
          </p>
        </section>

        {/* ── Stats ── */}
        {stats && (
          <section className="py-6 border-b border-border-light dark:border-border-dark">
            <p className="text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark mb-4">
              What we've built together
            </p>
            <div className="flex items-end gap-8 sm:gap-12">
              {[
                { value: formatCurrency(stats.totalRevenue), label: 'Closed Business' },
                { value: stats.totalParleys, label: 'Meetings' },
                { value: stats.totalReferrals, label: 'Referrals' }
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="font-sora font-black text-3xl sm:text-4xl text-text-light dark:text-text-dark leading-none">
                    {value}
                  </p>
                  <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark mt-1">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Today's schedule ── */}
        <section className="py-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-3 mb-4">
            <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
            <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
              Today's Schedule
            </p>
          </div>
          <div className="border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
            {SCHEDULE.map(({ time, label, note }) => (
              <div
                key={label}
                className="flex gap-4 px-4 py-3 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
              >
                <div className="shrink-0 w-20 sm:w-24 pt-0.5">
                  <p className="text-f10 font-mono tracking-wide text-primary-light dark:text-primary-dark">{time}</p>
                </div>
                <div className="min-w-0">
                  <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark leading-tight mb-0.5">
                    {label}
                  </p>
                  <p className="font-nunito text-xs text-muted-light dark:text-muted-dark leading-relaxed">{note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Presenter ── */}
        {presenterName && (
          <section className="py-6 border-b border-border-light dark:border-border-dark">
            <div className="border border-primary-light/30 dark:border-primary-dark/30">
              <div className="px-4 py-2.5 border-b border-primary-light/30 dark:border-primary-dark/30 bg-primary-light/5 dark:bg-primary-dark/10">
                <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
                  Feature Presentation
                </p>
              </div>
              <div className="px-4 py-4">
                <p className="font-sora font-black text-xl text-text-light dark:text-text-dark leading-tight">
                  {presenterName}
                </p>
                {presenterCompany && (
                  <p className="font-sora font-semibold text-sm text-primary-light dark:text-primary-dark mt-0.5">
                    {presenterCompany}
                  </p>
                )}
                {presenterBio && (
                  <p className="font-nunito text-xs text-muted-light dark:text-muted-dark leading-relaxed mt-2">
                    {presenterBio}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Members link ── */}
        <section className="py-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark leading-tight">
                See who's in the room
              </p>
              <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-0.5">
                Browse our members and open industry seats
              </p>
            </div>
            <Link
              href="/members"
              className="shrink-0 h-8 px-3 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark hover:border-primary-light dark:hover:border-primary-dark transition-colors text-f10 font-mono tracking-widest uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark inline-flex items-center"
            >
              Members →
            </Link>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-6">
          <p className="text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark mb-2">
            Interested in joining?
          </p>
          <p className="font-nunito text-sm text-muted-light dark:text-muted-dark leading-relaxed mb-4">
            If your industry seat is open and you think CORE is a fit, we'd love to have you apply.
          </p>
          <Link
            href="/application"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-light dark:bg-primary-dark text-white font-sora font-bold text-sm hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            Apply to Join →
          </Link>
        </section>
      </main>

      {/* ── Sticky reaction bar ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border-light dark:border-border-dark bg-bg-light/95 dark:bg-bg-dark/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 py-4">
          <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark mb-3 text-center">
            React to the room
          </p>
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            {REACTIONS.map(({ emoji, label }) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                aria-label={label}
                className="flex flex-col items-center gap-1 group focus-visible:outline-none"
              >
                <span className="text-2xl sm:text-3xl transition-transform duration-150 group-hover:scale-125 group-active:scale-95 select-none">
                  {emoji}
                </span>
                {reactionCounts[emoji] ? (
                  <span className="text-f10 font-mono text-primary-light dark:text-primary-dark">
                    {reactionCounts[emoji]}
                  </span>
                ) : (
                  <span className="text-f10 font-mono text-muted-light dark:text-muted-dark opacity-0 group-hover:opacity-100 transition-opacity">
                    {label}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
