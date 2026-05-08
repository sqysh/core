'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ExternalLink, ArrowLeft } from 'lucide-react'
import Marquee from 'react-fast-marquee'

interface TEvent {
  id: string
  name: string
  org: string
  description?: string | null
  externalLink?: string | null
  status: string
  createdAt: string
}

function MarqueeContent({ event }: { event: TEvent }) {
  const content = [event.name, event.org, event.description].filter(Boolean).join(' · ')
  const isOverflowing = content.length > 40

  if (isOverflowing) {
    return (
      <Marquee speed={30} gradientWidth={20} pauseOnHover>
        <span className="text-[13px] font-sora font-semibold text-text-light dark:text-text-dark pr-8">
          {event.name}
        </span>
        <span className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark pr-8">
          {event.org}
        </span>
        {event.description && (
          <span className="text-xs font-nunito text-muted-light dark:text-muted-dark pr-8">{event.description}</span>
        )}
      </Marquee>
    )
  }

  return (
    <div>
      <p className="text-[13px] font-sora font-semibold text-text-light dark:text-text-dark leading-tight truncate">
        {event.name}
      </p>
      <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark mt-0.5 truncate">
        {event.org}
      </p>
    </div>
  )
}

export default function EventsClient({ events }: { events: TEvent[] }) {
  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <main className="max-w-170 mx-auto px-4 pb-12">
        {/* ── Header ── */}
        <div className="pt-7 pb-5 border-b border-border-light dark:border-border-dark">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            <ArrowLeft size={11} />
            Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
            <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
              CORE
            </p>
          </div>
          <h1 className="font-sora font-black text-3xl text-text-light dark:text-text-dark tracking-tight mt-1">
            Past Events
          </h1>
          <p className="font-nunito text-sm text-muted-light dark:text-muted-dark mt-1">
            {events.length} completed {events.length === 1 ? 'event' : 'events'}
          </p>
        </div>

        {/* ── Events list ── */}
        <div className="pt-6">
          {events.length === 0 ? (
            <p className="font-nunito text-sm text-muted-light dark:text-muted-dark py-8 text-center">
              No past events yet.
            </p>
          ) : (
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark"
            >
              {events.map((event, i) => (
                <motion.li
                  key={event.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="overflow-hidden"
                >
                  {event.externalLink ? (
                    <a
                      href={event.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                    >
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <MarqueeContent event={event} />
                      </div>
                      <ExternalLink
                        size={11}
                        className="text-primary-light dark:text-primary-dark shrink-0"
                        aria-hidden="true"
                      />
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <MarqueeContent event={event} />
                      </div>
                    </div>
                  )}
                </motion.li>
              ))}
            </motion.ul>
          )}
        </div>
      </main>
    </div>
  )
}
