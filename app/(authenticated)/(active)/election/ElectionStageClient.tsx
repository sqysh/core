'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CircleCheck, Circle } from 'lucide-react'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { getElectionResults, type PositionResult } from '@/lib/actions/election/getElectionResults'
import ResultsReveal from './_components/ResultsReveal'

export interface Member {
  id: string
  name: string
  company: string
  profileImage: string | null
}

type Phase = 'open' | 'sealing' | 'revealing' | 'done'

function Clock() {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
      )
    tick()
    const id = setInterval(tick, 10_000)
    return () => clearInterval(id)
  }, [])

  // Rendered client-side only so the server/client clock can't disagree on hydration
  return <span className="font-mono text-[16px] tracking-[0.14em] text-white/55">{time ?? ''}</span>
}

export default function ElectionStageClient({
  year,
  members,
  initialVotedIds
}: {
  year: number
  members: Member[]
  initialVotedIds: string[]
  isSuperUser: boolean
}) {
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set(initialVotedIds))
  const [flash, setFlash] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('open')
  const [results, setResults] = useState<PositionResult[] | null>(null)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const total = members.length
  const count = votedIds.size
  const outstanding = total - count
  const complete = outstanding === 0

  useEffect(() => {
    const channel = getPusherClient().subscribe('election-status')
    const timeouts = timeoutsRef.current

    const onSubmitted = (data: { voterId: string }) => {
      setVotedIds((prev) => new Set(prev).add(data.voterId))
      setFlash(data.voterId)
      timeouts.push(setTimeout(() => setFlash(null), 2600))
    }

    channel.bind('ballot-submitted', onSubmitted)

    return () => {
      channel.unbind('ballot-submitted', onSubmitted)
      releaseChannel('election-status')
      timeouts.forEach(clearTimeout)
    }
  }, [])

  useEffect(() => {
    if (!complete || phase !== 'open') return

    const timeouts = timeoutsRef.current
    const loadedComplete = initialVotedIds.length === total

    const load = async () => {
      const res = await getElectionResults()
      if (res.success) {
        setResults(res.results)
        setPhase('revealing')
      }
    }

    // Page opened after voting already closed, so skip the sealing wave
    if (loadedComplete) {
      load()
      return
    }

    timeouts.push(setTimeout(() => setPhase('sealing'), 700))
    timeouts.push(setTimeout(load, 700 + 180 * total + 900))
  }, [complete, phase, total, initialVotedIds.length])

  if ((phase === 'revealing' || phase === 'done') && results) {
    return <ResultsReveal results={results} year={year} members={members} onDone={() => setPhase('done')} />
  }

  const flashed = flash ? members.find((m) => m.id === flash) : null

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#141829] flex flex-col">
      <div className="flex items-stretch h-20 bg-[#2a1b52] shrink-0">
        <div className="flex items-center gap-3 px-8 bg-[#d0432f]">
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="w-3 h-3 rounded-full bg-white"
          />
          <span className="font-mono text-[18px] tracking-[0.22em] text-white">LIVE</span>
        </div>
        <div className="flex-1 flex items-center pl-9">
          <span className="font-mono text-[18px] tracking-[0.24em] text-violet-200">ELECTION DAY · {year}</span>
        </div>
        <div className="flex items-center gap-7 pr-8">
          <span className="font-mono text-[16px] tracking-[0.14em] text-white/55">COASTAL REFERRAL EXCHANGE</span>
          <Clock />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-12 min-h-0">
        <div className="text-center">
          <p className="font-mono text-[18px] tracking-[0.3em] text-white/50 mb-5">BALLOTS CAST</p>

          <AnimatePresence mode="popLayout">
            <motion.p
              key={count}
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18, position: 'absolute' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="font-sora font-black text-[clamp(90px,15vmin,170px)] text-white leading-[0.85] tracking-tight tabular-nums"
            >
              {count}
              <span className="text-[0.46em] text-white/30"> / {total}</span>
            </motion.p>
          </AnimatePresence>

          <div className="flex gap-0.75 h-4 mt-10 max-w-6xl mx-auto">
            {members.map((m, i) => (
              <motion.div
                key={m.id}
                className="flex-1"
                animate={{
                  backgroundColor: votedIds.has(m.id) ? '#a78bfa' : '#33334d',
                  opacity: phase === 'sealing' ? [1, 0.35, 1] : 1
                }}
                transition={{
                  backgroundColor: { duration: 0.4, delay: i * 0.01 },
                  opacity: { duration: 0.45, delay: i * 0.18 }
                }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-x-20 gap-y-2 mt-16 max-w-6xl mx-auto w-full">
          {members.map((member, i) => {
            const hasVoted = votedIds.has(member.id)
            const isFlash = flash === member.id

            return (
              <motion.div
                key={member.id}
                animate={{
                  scale: phase === 'sealing' ? [1, 1.07, 1] : isFlash ? 1.04 : 1,
                  color: phase === 'sealing' ? ['#ffffff', '#c4b5fd', '#ffffff'] : undefined
                }}
                transition={phase === 'sealing' ? { duration: 0.5, delay: i * 0.18 } : { duration: 0.3 }}
                className="flex items-center gap-4 py-2"
              >
                <motion.span
                  animate={{ color: hasVoted ? '#c4b5fd' : '#565677' }}
                  transition={{ duration: 0.3 }}
                  className="shrink-0 flex items-center"
                >
                  {hasVoted ? <CircleCheck size={28} /> : <Circle size={28} />}
                </motion.span>
                <motion.span
                  animate={{ color: hasVoted ? '#ffffff' : '#7a7a9c' }}
                  transition={{ duration: 0.3 }}
                  className="font-sora font-bold text-[28px] truncate"
                >
                  {member.name}
                </motion.span>
              </motion.div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between px-8 py-5 bg-[#1e1735] shrink-0">
        <AnimatePresence mode="wait">
          <motion.p
            key={phase === 'sealing' ? 'sealing' : flashed ? flashed.id : outstanding}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="font-mono text-[16px] tracking-[0.2em] text-violet-200"
          >
            {phase === 'sealing'
              ? 'SEALING BALLOTS'
              : flashed
                ? `${flashed.name.toUpperCase()} VOTED`
                : `${outstanding} OUTSTANDING`}
          </motion.p>
        </AnimatePresence>

        <p className="font-mono text-[16px] tracking-[0.2em] text-white/40">OPEN THE APP ON YOUR PHONE TO VOTE</p>
      </div>
    </div>
  )
}
