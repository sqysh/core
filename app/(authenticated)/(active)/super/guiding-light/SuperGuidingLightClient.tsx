'use client'

import { TableHead } from '@/components/_shared/TableHead'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { LinkBody } from '@/components/_shared/LinkBody'
import { Member } from '@/types/guiding-light.types'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deferGuidingLight } from '@/lib/actions/guiding-light/deferGuidingLight'
import { updatePreviousWinner } from '@/lib/actions/guiding-light/updatePreviousWinner'
import ManualPickerOverlay from '@/components/_shared/ManualPickerOverlay'
import { RowContent } from './_components/RowContent'
import { RecordRoundForm } from './_components/RecordRoundForm'
import { fmtDate } from '@/lib/utils/date.utils'
import type { GuidingLightDeferral } from '@/lib/actions/guiding-light/getGuidingLightDeferral'

export interface GuidingLightRecord {
  id: string
  meetingDate: string
  status: string
  winner: Member | null
  judgedBy: Member | null
}

// ─── Sub-components ──────────────────────────────────────────────────────────
const COLS = 'grid grid-cols-[1fr_2fr_2fr_80px] gap-4 px-4'
const HEADS = ['Date', 'Winner', 'Judged By', 'Status']

// ─── Main ────────────────────────────────────────────────────────────────────
export function SuperGuidingLightClient({
  records,
  members,
  deferral
}: {
  records: GuidingLightRecord[]
  members: Member[]
  deferral: GuidingLightDeferral | null
}) {
  const openRound = records.find((r) => r.status === 'OPEN')
  const [deferring, setDeferring] = useState(false)
  const latestRevealedId = records.find((r) => r.status === 'REVEALED')?.id
  const router = useRouter()
  const [showWinnerPicker, setShowWinnerPicker] = useState(false)
  const [changingWinner, setChangingWinner] = useState(false)
  const [showRecord, setShowRecord] = useState(false)

  async function handleDefer(id: string) {
    setDeferring(true)
    await deferGuidingLight(id)
    setDeferring(false)
    router.refresh()
  }

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
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-on-dark">{records.length}</span>
            <button
              onClick={() => setShowRecord((v) => !v)}
              className="h-6 px-3 text-[10px] font-mono tracking-[0.15em] uppercase border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors"
            >
              {showRecord ? 'Cancel' : '+ Record'}
            </button>
          </div>
        </div>

        {openRound && (
          <div className="mb-4 flex items-center justify-between gap-4 border border-primary-light/30 bg-primary-light/5 px-4 py-3 dark:border-primary-dark/30 dark:bg-primary-dark/5">
            <div>
              <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
                Round open &middot; {fmtDate(openRound.meetingDate)}
              </p>
              <p className="mt-1 text-[12.5px] font-nunito text-muted-light dark:text-muted-dark">
                No winner picked. Defer it to next week and the same judge carries over.
              </p>
            </div>
            <button
              onClick={() => handleDefer(openRound.id)}
              disabled={deferring}
              className="h-9 shrink-0 px-4 bg-primary-light font-sora text-[12px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-button-dark"
            >
              {deferring ? 'Deferring…' : 'Defer to next week'}
            </button>
          </div>
        )}

        {deferral && (
          <div className="mb-4 border border-amber-400/30 bg-amber-400/6 px-4 py-3">
            <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-amber-600 dark:text-amber-400">
              {deferral.today ? 'Deferred to next week' : `Deferred from ${fmtDate(deferral.meetingDate)}`}
            </p>
            {deferral.judge && (
              <p className="mt-1 text-[12.5px] font-nunito text-muted-light dark:text-muted-dark">
                {deferral.judge.name} is still the judge.
              </p>
            )}
          </div>
        )}

        <AnimatePresence>
          {showRecord && (
            <RecordRoundForm
              members={members}
              onDone={() => {
                setShowRecord(false)
                router.refresh()
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Table ── */}
        <div className="border border-border-light dark:border-border-dark overflow-hidden">
          {records.length === 0 ? (
            <p className="px-4 py-8 text-[12.5px] font-nunito text-muted-light dark:text-muted-dark text-center">
              No Guiding Light records yet
            </p>
          ) : (
            <>
              <TableHead cols={COLS} heads={HEADS} />
              <div className="divide-y divide-border-light dark:divide-border-dark">
                {records.map((r, i) => {
                  const isLatestRevealed = r.id === latestRevealedId
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
                          <LinkBody>
                            <RowContent r={r} onDefer={() => handleDefer(r.id)} />
                          </LinkBody>
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
