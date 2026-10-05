'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getInitials } from '@/lib/utils/shared.utils'
import { sendMatchupEmails } from '@/lib/actions/1-2-1/sendMatchupEmails'
import { useSounds } from '@/lib/hooks/useSounds'

interface Member {
  id: string
  name: string
  company: string
  profileImage: string | null
}

interface Pair {
  id: string
  requester: Member
  recipient: Member
}

const HOLD_MS = 1500

function Side({ member, side }: { member: Member; side: 'left' | 'right' }) {
  const isLeft = side === 'left'
  return (
    <motion.div
      initial={{ x: isLeft ? '-105%' : '105%' }}
      animate={{ x: 0 }}
      transition={{ duration: 0.34, delay: isLeft ? 0 : 0.08, ease: [0.16, 1.2, 0.3, 1] }}
      className={`absolute top-0 h-full w-[52%] flex flex-col items-center justify-center gap-5 ${
        isLeft ? 'left-0 bg-[#12161f]' : 'right-0 bg-[#0e1219]'
      }`}
      style={{
        clipPath: isLeft ? 'polygon(0 0, 100% 0, 82% 100%, 0 100%)' : 'polygon(18% 0, 100% 0, 100% 100%, 0 100%)'
      }}
    >
      <div
        className={`w-64 h-64 overflow-hidden border-4 flex items-center justify-center ${
          isLeft ? 'border-primary-dark' : 'border-red-600'
        }`}
      >
        {member.profileImage ? (
          <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center ${isLeft ? 'bg-primary-dark/15' : 'bg-red-600/15'}`}
          >
            <span className={`font-sora font-black text-7xl ${isLeft ? 'text-primary-dark' : 'text-red-400'}`}>
              {getInitials(member.name)}
            </span>
          </div>
        )}
      </div>
      <div className="text-center px-6">
        <p className="font-sora font-black text-[34px] text-white leading-none tracking-tight">{member.name}</p>
        <p
          className={`font-mono text-[13px] tracking-[0.14em] uppercase mt-2 ${isLeft ? 'text-primary-dark' : 'text-red-400'}`}
        >
          {member.company}
        </p>
      </div>
    </motion.div>
  )
}

export default function MatchupsClient({ pairs, isSuperUser }: { pairs: Pair[]; isSuperUser: boolean }) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready')

  const [emailed, setEmailed] = useState(false)
  const { play } = useSounds({ enabled: true, volume: 0.5 })

  const finish = useCallback(async () => {
    setPhase('done')
    if (emailed) return
    setEmailed(true)
    await sendMatchupEmails()
  }, [emailed])

  function start() {
    play('finish')
    setTimeout(() => {
      setPhase('playing')
    }, 1500)
  }

  useEffect(() => {
    if (phase !== 'playing') return
    const t = setTimeout(() => {
      if (index >= pairs.length - 1) finish()
      else setIndex((i) => i + 1)
    }, HOLD_MS)
    return () => clearTimeout(t)
  }, [index, phase, pairs.length, finish])

  useEffect(() => {
    if (phase === 'playing') play('hit')
    else if (phase === 'done') play('flawless')
  }, [index, phase, play])

  if (phase === 'ready') {
    return (
      <button
        onClick={start}
        className="h-screen w-screen overflow-hidden bg-[#0a0f1a] flex flex-col items-center justify-center gap-8 cursor-pointer group"
      >
        <p className="font-mono text-[13px] tracking-[0.3em] uppercase text-muted-dark">Coastal Referral Exchange</p>

        <p className="font-sora font-black text-[84px] text-white leading-none tracking-tight">1-2-1 Matchups</p>

        <div className="flex items-center gap-4">
          <span className="block w-12 h-px bg-red-600" />
          <p className="font-mono text-[12px] tracking-[0.25em] uppercase text-red-500">{pairs.length} matchups</p>
          <span className="block w-12 h-px bg-red-600" />
        </div>

        <motion.p
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="font-mono text-[11px] tracking-[0.25em] uppercase text-muted-dark mt-6 group-hover:text-primary-dark transition-colors"
        >
          Click anywhere to begin
        </motion.p>
      </button>
    )
  }

  if (phase === 'done') {
    return (
      <div className="h-screen w-screen overflow-hidden bg-bg-dark flex flex-col items-center justify-center px-12">
        <p className="font-mono text-[13px] tracking-[0.3em] uppercase text-primary-dark mb-10">
          This week&rsquo;s 1-2-1s
        </p>

        <div className="flex flex-col gap-y-4 max-w-275 w-full">
          {pairs.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="grid grid-cols-[1fr_72px_1fr] items-center border-b border-border-dark pb-3.5"
            >
              <span className="font-sora font-bold text-[28px] text-white truncate">{p.requester.name}</span>
              <span className="font-mono text-[13px] tracking-widest text-red-500 text-center">VS</span>
              <span className="font-sora font-bold text-[28px] text-white truncate text-right">{p.recipient.name}</span>
            </motion.div>
          ))}
        </div>

        <p className="font-mono text-[12px] tracking-[0.2em] uppercase text-muted-dark mt-12">
          Emails sent &middot; check your inbox
        </p>
      </div>
    )
  }

  const pair = pairs[index]

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0f1a] relative">
      <p className="absolute top-8 inset-x-0 text-center z-10 font-mono text-[11px] tracking-[0.3em] uppercase text-muted-dark">
        1-2-1 matchups
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={pair.id}
          className="absolute inset-0"
          animate={{ x: [0, -8, 7, -3, 0], y: [0, 3, -3, 1, 0] }}
          transition={{ duration: 0.32, delay: 0.3 }}
        >
          <Side member={pair.requester} side="left" />
          <Side member={pair.recipient} side="right" />
          <motion.div
            initial={{ scale: 2.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.26, delay: 0.3, ease: [0.16, 1.6, 0.3, 1] }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-red-700 px-7 py-2"
          >
            <span className="font-sora font-black text-[64px] text-white leading-none tracking-wide">VS</span>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <p className="absolute bottom-8 inset-x-0 text-center z-10 font-mono text-[11px] tracking-[0.2em] text-muted-dark">
        match {index + 1} of {pairs.length}
      </p>

      {isSuperUser && (
        <button
          onClick={finish}
          className="absolute bottom-6 right-6 z-30 h-8 px-4 border border-border-dark text-muted-dark font-mono text-[9px] tracking-[0.15em] uppercase hover:border-primary-dark hover:text-primary-dark transition-colors"
        >
          Skip
        </button>
      )}
    </div>
  )
}
