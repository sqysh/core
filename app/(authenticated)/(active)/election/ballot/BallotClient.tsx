'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronLeft } from 'lucide-react'
import { LeadershipPosition } from '@prisma/client'
import { POSITIONS, ELECTED_POSITIONS, APPOINTED_POSITIONS } from '@/lib/constants/leadership.constants'
import { submitBallot } from '@/lib/actions/election/submitBallot'
import { getInitials } from '@/lib/utils/shared.utils'

interface Member {
  id: string
  name: string
  company: string
  profileImage: string | null
}

type Picks = Partial<Record<LeadershipPosition, string[]>>

function Avatar({ member, size = 40 }: { member: Member; size?: number }) {
  return (
    <div
      className="shrink-0 rounded-full overflow-hidden bg-primary-light/10 dark:bg-primary-dark/10 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {member.profileImage ? (
        <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="font-sora font-black text-[11px] text-primary-light dark:text-primary-dark">
          {getInitials(member.name)}
        </span>
      )}
    </div>
  )
}

export default function BallotClient({
  members,
  year,
  alreadyVoted,
  currentHolders,
  appointeeName
}: {
  members: Member[]
  year: number
  alreadyVoted: boolean
  currentHolders: Partial<Record<LeadershipPosition, { id: string; name: string }[]>>
  appointeeName: string
}) {
  const [step, setStep] = useState(0)
  const [picks, setPicks] = useState<Picks>({})
  const [reviewing, setReviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(alreadyVoted)
  const [error, setError] = useState<string | null>(null)

  const byId = new Map(members.map((m) => [m.id, m]))

  function toggle(position: LeadershipPosition, memberId: string) {
    const seats = POSITIONS[position].seats
    const current = picks[position] ?? []
    const has = current.includes(memberId)

    const next = has ? current.filter((id) => id !== memberId) : [...current, memberId]
    if (next.length > seats) return

    setPicks((prev) => ({ ...prev, [position]: next }))

    // Single-seat positions advance on tap; multi-seat wait for the Next button
    if (seats === 1 && !has) {
      if (reviewing) return
      if (step < ELECTED_POSITIONS.length - 1) setStep((s) => s + 1)
      else setReviewing(true)
    }
  }

  function advance() {
    if (reviewing) return
    if (step < ELECTED_POSITIONS.length - 1) setStep((s) => s + 1)
    else setReviewing(true)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    const res = await submitBallot(picks as Record<LeadershipPosition, string[]>)
    setSubmitting(false)
    if (res.success) setSubmitted(true)
    else setError(res.error ?? 'Something went wrong')
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex flex-col items-center justify-center px-8 text-center gap-5">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="w-16 h-16 rounded-full bg-primary-light dark:bg-primary-dark flex items-center justify-center"
        >
          <Check size={28} className="text-white" strokeWidth={3} />
        </motion.div>
        <div>
          <p className="font-sora font-black text-[26px] text-text-light dark:text-text-dark tracking-tight">
            Ballot submitted
          </p>
          <p className="font-nunito text-[14px] text-muted-light dark:text-muted-dark mt-1.5">
            Results will be revealed on the screen once everyone has voted.
          </p>
        </div>
      </div>
    )
  }

  if (reviewing) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark pb-28">
        <div className="px-5 pt-7 pb-5 border-b border-border-light dark:border-border-dark">
          <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
            {year} Election
          </p>
          <h1 className="font-sora font-black text-[24px] text-text-light dark:text-text-dark tracking-tight">
            Review your ballot
          </h1>
          <p className="font-nunito text-[13px] text-muted-light dark:text-muted-dark mt-1">
            Tap any position to change your pick.
          </p>
        </div>

        <div className="divide-y divide-border-light dark:divide-border-dark">
          {ELECTED_POSITIONS.map((position) => {
            const chosen = (picks[position] ?? []).map((id) => byId.get(id)?.name).filter(Boolean)
            return (
              <button
                key={position}
                onClick={() => {
                  setStep(ELECTED_POSITIONS.indexOf(position))
                  setReviewing(false)
                }}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark">
                    {POSITIONS[position].label}
                    {POSITIONS[position].seats > 1 && ` · ${POSITIONS[position].seats} seats`}
                  </p>
                  <p className="font-sora font-bold text-[15px] text-text-light dark:text-text-dark mt-0.5">
                    {chosen.length ? chosen.join(', ') : '—'}
                  </p>
                </div>
              </button>
            )
          })}

          {APPOINTED_POSITIONS.map((position) => {
            const outgoing = currentHolders[position]?.map((h) => h.name).join(', ')
            const changing = outgoing && outgoing !== appointeeName

            return (
              <div key={position} className="px-5 py-3.5 opacity-60">
                <p className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark">
                  {POSITIONS[position].label} · appointed
                </p>
                <p className="font-sora font-bold text-[15px] text-text-light dark:text-text-dark mt-0.5">
                  {appointeeName}
                </p>
                {changing && (
                  <p className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mt-1">
                    Taking over from {outgoing}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {error && (
          <p className="px-5 pt-4 text-[13px] font-nunito text-red-500 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="fixed bottom-0 inset-x-0 px-5 py-4 bg-bg-light dark:bg-bg-dark border-t border-border-light dark:border-border-dark">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-13 bg-primary-light dark:bg-button-dark text-white font-sora font-black text-[15px] tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {submitting ? 'Submitting…' : 'Submit ballot'}
          </button>
        </div>
      </div>
    )
  }

  const position = ELECTED_POSITIONS[step]
  const meta = POSITIONS[position]
  const currentIds = new Set((currentHolders[position] ?? []).map((h) => h.id))

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark pb-28">
      <div className="px-5 pt-7 pb-5 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between mb-3">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-1 text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark"
            >
              <ChevronLeft size={13} />
              Back
            </button>
          ) : (
            <span />
          )}
          <p className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark">
            {step + 1} of {ELECTED_POSITIONS.length}
          </p>
        </div>

        <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
          {year} Election
        </p>
        <h1 className="font-sora font-black text-[28px] text-text-light dark:text-text-dark tracking-tight leading-none">
          {meta.label}
        </h1>
        <p className="font-nunito text-[13px] text-muted-light dark:text-muted-dark mt-1.5">
          {meta.seats > 1
            ? `Pick ${meta.seats}. ${(picks[position] ?? []).length} of ${meta.seats} selected.`
            : 'Pick one.'}
        </p>
        {!!currentHolders[position]?.length && (
          <p className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mt-2">
            Currently · {currentHolders[position]!.map((h) => h.name).join(', ')}
          </p>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={position}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18 }}
          className="divide-y divide-border-light dark:divide-border-dark"
        >
          {members.map((member) => {
            const selected = (picks[position] ?? []).includes(member.id)
            const isCurrent = currentIds.has(member.id)

            return (
              <button
                key={member.id}
                onClick={() => toggle(position, member.id)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                  selected
                    ? 'bg-primary-light/10 dark:bg-primary-dark/10'
                    : 'hover:bg-surface-light dark:hover:bg-surface-dark'
                }`}
              >
                <Avatar member={member} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-sora font-bold text-[15px] text-text-light dark:text-text-dark truncate">
                      {member.name}
                    </p>
                    {isCurrent && (
                      <span className="shrink-0 text-f10 font-mono tracking-[0.12em] uppercase text-primary-light dark:text-primary-dark border border-primary-light/40 dark:border-primary-dark/40 px-1.5 py-0.5">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] font-mono text-muted-light dark:text-muted-dark truncate">
                    {member.company}
                  </p>
                </div>
                {selected && (
                  <Check size={18} className="text-primary-light dark:text-primary-dark shrink-0" strokeWidth={3} />
                )}
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>

      {meta.seats > 1 && (
        <div className="fixed bottom-0 inset-x-0 px-5 py-4 bg-bg-light dark:bg-bg-dark border-t border-border-light dark:border-border-dark">
          <button
            onClick={advance}
            disabled={(picks[position] ?? []).length !== meta.seats}
            className="w-full h-13 bg-primary-light dark:bg-button-dark text-white font-sora font-black text-[15px] tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {(picks[position] ?? []).length === meta.seats
              ? 'Next'
              : `Pick ${meta.seats - (picks[position] ?? []).length} more`}
          </button>
        </div>
      )}
    </div>
  )
}
