'use client'

import { motion } from 'framer-motion'
import { fmtDate } from '@/lib/utils/date.utils'
import { getInitials } from '@/lib/utils/shared.utils'
import Link from 'next/link'
import { Member } from '../../guiding-light/_types/guiding-light.types'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updatePreviousWinner } from '@/lib/actions/guiding-light/updatePreviousWinner'
import ManualPickerOverlay from '../../guiding-light/stage/_components/ManualPickerOverlay'

// ─── Types ───────────────────────────────────────────────────────────────────

interface GuidingLightRecord {
  id: string
  meetingDate: string
  status: string
  winner: Member | null
  judgedBy: Member | null
}

// ─── Sub-components ──────────────────────────────────────────────────────────
const COLS = 'grid grid-cols-[1fr_2fr_2fr_80px] gap-4 px-4'
const HEADS = ['Date', 'Winner', 'Judged By', 'Status']

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

function RowContent({
  r,
  isLatest,
  onChangeWinner
}: {
  r: GuidingLightRecord
  isLatest?: boolean
  onChangeWinner?: () => void
}) {
  return (
    <>
      {/* Date */}
      <p className="text-[12px] font-mono text-muted-light dark:text-muted-dark">{fmtDate(r.meetingDate)}</p>

      {/* Winner */}
      {r.winner ? (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar member={r.winner} />
          <div className="min-w-0">
            <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark truncate">
              {r.winner.name}
            </p>
            <p className="text-[10px] font-mono text-muted-light dark:text-muted-dark truncate">{r.winner.company}</p>
          </div>
          {isLatest && onChangeWinner && (
            <button
              onClick={(e) => {
                e.preventDefault()
                onChangeWinner()
              }}
              className="ml-2 shrink-0 h-6 px-2 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark font-mono text-[8px] tracking-[0.12em] uppercase hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors"
            >
              Change
            </button>
          )}
        </div>
      ) : (
        <span className="text-[12px] font-mono text-muted-light dark:text-muted-dark">—</span>
      )}

      {/* Judged by */}
      {r.judgedBy ? (
        <div className="min-w-0">
          <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark truncate">
            {r.judgedBy.name}
          </p>
          <p className="text-[10px] font-mono text-muted-light dark:text-muted-dark truncate">{r.judgedBy.company}</p>
        </div>
      ) : (
        <span className="text-[12px] font-mono text-muted-light dark:text-muted-dark">—</span>
      )}

      {/* Status */}
      <span
        className={`text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 border w-fit ${
          r.status === 'REVEALED'
            ? 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-400/20'
            : 'bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-400/20'
        }`}
      >
        {r.status.toLowerCase()}
      </span>
    </>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export function SuperGuidingLightClient({ records, members }: { records: GuidingLightRecord[]; members: Member[] }) {
  const router = useRouter()
  const [showWinnerPicker, setShowWinnerPicker] = useState(false)
  const [changingWinner, setChangingWinner] = useState(false)

  async function handleUpdateWinner(memberId: string) {
    setChangingWinner(true)
    await updatePreviousWinner(memberId)
    setChangingWinner(false)
    setShowWinnerPicker(false)
    router.refresh()
  }

  return (
    <>
      <ManualPickerOverlay
        title="Change Previous Winner"
        show={showWinnerPicker}
        submitting={changingWinner}
        members={members}
        onClose={() => setShowWinnerPicker(false)}
        onSelect={handleUpdateWinner}
      />
      <div className="p-6">
        {/* ── Page header ── */}
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
              Super · Admin
            </p>
            <h1 className="font-sora font-black text-[26px] text-text-light dark:text-text-dark tracking-tight">
              Guiding Light
            </h1>
          </div>
          <span className="text-[11px] font-mono text-on-dark">{records.length}</span>
        </div>

        {/* ── Table ── */}
        <div className="border border-border-light dark:border-border-dark overflow-hidden">
          {records.length === 0 ? (
            <p className="px-4 py-8 text-[12.5px] font-nunito text-muted-light dark:text-muted-dark text-center">
              No Guiding Light records yet
            </p>
          ) : (
            <>
              <TableHead />
              <div className="divide-y divide-border-light dark:divide-border-dark">
                {records.map((r, i) => {
                  const isLatestRevealed = i === 0 && r.status === 'REVEALED'
                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: i * 0.025 }}
                    >
                      {r.status === 'OPEN' ? (
                        <Link
                          href="/guiding-light/stage"
                          className={`${COLS} items-center px-4 py-3.5 transition-colors bg-primary-light/5 dark:bg-primary-dark/5 hover:bg-primary-light/10 dark:hover:bg-primary-dark/10`}
                        >
                          <RowContent r={r} />
                        </Link>
                      ) : (
                        <div
                          className={`${COLS} items-center px-4 py-3.5 transition-colors hover:bg-surface-light dark:hover:bg-surface-dark`}
                        >
                          <RowContent
                            r={r}
                            isLatest={isLatestRevealed}
                            onChangeWinner={isLatestRevealed ? () => setShowWinnerPicker(true) : undefined}
                          />
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
