'use client'

import { motion } from 'framer-motion'
import { LeadershipPosition } from '@prisma/client'
import { POSITION_ORDER, POSITIONS } from '@/lib/constants/leadership.constants'
import { getInitials } from '@/lib/utils/shared.utils'

interface Term {
  id: string
  position: LeadershipPosition
  startDate: string
  year: number
  isActive: boolean
  manualOverride: boolean
  holder: { id: string; name: string; company: string; profileImage: string | null }
}

const COLS = 'grid grid-cols-[1.5fr_2fr_1fr] gap-4 px-4'
const HEADS = ['Position', 'Holder', 'Status']

function TableHead() {
  return (
    <div className={`${COLS} py-2.5 bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark`}>
      {HEADS.map((h) => (
        <span key={h} className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-on-dark">
          {h}
        </span>
      ))}
    </div>
  )
}

function Avatar({ holder }: { holder: Term['holder'] }) {
  return (
    <div className="w-7 h-7 shrink-0 rounded-full overflow-hidden border border-primary-light/20 dark:border-primary-dark/20 bg-primary-light/10 dark:bg-primary-dark/10 flex items-center justify-center">
      {holder.profileImage ? (
        <img src={holder.profileImage} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="font-sora font-black text-[9px] text-primary-light dark:text-primary-dark">
          {getInitials(holder.name)}
        </span>
      )}
    </div>
  )
}

export function SuperElectionClient({ terms }: { terms: Term[] }) {
  const years = [...new Set(terms.map((t) => t.year))].sort((a, b) => b - a)

  return (
    <div className="p-6">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
            Super · Admin
          </p>
          <h1 className="font-sora font-black text-[26px] text-text-light dark:text-text-dark tracking-tight">
            Election
          </h1>
        </div>
        <span className="text-[11px] font-mono text-on-dark">
          {years.length} {years.length === 1 ? 'term' : 'terms'}
        </span>
      </div>

      {years.length === 0 ? (
        <div className="border border-border-light dark:border-border-dark px-4 py-8">
          <p className="text-[12.5px] font-nunito text-muted-light dark:text-muted-dark text-center">
            No leadership terms recorded yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {years.map((year) => {
            const yearTerms = terms.filter((t) => t.year === year)
            const active = yearTerms.some((t) => t.isActive)

            const byPosition = POSITION_ORDER.map((position) => ({
              position,
              holders: yearTerms.filter((t) => t.position === position)
            })).filter((g) => g.holders.length > 0)

            return (
              <div key={year}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
                  <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
                    {year} Season
                  </p>
                  {active && (
                    <span className="text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 border bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-400/20">
                      current
                    </span>
                  )}
                  <span className="ml-auto text-[11px] font-mono text-muted-light dark:text-muted-dark">
                    {yearTerms.length} seats
                  </span>
                </div>

                <div className="border border-border-light dark:border-border-dark overflow-hidden">
                  <TableHead />
                  <div className="divide-y divide-border-light dark:divide-border-dark">
                    {byPosition.map(({ position, holders }, i) => (
                      <motion.div
                        key={position}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: i * 0.025 }}
                        className={`${COLS} items-center px-4 py-3.5 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors`}
                      >
                        <div>
                          <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark">
                            {POSITIONS[position].label}
                          </p>
                          {holders.length !== POSITIONS[position].seats && (
                            <p className="text-[10px] font-mono text-amber-500 dark:text-amber-400 mt-0.5">
                              {holders.length} of {POSITIONS[position].seats}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 min-w-0">
                          {holders.map((t) => (
                            <div key={t.id} className="flex items-center gap-2.5 min-w-0">
                              <Avatar holder={t.holder} />
                              <div className="min-w-0">
                                <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark truncate">
                                  {t.holder.name}
                                </p>
                                <p className="text-[10px] font-mono text-muted-light dark:text-muted-dark truncate">
                                  {t.holder.company}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <span
                          className={`text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 border w-fit ${
                            POSITIONS[position].isElected
                              ? 'bg-primary-light/5 dark:bg-primary-dark/5 text-primary-light dark:text-primary-dark border-primary-light/20 dark:border-primary-dark/20'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {POSITIONS[position].isElected ? 'elected' : 'appointed'}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
