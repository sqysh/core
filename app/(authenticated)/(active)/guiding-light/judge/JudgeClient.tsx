'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { toggleGuidingLightNominee } from '@/lib/actions/guiding-light/toggleGuidingLightNominee'
import { selectGuidingLightWinner } from '@/lib/actions/guiding-light/selectGuidingLightWinner'
import { getInitials } from '@/lib/utils/shared.utils'
import MemberRow from './_components/MemberRow'
import { Member } from '../_types/guiding-light.types'

interface Props {
  roundId: string
  members: Member[]
  initialNominees: string[]
}

export default function JudgeClient({ roundId, members, initialNominees }: Props) {
  const [revealed, setRevealed] = useState(false)
  const [nominees, setNominees] = useState<Set<string>>(new Set(initialNominees))
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleToggle(userId: string) {
    setLoadingId(userId)
    const next = new Set(nominees)
    if (next.has(userId)) next.delete(userId)
    else next.add(userId)
    setNominees(next)
    await toggleGuidingLightNominee(roundId, userId)
    setLoadingId(null)
  }

  async function handleSelectWinner(userId: string) {
    setSubmitting(true)
    await selectGuidingLightWinner(roundId, userId)
    setSubmitting(false)
    setRevealed(true)
  }

  const nomineeList = members.filter((m) => nominees.has(m.id))
  const rest = members.filter((m) => !nominees.has(m.id))

  if (revealed) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex flex-col items-center justify-center gap-4 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="flex flex-col items-center gap-4"
        >
          <p className="text-4xl">🏆</p>
          <p className="font-sora font-black text-[28px] text-text-light dark:text-text-dark tracking-tight leading-none">
            Look at the TV
          </p>
          <p className="font-nunito text-[14px] text-muted-light dark:text-muted-dark max-w-xs leading-relaxed">
            The winner is being revealed on screen right now.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark pb-24">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
            Guiding Light · Judge
          </p>
        </div>
        <h1 className="font-sora font-black text-[22px] text-text-light dark:text-text-dark tracking-tight mt-1">
          Who delivered the best 60 seconds?
        </h1>
        <p className="text-[12px] font-nunito text-muted-light dark:text-muted-dark mt-0.5">
          Tap members to shortlist. When you're ready, select the winner.
        </p>
      </div>

      <div className="px-4 py-5 flex flex-col gap-6">
        {/* ── Shortlist ── */}
        {nomineeList.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="block w-4 h-px bg-amber-400 shrink-0" aria-hidden="true" />
              <p className="text-[9.5px] font-mono tracking-[0.2em] uppercase text-amber-500 dark:text-amber-400">
                Your shortlist · {nomineeList.length}
              </p>
            </div>
            <div className="flex flex-col divide-y divide-border-light dark:divide-border-dark border border-amber-200 dark:border-amber-400/20 overflow-hidden">
              {nomineeList.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  nominated
                  loading={loadingId === m.id}
                  submitting={submitting}
                  onToggle={() => handleToggle(m.id)}
                  onConfirm={() => setConfirmId(m.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── All members ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="block w-4 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
            <p className="text-[9.5px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
              All members
            </p>
          </div>
          <div className="flex flex-col divide-y divide-border-light dark:divide-border-dark border border-border-light dark:border-border-dark overflow-hidden">
            {rest.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                nominated={false}
                loading={loadingId === m.id}
                submitting={submitting}
                onToggle={() => handleToggle(m.id)}
                onConfirm={() => {}}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Confirm winner overlay ── */}
      <AnimatePresence>
        {confirmId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
              onClick={() => setConfirmId(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-bg-light dark:bg-bg-dark border-t border-border-light dark:border-border-dark p-6"
            >
              {(() => {
                const winner = members.find((m) => m.id === confirmId)
                if (!winner) return null
                return (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400 bg-primary-light/10 dark:bg-primary-dark/10 flex items-center justify-center">
                      {winner.profileImage ? (
                        <img src={winner.profileImage} alt={winner.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-sora font-black text-xl text-primary-light dark:text-primary-dark">
                          {getInitials(winner.name)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-amber-500 dark:text-amber-400 mb-1">
                        Confirm Guiding Light
                      </p>
                      <p className="font-sora font-black text-[22px] text-text-light dark:text-text-dark">
                        {winner.name}
                      </p>
                      <p className="text-[13px] font-nunito text-muted-light dark:text-muted-dark">{winner.company}</p>
                    </div>
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => setConfirmId(null)}
                        disabled={submitting}
                        className="flex-1 h-12 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark font-sora font-bold text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors disabled:opacity-40"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSelectWinner(confirmId)}
                        disabled={submitting}
                        className="flex-1 h-12 bg-amber-500 dark:bg-amber-600 text-white font-sora font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 inline-flex items-center justify-center gap-2"
                      >
                        <Trophy size={16} />
                        {submitting ? 'Revealing…' : 'Reveal Winner'}
                      </button>
                    </div>
                  </div>
                )
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
