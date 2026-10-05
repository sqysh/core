'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { getInitials } from '@/lib/utils/shared.utils'

interface Seat {
  label: string
  search: string
  holder: { name: string; company: string; profileImage: string | null } | null
}

export default function OpenSeatsClient({ seats }: { seats: Seat[] }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const { hits, answer } = useMemo(() => {
    if (!q) return { hits: null as Set<string> | null, answer: null }

    const matched = seats.filter((s) => s.search.includes(q))
    if (!matched.length) {
      return {
        hits: new Set<string>(),
        answer: { text: 'Not on our list yet, which usually means the seat is wide open.', open: true }
      }
    }

    const open = matched.filter((s) => !s.holder)
    return {
      hits: new Set(matched.map((s) => s.label)),
      answer: open.length
        ? { text: 'That seat is open. It could be yours.', open: true }
        : { text: 'That seat is taken, but reach out anyway. Industries shift.', open: false }
    }
  }, [q, seats])

  const openCount = seats.filter((s) => !s.holder).length

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <div className="max-w-5xl mx-auto px-4 xs:px-6 pt-12 pb-20">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-10"
        >
          <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-3">
            Coastal Referral Exchange
          </p>
          <h1 className="font-sora font-black text-[38px] xs:text-[52px] text-text-light dark:text-text-dark tracking-tight leading-none">
            One seat per industry.
          </h1>
          <p className="font-nunito text-[15px] xs:text-[17px] text-muted-light dark:text-muted-dark leading-relaxed mt-4 max-w-xl">
            We hold a single chair for each profession, so nobody in the room is competing for the same work.{' '}
            <span className="text-primary-light dark:text-primary-dark font-semibold">
              {openCount} {openCount === 1 ? 'seat is' : 'seats are'} open.
            </span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="mb-10 max-w-md"
        >
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What do you do?"
              aria-label="Search industries"
              className="w-full h-13 pl-10 pr-10 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark font-nunito text-[15px] text-text-light dark:text-text-dark placeholder:text-muted-light/60 dark:placeholder:text-muted-dark/60 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <p
            className={`text-[13px] font-nunito mt-2.5 min-h-5 ${
              answer
                ? answer.open
                  ? 'text-primary-light dark:text-primary-dark'
                  : 'text-muted-light dark:text-muted-dark'
                : 'text-muted-light/70 dark:text-muted-dark/70'
            }`}
            role="status"
          >
            {answer?.text ?? 'Type your industry to see if the seat is free.'}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 gap-2.5">
          {seats.map((seat, i) => {
            const dim = hits !== null && !hits.has(seat.label)
            const hit = hits !== null && hits.has(seat.label)
            const open = !seat.holder

            const inner = (
              <>
                {open ? (
                  <>
                    <p className="font-sora font-bold text-[13.5px] text-primary-light dark:text-primary-dark leading-tight">
                      {seat.label}
                    </p>
                    <p className="text-f10 font-mono tracking-[0.12em] uppercase text-primary-light/60 dark:text-primary-dark/60 mt-1.5">
                      Seat open
                    </p>
                  </>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 shrink-0 rounded-full overflow-hidden bg-primary-light/10 dark:bg-primary-dark/10 flex items-center justify-center">
                      {seat.holder!.profileImage ? (
                        <img src={seat.holder!.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-sora font-black text-[9px] text-primary-light dark:text-primary-dark">
                          {getInitials(seat.holder!.name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-sora font-bold text-[13.5px] text-text-light dark:text-text-dark leading-tight truncate">
                        {seat.label}
                      </p>
                      <p className="text-[11px] font-nunito text-muted-light dark:text-muted-dark truncate mt-0.5">
                        {seat.holder!.company}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )

            return (
              <motion.div
                key={seat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: dim ? 0.2 : 1, y: 0 }}
                transition={{ duration: 0.3, delay: hits === null ? Math.min(i * 0.012, 0.4) : 0 }}
              >
                {open ? (
                  <Link
                    href={`/application?industry=${encodeURIComponent(seat.label)}`}
                    className={`block h-full px-3.5 py-3 border border-dashed border-primary-light/40 dark:border-primary-dark/40 bg-primary-light/5 dark:bg-primary-dark/5 hover:bg-primary-light/10 dark:hover:bg-primary-dark/10 hover:border-primary-light dark:hover:border-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark ${
                      hit ? 'ring-2 ring-primary-light dark:ring-primary-dark' : ''
                    }`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    className={`h-full px-3.5 py-3 border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark ${
                      hit ? 'ring-2 ring-primary-light dark:ring-primary-dark' : ''
                    }`}
                  >
                    {inner}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        <div className="mt-12 flex flex-col xs:flex-row items-stretch xs:items-center gap-3">
          <Link
            href="/application"
            className="h-12 px-8 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-sm tracking-wide hover:opacity-90 transition-opacity inline-flex items-center justify-center whitespace-nowrap"
          >
            Apply for a seat
          </Link>
          <Link
            href="/members"
            className="h-12 px-8 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark font-sora font-bold text-sm tracking-wide hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors inline-flex items-center justify-center whitespace-nowrap"
          >
            Meet the members
          </Link>
        </div>
      </div>
    </div>
  )
}
