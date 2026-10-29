'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LeadershipPosition } from '@prisma/client'
import { POSITION_ORDER, POSITIONS } from '@/lib/constants/leadership.constants'
import { getInitials } from '@/lib/utils/shared.utils'
import { LinkBody } from '@/components/_shared/LinkBody'

interface Term {
  id: string
  position: LeadershipPosition
  startDate: string
  season: string
  isActive: boolean
  holder: { id: string; name: string; company: string; profileImage: string | null }
}

function priorSeason(season: string) {
  const y = Number(season.slice(0, 4))
  return `${y - 1}-${y}`
}

function buildReturningSet(terms: Term[]) {
  const held = new Set(terms.map((t) => `${t.season}|${t.position}|${t.holder.id}`))
  const returning = new Set<string>()
  for (const t of terms) {
    if (held.has(`${priorSeason(t.season)}|${t.position}|${t.holder.id}`)) returning.add(t.id)
  }
  return returning
}

function groupByPosition(terms: Term[]) {
  return POSITION_ORDER.map((position) => ({
    position,
    holders: terms.filter((t) => t.position === position)
  })).filter((g) => g.holders.length > 0)
}

function Avatar({ holder, size = 'sm' }: { holder: Term['holder']; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-[9px]' : 'w-9 h-9 text-[10px]'
  return (
    <div
      className={`${dim} shrink-0 rounded-full overflow-hidden border border-primary-light/20 dark:border-primary-dark/20 bg-primary-light/10 dark:bg-primary-dark/10 flex items-center justify-center`}
    >
      {holder.profileImage ? (
        <img src={holder.profileImage} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="font-sora font-black text-primary-light dark:text-primary-dark">
          {getInitials(holder.name)}
        </span>
      )}
    </div>
  )
}

function ReturningBadge() {
  return (
    <span className="shrink-0 text-[8px] font-mono tracking-widest uppercase px-1.5 py-0.5 border bg-primary-light/5 dark:bg-primary-dark/5 text-primary-light dark:text-primary-dark border-primary-light/20 dark:border-primary-dark/20">
      returning
    </span>
  )
}

function Holder({ t, returning, size = 'sm' }: { t: Term; returning: boolean; size?: 'sm' | 'md' }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <Avatar holder={t.holder} size={size} />
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p
            className={`font-sora font-bold ${size === 'md' ? 'text-[13.5px]' : 'text-[12.5px]'} text-text-light dark:text-text-dark truncate`}
          >
            {t.holder.name}
          </p>
          {returning && <ReturningBadge />}
        </div>
        <p className="text-[10px] font-mono text-muted-light dark:text-muted-dark truncate">{t.holder.company}</p>
      </div>
    </div>
  )
}

function SeatRow({
  position,
  holders,
  returning,
  index,
  featured = false
}: {
  position: LeadershipPosition
  holders: Term[]
  returning: Set<string>
  index: number
  featured?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
      className="grid grid-cols-[120px_1fr] xs:grid-cols-[150px_1fr] gap-4 px-4 py-3.5 items-start hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
    >
      <div className="pt-1">
        <p className="text-[9.5px] font-mono tracking-[0.13em] uppercase text-primary-light dark:text-primary-dark leading-snug">
          {POSITIONS[position].label}
        </p>
        {!POSITIONS[position].isElected && (
          <p className="text-[8px] font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark mt-1">
            appointed
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2.5 min-w-0">
        {holders.map((t) => (
          <Holder key={t.id} t={t} returning={returning.has(t.id)} size={featured ? 'md' : 'sm'} />
        ))}
      </div>
    </motion.div>
  )
}

function PastSeason({ season, terms, returning }: { season: string; terms: Term[]; returning: Set<string> }) {
  const [open, setOpen] = useState(false)
  const groups = groupByPosition(terms)

  return (
    <div className="border border-border-light dark:border-border-dark">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
      >
        <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark">
          {season} Season
        </span>
        <span className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-on-dark">{terms.length} seats</span>
          <span className="text-[11px] font-mono text-muted-light dark:text-muted-dark w-2 text-center">
            {open ? '−' : '+'}
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
              {groups.map(({ position, holders }, i) => (
                <SeatRow key={position} position={position} holders={holders} returning={returning} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LeadershipClient({ terms }: { terms: Term[] }) {
  const seasons = [...new Set(terms.map((t) => t.season))].sort((a, b) => b.localeCompare(a))
  const currentSeason = seasons.find((s) => terms.some((t) => t.season === s && t.isActive)) ?? seasons[0]
  const pastSeasons = seasons.filter((s) => s !== currentSeason)

  const currentTerms = terms.filter((t) => t.season === currentSeason)
  const currentGroups = groupByPosition(currentTerms)
  const returning = buildReturningSet(terms)

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <main className="max-w-170 mx-auto px-4 pb-12">
        <div className="pt-7 pb-5 border-b border-border-light dark:border-border-dark mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 mb-3 text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            <LinkBody icon={<ArrowLeft size={13} />} label="Dashboard" spinnerClass="w-[13px] h-[13px]" />
          </Link>
          <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
            Chapter
          </p>
          <h1 className="font-sora font-black text-[22px] xs:text-[28px] text-text-light dark:text-text-dark tracking-tight leading-none">
            Leadership
          </h1>
        </div>

        {terms.length === 0 ? (
          <div className="border border-border-light dark:border-border-dark px-4 py-8">
            <p className="text-[12.5px] font-nunito text-muted-light dark:text-muted-dark text-center">
              No leadership terms recorded yet.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
              <p className="text-[10px] font-mono tracking-[0.18em] uppercase text-primary-light dark:text-primary-dark">
                {currentSeason} Season
              </p>
              <span className="text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 border bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-400/20">
                current
              </span>
              <span className="ml-auto text-[10px] font-mono text-on-dark">{currentTerms.length} seats</span>
            </div>

            <div className="border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
              {currentGroups.map(({ position, holders }, i) => (
                <SeatRow
                  key={position}
                  position={position}
                  holders={holders}
                  returning={returning}
                  index={i}
                  featured
                />
              ))}
            </div>

            {pastSeasons.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="block w-5 h-px bg-border-light dark:bg-border-dark shrink-0" aria-hidden="true" />
                  <p className="text-[10px] font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark">
                    Past Seasons
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {pastSeasons.map((season) => (
                    <PastSeason
                      key={season}
                      season={season}
                      terms={terms.filter((t) => t.season === season)}
                      returning={returning}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
