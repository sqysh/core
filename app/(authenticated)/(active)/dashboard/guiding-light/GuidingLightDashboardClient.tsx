'use client'

import { motion } from 'framer-motion'
import { fmtDate } from '@/lib/utils/date.utils'
import { getInitials } from '@/lib/utils/shared.utils'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Member {
  id: string
  name: string
  company: string
  profileImage: string | null
}

interface GuidingLightRecord {
  id: string
  meetingDate: string
  isMyWin: boolean
  wasMyJudge: boolean
  winner: Member | null
  judgedBy: Member | null
}

interface Props {
  records: GuidingLightRecord[]
  timesWon: number
  timesJudged: number
}

function Avatar({ member }: { member: Member }) {
  return (
    <div className="w-7 h-7 shrink-0 rounded-full overflow-hidden border border-primary-light/20 dark:border-primary-dark/20 bg-primary-light/10 dark:bg-primary-dark/10 flex items-center justify-center">
      {member.profileImage ? (
        <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-sora font-black text-[9px] text-primary-light dark:text-primary-dark">
          {getInitials(member.name)}
        </span>
      )}
    </div>
  )
}

const COLS = 'grid grid-cols-[1fr_2fr_2fr] gap-4 px-4'
const HEADS = ['Date', 'Winner', 'Judged By']

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

export default function GuidingLightDashboardClient({ records, timesWon, timesJudged }: Props) {
  return (
    <main className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[10px] sm:text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
        >
          <ArrowLeft size={11} aria-hidden="true" />
          Back to Dashboard
        </Link>
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 sm:mb-8"
        >
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
            Dashboard
          </p>
          <h1 className="font-sora font-black text-[26px] text-text-light dark:text-text-dark tracking-tight">
            Guiding Light
          </h1>
        </motion.div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="border border-primary-light/30 dark:border-primary-dark/30 bg-primary-light/5 dark:bg-primary-dark/5 p-4">
            <p className="text-[9.5px] font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark mb-1">
              Times Won
            </p>
            <p className="font-sora font-black text-[32px] text-primary-light dark:text-primary-dark leading-none">
              {timesWon}
            </p>
          </div>
          <div className="border border-border-light dark:border-border-dark p-4">
            <p className="text-[9.5px] font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark mb-1">
              Times Judged
            </p>
            <p className="font-sora font-black text-[32px] text-text-light dark:text-text-dark leading-none">
              {timesJudged}
            </p>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="border border-border-light dark:border-border-dark overflow-hidden">
          {records.length === 0 ? (
            <p className="px-4 py-8 text-[12.5px] font-nunito text-muted-light dark:text-muted-dark text-center">
              No Guiding Light history yet
            </p>
          ) : (
            <>
              <TableHead />
              <div className="divide-y divide-border-light dark:divide-border-dark">
                {records.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.025 }}
                    className={`${COLS} items-center px-4 py-3.5 transition-colors ${
                      r.isMyWin
                        ? 'bg-primary-light/5 dark:bg-primary-dark/5'
                        : 'hover:bg-surface-light dark:hover:bg-surface-dark'
                    }`}
                  >
                    {/* Date */}
                    <div>
                      <p className="text-[12px] font-mono text-muted-light dark:text-muted-dark">
                        {fmtDate(r.meetingDate)}
                      </p>
                      {r.isMyWin && (
                        <p className="text-[9px] font-mono tracking-[0.15em] uppercase text-primary-light dark:text-primary-dark mt-0.5">
                          your win
                        </p>
                      )}
                      {r.wasMyJudge && (
                        <p className="text-[9px] font-mono tracking-[0.15em] uppercase text-amber-500 dark:text-amber-400 mt-0.5">
                          you judged
                        </p>
                      )}
                    </div>

                    {/* Winner */}
                    {r.winner ? (
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar member={r.winner} />
                        <div className="min-w-0">
                          <p
                            className={`font-sora font-bold text-[13px] truncate ${
                              r.isMyWin
                                ? 'text-primary-light dark:text-primary-dark'
                                : 'text-text-light dark:text-text-dark'
                            }`}
                          >
                            {r.winner.name}
                          </p>
                          <p className="text-[10px] font-mono text-muted-light dark:text-muted-dark truncate">
                            {r.winner.company}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[12px] font-mono text-muted-light dark:text-muted-dark">—</span>
                    )}

                    {/* Judged by */}
                    {r.judgedBy ? (
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar member={r.judgedBy} />
                        <div className="min-w-0">
                          <p
                            className={`font-sora font-bold text-[13px] truncate ${
                              r.wasMyJudge
                                ? 'text-amber-500 dark:text-amber-400'
                                : 'text-text-light dark:text-text-dark'
                            }`}
                          >
                            {r.judgedBy.name}
                          </p>
                          <p className="text-[10px] font-mono text-muted-light dark:text-muted-dark truncate">
                            {r.judgedBy.company}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[12px] font-mono text-muted-light dark:text-muted-dark">—</span>
                    )}
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
