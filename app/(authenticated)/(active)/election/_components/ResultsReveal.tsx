'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LeadershipPosition } from '@prisma/client'
import { getInitials } from '@/lib/utils/shared.utils'
import { resolveTie } from '@/lib/actions/election/resolveTie'
import type { PositionResult, QuestionResult } from '@/lib/actions/election/getElectionResults'
import { POSITION_ORDER, POSITIONS } from '@/lib/constants/leadership.constants'
import { ArrowRightLeft, Check, Plus, X } from 'lucide-react'
import { Member } from '../stage/ElectionStageClient'
import { finalizeElection } from '@/lib/actions/election/finalizeElection'
import Link from 'next/link'

type Roster = Partial<
  Record<LeadershipPosition, { id: string; name: string; company: string; profileImage: string | null }[]>
>

const HOLD_MS = 2600
const BOARD_HOLD_MS = 2600

const BURST = Array.from({ length: 26 }, (_, i) => {
  const angle = (i / 26) * Math.PI * 2
  return { x: Math.cos(angle) * (300 + Math.random() * 260), y: Math.sin(angle) * (300 + Math.random() * 260) }
})

function Winner({ w, delay, big }: { w: PositionResult['winners'][number]; delay: number; big: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 70, scale: 0.75 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 18 }}
      className="flex flex-col items-center gap-5"
    >
      <div
        className="rounded-full overflow-hidden border-4 border-violet-300"
        style={{ width: big ? '22vmin' : '15vmin', height: big ? '22vmin' : '15vmin' }}
      >
        {w.profileImage ? (
          <img src={w.profileImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-violet-500/25 flex items-center justify-center">
            <span className="font-sora font-black text-white" style={{ fontSize: big ? '6.5vmin' : '4.4vmin' }}>
              {getInitials(w.name)}
            </span>
          </div>
        )}
      </div>

      <div className="text-center">
        <p
          className="font-sora font-black text-white leading-none tracking-tight"
          style={{ fontSize: big ? 'clamp(52px,7.2vmin,98px)' : 'clamp(34px,4.8vmin,64px)' }}
        >
          {w.name}
        </p>
        <p className="font-mono tracking-[0.18em] uppercase text-violet-300 mt-3" style={{ fontSize: big ? 20 : 16 }}>
          {w.company}
        </p>
      </div>
    </motion.div>
  )
}

export default function ResultsReveal({
  results,
  year,
  members,
  onDone,
  questions
}: {
  results: PositionResult[]
  year: number
  members: Member[]
  onDone: () => void
  questions: QuestionResult[]
}) {
  const [index, setIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [boardSettled, setBoardSettled] = useState(false)
  const [resolved, setResolved] = useState<Record<string, string>>({})
  const [resolving, setResolving] = useState(false)
  const [roster, setRoster] = useState<Roster | null>(null)
  const [editing, setEditing] = useState(false)
  const [picker, setPicker] = useState<{
    mode: 'add' | 'move'
    position: LeadershipPosition
    memberId?: string
  } | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [finalized, setFinalized] = useState(false)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const [justFinalized, setJustFinalized] = useState(false)

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const ties = results.filter((r) => r.tied && !resolved[r.position])

  // Seed the editable roster from the vote once, after ties are settled
  useEffect(() => {
    if (!finished || roster) return
    if (ties.length) return

    const seeded: Roster = {}
    for (const r of results) {
      const pick = resolved[r.position]
      const people = pick ? [...r.winners.slice(0, -1), r.tieCandidates.find((c) => c.id === pick)!] : r.winners
      seeded[r.position] = people.map((p) => ({
        id: p.id,
        name: p.name,
        company: p.company,
        profileImage: p.profileImage
      }))
    }
    setRoster(seeded)
  }, [finished, ties.length, results, resolved, roster])

  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => timeouts.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (finished) return
    const t = setTimeout(() => {
      if (index >= results.length - 1) {
        setFinished(true)
        onDone()
      } else {
        setIndex((i) => i + 1)
      }
    }, HOLD_MS)
    timeoutsRef.current.push(t)
    return () => clearTimeout(t)
  }, [index, finished, results.length, onDone])

  // Let the board breathe before any tiebreaker ribbon drops over it
  useEffect(() => {
    if (!finished) return
    const t = setTimeout(() => setBoardSettled(true), BOARD_HOLD_MS)
    timeoutsRef.current.push(t)
    return () => clearTimeout(t)
  }, [finished])

  async function handleResolve(position: LeadershipPosition, winnerId: string) {
    setResolving(true)
    await resolveTie(position, winnerId)
    setResolving(false)
    setResolved((prev) => ({ ...prev, [position]: winnerId }))
  }

  function removeFrom(position: LeadershipPosition, memberId: string) {
    setRoster((prev) => ({ ...prev, [position]: (prev?.[position] ?? []).filter((p) => p.id !== memberId) }))
  }

  function addTo(position: LeadershipPosition, member: Member) {
    setRoster((prev) => {
      const current = prev?.[position] ?? []
      if (current.some((p) => p.id === member.id)) return prev
      return { ...prev, [position]: [...current, member] }
    })
  }

  function moveTo(from: LeadershipPosition, to: LeadershipPosition, memberId: string) {
    setRoster((prev) => {
      if (!prev) return prev
      const person = (prev[from] ?? []).find((p) => p.id === memberId)
      if (!person) return prev
      const target = prev[to] ?? []
      return {
        ...prev,
        [from]: (prev[from] ?? []).filter((p) => p.id !== memberId),
        [to]: target.some((p) => p.id === memberId) ? target : [...target, person]
      }
    })
  }

  async function handleFinalize() {
    if (!roster) return
    setFinalizing(true)
    setFinalizeError(null)

    const payload = Object.fromEntries(
      Object.entries(roster).map(([position, people]) => [position, (people ?? []).map((p) => p.id)])
    )

    const res = await finalizeElection(payload)
    setFinalizing(false)

    if (res.success) {
      setFinalized(true)
      setEditing(false)
      setJustFinalized(true)
      timeoutsRef.current.push(setTimeout(() => setJustFinalized(false), 3200))
    } else setFinalizeError(res.error ?? 'Something went wrong')
  }

  if (finished && boardSettled && ties.length) {
    const r = ties[0]

    return (
      <div className="h-screen w-screen overflow-hidden bg-[#141829] relative flex flex-col items-center justify-center">
        <motion.div
          initial={{ scaleX: 0, rotate: -3 }}
          animate={{ scaleX: 1, rotate: -3 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="absolute w-[140%] bg-amber-500 py-6 origin-center"
          style={{ top: '13%' }}
        >
          <p
            className="font-sora font-black text-center text-[#141829] tracking-[0.2em] uppercase"
            style={{ fontSize: 'clamp(38px,5.6vmin,80px)' }}
          >
            Tiebreaker
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="font-mono text-[20px] tracking-[0.25em] uppercase text-amber-300 mt-28"
        >
          {r.label} · {r.tieCandidates[0]?.votes} votes each
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="flex items-start justify-center gap-[8vmin] mt-14"
        >
          {r.tieCandidates.map((c) => (
            <button
              key={c.id}
              onClick={() => handleResolve(r.position, c.id)}
              disabled={resolving}
              className="flex flex-col items-center gap-5 group disabled:opacity-40"
            >
              <div
                className="rounded-full overflow-hidden border-4 border-amber-400 group-hover:border-white transition-colors"
                style={{ width: '17vmin', height: '17vmin' }}
              >
                {c.profileImage ? (
                  <img src={c.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-amber-400/20 flex items-center justify-center">
                    <span className="font-sora font-black text-white" style={{ fontSize: '5vmin' }}>
                      {getInitials(c.name)}
                    </span>
                  </div>
                )}
              </div>
              <p
                className="font-sora font-black text-white leading-none"
                style={{ fontSize: 'clamp(30px,4vmin,54px)' }}
              >
                {c.name}
              </p>
              <p className="font-mono text-[15px] tracking-[0.15em] uppercase text-white/35">{c.company}</p>
            </button>
          ))}
        </motion.div>

        {ties.length > 1 && (
          <p className="absolute bottom-10 font-mono text-[15px] tracking-[0.2em] uppercase text-white/25">
            {ties.length - 1} more to resolve
          </p>
        )}
      </div>
    )
  }

  if (finished) {
    const board = roster ?? {}
    const seatsFilled = Object.values(board).flat().length

    return (
      <div className="h-screen w-screen overflow-hidden bg-[#141829] flex flex-col">
        <div className="flex items-stretch shrink-0" style={{ height: '6vh' }}>
          <div className="flex items-center bg-[#4c3a8a]" style={{ paddingInline: '2.2vmin' }}>
            <span className="font-mono text-white" style={{ fontSize: '1.3vmin', letterSpacing: '0.22em' }}>
              {editing ? 'ADJUSTING' : 'CERTIFIED'}
            </span>
          </div>
          <div className="flex-1 flex items-center bg-[#2a1b52]" style={{ paddingLeft: '2.4vmin' }}>
            <span className="font-mono text-violet-200" style={{ fontSize: '1.3vmin', letterSpacing: '0.24em' }}>
              OFFICIAL RESULTS · {year}&ndash;{year + 1} SEASON
            </span>
          </div>
          <div className="flex items-center bg-[#2a1b52]" style={{ paddingRight: '2.2vmin' }}>
            <div className="flex items-center bg-[#2a1b52]" style={{ paddingRight: '2.2vmin', gap: '1.2vmin' }}>
              {finalized ? (
                <>
                  <Link
                    href="/"
                    className="border border-white/25 text-white/70 font-mono uppercase hover:border-white/60 hover:text-white transition-colors"
                    style={{ fontSize: '1.1vmin', letterSpacing: '0.15em', padding: '0.8vmin 2vmin' }}
                  >
                    Home
                  </Link>
                  <Link
                    href="/super/election"
                    className="border border-violet-400/50 text-violet-200 font-mono uppercase hover:border-violet-300 hover:text-white transition-colors"
                    style={{ fontSize: '1.1vmin', letterSpacing: '0.15em', padding: '0.8vmin 2vmin' }}
                  >
                    Super
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => setEditing((v) => !v)}
                  className="border border-white/25 text-white/70 font-mono uppercase hover:border-white/60 hover:text-white transition-colors"
                  style={{ fontSize: '1.1vmin', letterSpacing: '0.15em', padding: '0.8vmin 2vmin' }}
                >
                  {editing ? 'Done' : 'Adjust'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col justify-center min-h-0" style={{ paddingInline: '3vmin' }}>
            {POSITION_ORDER.map((position, i) => {
              const people = board[position] ?? []
              const meta = POSITIONS[position]
              const canEdit = editing && meta.isElected

              return (
                <motion.div
                  key={position}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: canEdit ? 0 : 0.55 + i * 0.12, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="grid items-center border-b border-white/10"
                  style={{ gridTemplateColumns: '22vmin 1fr auto', gap: '2.5vmin', paddingBlock: '1.5vmin' }}
                >
                  <span
                    className="font-mono uppercase text-violet-300/60 leading-tight"
                    style={{ fontSize: '1.5vmin', letterSpacing: '0.16em' }}
                  >
                    {meta.label}
                    {!meta.isElected && <span className="text-white/20"> · appointed</span>}
                  </span>

                  <div className="flex flex-wrap items-center" style={{ gap: '0.6vmin 2.4vmin' }}>
                    {people.length === 0 && (
                      <span className="font-sora font-black text-white/25" style={{ fontSize: '2.6vmin' }}>
                        —
                      </span>
                    )}

                    {people.map((p) => (
                      <span key={p.id} className="flex items-center" style={{ gap: '1vmin' }}>
                        <span className="font-sora font-black text-white leading-tight" style={{ fontSize: '2.6vmin' }}>
                          {p.name}
                        </span>
                        {canEdit && (
                          <span className="flex items-center" style={{ gap: '0.5vmin' }}>
                            <button
                              onClick={() => setPicker({ mode: 'move', position, memberId: p.id })}
                              className="flex items-center justify-center border border-white/25 text-white/50 hover:border-violet-400 hover:text-violet-300 transition-colors"
                              style={{ width: '2.6vmin', height: '2.6vmin' }}
                              aria-label={`Move ${p.name}`}
                            >
                              <ArrowRightLeft style={{ width: '1.3vmin', height: '1.3vmin' }} />
                            </button>
                            <button
                              onClick={() => removeFrom(position, p.id)}
                              className="flex items-center justify-center border border-white/25 text-white/50 hover:border-red-400 hover:text-red-400 transition-colors"
                              style={{ width: '2.6vmin', height: '2.6vmin' }}
                              aria-label={`Remove ${p.name}`}
                            >
                              <X style={{ width: '1.3vmin', height: '1.3vmin' }} />
                            </button>
                          </span>
                        )}
                      </span>
                    ))}

                    {canEdit && (
                      <button
                        onClick={() => setPicker({ mode: 'add', position })}
                        className="flex items-center justify-center border border-white/25 text-white/50 hover:border-violet-400 hover:text-violet-300 transition-colors"
                        style={{ width: '2.6vmin', height: '2.6vmin' }}
                        aria-label={`Add to ${meta.label}`}
                      >
                        <Plus style={{ width: '1.4vmin', height: '1.4vmin' }} />
                      </button>
                    )}
                  </div>

                  <span
                    className={`font-mono uppercase whitespace-nowrap ${
                      people.length === meta.seats ? 'text-white/25' : 'text-amber-400'
                    }`}
                    style={{ fontSize: '1.2vmin', letterSpacing: '0.15em' }}
                  >
                    {people.length} of {meta.seats}
                  </span>
                </motion.div>
              )
            })}
          </div>

          {questions.length > 0 && (
            <div
              className="shrink-0 border-l border-white/10 flex flex-col justify-center"
              style={{ width: '28vw', paddingInline: '2.6vmin', gap: '4vmin' }}
            >
              <p
                className="font-mono uppercase text-violet-300/60"
                style={{ fontSize: '1.3vmin', letterSpacing: '0.2em' }}
              >
                Group questions
              </p>

              {questions.map((q, qi) => {
                const top = Math.max(...q.counts.map((c) => c.count))

                return (
                  <motion.div
                    key={q.key}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + qi * 0.15, duration: 0.45 }}
                  >
                    <p
                      className="font-sora font-bold text-white leading-snug"
                      style={{ fontSize: '1.7vmin', marginBottom: '0.4vmin' }}
                    >
                      {q.title}
                    </p>
                    <p
                      className="font-mono uppercase text-white/25"
                      style={{ fontSize: '1.05vmin', letterSpacing: '0.15em', marginBottom: '1.4vmin' }}
                    >
                      {q.total} voted
                    </p>

                    <div className="flex flex-col" style={{ gap: '0.8vmin' }}>
                      {q.counts.map((c) => {
                        const pct = q.total ? Math.round((c.count / q.total) * 100) : 0
                        const leading = c.count === top && c.count > 0

                        return (
                          <div
                            key={c.value}
                            className="grid items-center"
                            style={{ gridTemplateColumns: '7vmin 1fr 3vmin', gap: '1.2vmin' }}
                          >
                            <span
                              className={`font-mono uppercase truncate ${
                                leading ? 'text-violet-200' : 'text-white/35'
                              }`}
                              style={{ fontSize: '1.1vmin', letterSpacing: '0.1em' }}
                            >
                              {c.label}
                            </span>

                            <div className="bg-white/5 relative overflow-hidden" style={{ height: '2.2vmin' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ delay: 1.1 + qi * 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                                className={`h-full ${leading ? 'bg-violet-400' : 'bg-white/15'}`}
                              />
                            </div>

                            <span
                              className={`font-sora font-black text-right tabular-nums ${
                                leading ? 'text-white' : 'text-white/35'
                              }`}
                              style={{ fontSize: '1.7vmin' }}
                            >
                              {c.count}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between bg-[#1e1735] shrink-0"
          style={{ paddingInline: '2.2vmin', paddingBlock: '1.4vmin' }}
        >
          <p className="font-mono text-violet-200" style={{ fontSize: '1.2vmin', letterSpacing: '0.2em' }}>
            {seatsFilled} SEATS FILLED
          </p>

          <div className="flex items-center" style={{ gap: '2vmin' }}>
            {finalizeError && (
              <p className="font-mono text-red-400" style={{ fontSize: '1.1vmin' }}>
                {finalizeError}
              </p>
            )}
            {finalized ? (
              <p className="font-mono text-emerald-400" style={{ fontSize: '1.2vmin', letterSpacing: '0.2em' }}>
                FINALIZED
              </p>
            ) : (
              <button
                onClick={handleFinalize}
                disabled={finalizing || editing}
                className="bg-violet-500 text-white font-sora font-black uppercase hover:bg-violet-400 transition-colors disabled:opacity-30"
                style={{ fontSize: '1.2vmin', letterSpacing: '0.12em', padding: '1.1vmin 3vmin' }}
              >
                {finalizing ? 'Saving…' : 'Finalize'}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {picker && (
            <>
              <div
                onClick={() => setPicker(null)}
                className="fixed inset-0 z-40"
                style={{ backgroundColor: 'rgba(0,0,0,0.78)' }}
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                <div className="pointer-events-auto w-120 max-h-[70vh] border border-violet-400/30 bg-[#141829] flex flex-col">
                  <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <span className="font-mono text-[13px] tracking-[0.2em] uppercase text-violet-300">
                      {picker.mode === 'add' ? `Add to ${POSITIONS[picker.position].label}` : 'Move to'}
                    </span>
                    <button
                      onClick={() => setPicker(null)}
                      className="text-white/40 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="overflow-y-auto divide-y divide-white/5">
                    {picker.mode === 'add'
                      ? members.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => {
                              addTo(picker.position, m)
                              setPicker(null)
                            }}
                            className="w-full px-6 py-3.5 text-left hover:bg-white/5 transition-colors"
                          >
                            <p className="font-sora font-bold text-[16px] text-white">{m.name}</p>
                            <p className="font-mono text-[12px] text-white/35 mt-0.5">{m.company}</p>
                          </button>
                        ))
                      : POSITION_ORDER.filter((p) => p !== picker.position && POSITIONS[p].isElected).map((p) => (
                          <button
                            key={p}
                            onClick={() => {
                              moveTo(picker.position, p, picker.memberId!)
                              setPicker(null)
                            }}
                            className="w-full px-6 py-3.5 text-left hover:bg-white/5 transition-colors"
                          >
                            <p className="font-sora font-bold text-[16px] text-white">{POSITIONS[p].label}</p>
                            <p className="font-mono text-[12px] text-white/35 mt-0.5">
                              {(board[p] ?? []).length} of {POSITIONS[p].seats} filled
                            </p>
                          </button>
                        ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {justFinalized && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(20,24,41,0.94)' }}
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="flex flex-col items-center gap-7"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -12 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 14 }}
                  className="w-28 h-28 rounded-full bg-emerald-500 flex items-center justify-center"
                >
                  <Check size={56} className="text-white" strokeWidth={3.5} />
                </motion.div>

                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="w-80 h-1 bg-emerald-400 origin-center"
                />

                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="font-sora font-black text-white leading-none tracking-tight"
                  style={{ fontSize: 'clamp(48px,7vmin,104px)' }}
                >
                  Finalized
                </motion.p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="font-mono text-[16px] tracking-[0.3em] uppercase text-emerald-300"
                >
                  {year}&ndash;{year + 1} Leadership is set
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const r = results[index]
  const big = r.seats === 1

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#141829] relative flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={r.position}
          className="absolute inset-0 flex flex-col items-center justify-center"
          animate={{ x: [0, -14, 11, -5, 0], y: [0, 6, -5, 2, 0] }}
          transition={{ duration: 0.45, delay: 0.42 }}
        >
          <motion.div
            initial={{ scale: 0, opacity: 0.85 }}
            animate={{ scale: 8, opacity: 0 }}
            transition={{ duration: 1.1, delay: 0.42, ease: 'easeOut' }}
            className="absolute w-72 h-72 rounded-full border-[6px] border-violet-400"
          />
          <motion.div
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{ duration: 1.3, delay: 0.56, ease: 'easeOut' }}
            className="absolute w-72 h-72 rounded-full border-4 border-violet-200"
          />

          {BURST.map((p, i) => (
            <motion.span
              key={i}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
              transition={{ duration: 1.2, delay: 0.42, ease: 'easeOut' }}
              className="absolute w-3 h-3 bg-violet-300"
            />
          ))}

          <motion.p
            initial={{ scale: 2.6, opacity: 0, filter: 'blur(14px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="font-mono tracking-[0.3em] uppercase text-violet-300 mb-12 text-center px-8"
            style={{ fontSize: 'clamp(20px,2.6vmin,32px)' }}
          >
            {r.label}
            {r.appointed && <span className="text-white/30"> · appointed</span>}
          </motion.p>

          <div className={`flex items-start justify-center px-10 ${r.seats > 2 ? 'gap-[5vmin]' : 'gap-[8vmin]'}`}>
            {r.winners.map((w, i) => (
              <Winner key={w.id} w={w} delay={0.42 + i * 0.16} big={big} />
            ))}
          </div>

          {r.tied && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
              className="absolute bottom-16 font-mono text-[16px] tracking-[0.2em] uppercase text-amber-300"
            >
              Tie on the final seat
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-8 right-10 font-mono text-[16px] tracking-[0.2em] text-white/25">
        {index + 1} / {results.length}
      </div>
    </div>
  )
}
