'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fmtDate } from '@/lib/utils/date.utils'
import { getInitials } from '@/lib/utils/shared.utils'
import Link from 'next/link'

interface GuidingLightRecord {
  id: string
  meetingDate: string
  winner: { id: string; name: string; company: string; profileImage: string | null } | null
  judgedBy: { id: string; name: string } | null
}

interface Props {
  records: GuidingLightRecord[]
  currentJudge: { id: string; name: string } | null
}

function Avatar({ member }: { member: { name: string; profileImage: string | null } }) {
  return (
    <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden border border-primary-light/20 dark:border-primary-dark/20 bg-primary-light/10 dark:bg-primary-dark/10 flex items-center justify-center">
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

export function GuidingLightPanel({ records, currentJudge }: Props) {
  const latest = records[0] ?? null

  return (
    <div className="border border-border-light dark:border-border-dark">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex items-center justify-between gap-3">
        <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark">
          Guiding Light
        </p>
        {currentJudge && (
          <p className="text-f10 font-mono tracking-widest uppercase text-primary-light dark:text-primary-dark">
            Judge · {currentJudge.name.split(' ')[0]}
          </p>
        )}
      </div>

      {/* Latest winner */}
      {latest?.winner ? (
        <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
          <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark mb-2.5">
            Last winner · {fmtDate(latest.meetingDate)}
          </p>
          <div className="flex items-center gap-3">
            <Avatar member={latest.winner} />
            <div className="min-w-0">
              <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark truncate">
                {latest.winner.name}
              </p>
              <p className="text-[11px] font-mono text-muted-light dark:text-muted-dark truncate">
                {latest.winner.company}
              </p>
            </div>

            <div className="relative w-12 h-12 shrink-0 flex items-center justify-center ml-auto">
              <motion.span
                className="absolute inset-0 rounded-full pointer-events-none"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent 0deg, rgba(56,189,248,0.4) 30deg, transparent 60deg)'
                }}
              />
              <svg
                width="22"
                height="28"
                viewBox="0 0 14 18"
                fill="none"
                className="relative z-10 text-primary-light dark:text-primary-dark"
              >
                <rect x="4.5" y="0" width="5" height="3" rx="0.5" fill="currentColor" opacity="0.9" />
                <path d="M5 3 L4 14 L10 14 L9 3 Z" fill="currentColor" opacity="0.7" />
                <rect x="3" y="14" width="8" height="2.5" rx="0.5" fill="currentColor" opacity="0.9" />
                <rect x="5.5" y="10" width="3" height="4" rx="0.5" className="fill-bg-light dark:fill-bg-dark" />
                <rect x="5.5" y="5" width="3" height="1.5" rx="0.3" className="fill-bg-light dark:fill-bg-dark" />
                <rect x="5.5" y="7.5" width="3" height="1.5" rx="0.3" className="fill-bg-light dark:fill-bg-dark" />
              </svg>
            </div>
          </div>
          {latest.judgedBy && (
            <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark mt-2">
              Selected by {latest.judgedBy.name.split(' ')[0]}
            </p>
          )}
        </div>
      ) : (
        <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
          <p className="text-xs font-nunito text-muted-light dark:text-muted-dark leading-relaxed">
            No Guiding Light selected yet.
          </p>
        </div>
      )}

      {/* Recent history */}
      {records.length > 1 && (
        <div className="divide-y divide-border-light dark:divide-border-dark">
          {records.slice(1, 4).map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              {r.winner && <Avatar member={r.winner} />}
              <div className="flex-1 min-w-0">
                <p className="font-sora font-bold text-[12px] text-text-light dark:text-text-dark truncate">
                  {r.winner?.name ?? '—'}
                </p>
                <p className="text-f10 font-mono text-muted-light dark:text-muted-dark">{fmtDate(r.meetingDate)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border-light dark:border-border-dark">
        <Link
          href="/dashboard/guiding-light"
          className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
        >
          View All →
        </Link>
      </div>
    </div>
  )
}
