'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getPusherClient } from '@/lib/pusher/pusherClient'
import { getInitials } from '@/lib/utils/shared.utils'
import SpotlightModal from './_components/SpotlightModal'
import { Member, Phase, Winner } from '../_types/guiding-light.types'
import MemberOrb from './_components/MemberOrb'
import { resetGuidingLight } from '@/lib/actions/guiding-light/resetGuidingLight'
import Link from 'next/link'
import { selectGuidingLightWinner } from '@/lib/actions/guiding-light/selectGuidingLightWinner'
import ManualPickerOverlay from './_components/ManualPickerOverlay'
import { notifyJudge } from '@/lib/actions/guiding-light/notifyJudge'
import { changeJudge } from '@/lib/actions/guiding-light/changeJudge'
import { useRouter } from 'next/navigation'
import NewJudgeModal from './_components/NewJudgeModal'
import { refireReveal } from '@/lib/actions/guiding-light/refireReveal'

interface Props {
  members: Member[]
  isSuperUser: boolean
  openRoundId: string | null
  judgeName: string | null
}

export default function StageClient({ members, isSuperUser, openRoundId, judgeName }: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [winner, setWinner] = useState<Member | null>(null)
  const [judgedByName, setJudgedByName] = useState<string | null>(judgeName)
  const [spotlightMember, setSpotlightMember] = useState<Member | null>(null)
  const [radius, setRadius] = useState(280)
  const [showManualPicker, setShowManualPicker] = useState(false)
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [showJudgePicker, setShowJudgePicker] = useState(false)
  const [changingJudge, setChangingJudge] = useState(false)
  const [newJudge, setNewJudge] = useState<{ name: string; company: string; profileImage: string | null } | null>(null)
  const [refiring, setRefiring] = useState(false)

  useEffect(() => {
    function update() {
      setRadius(Math.min(window.innerWidth, window.innerHeight) * 0.32)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const animationFrameRef = useRef<number | null>(null)
  const randomParamsRef = useRef<{
    totalDuration: number
    rotations: number
    easePower: number
    startPosition: number
  }>({ totalDuration: 0, rotations: 0, easePower: 0, startPosition: 0 })

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  const startSpin = useCallback(
    (winnerData: Winner) => {
      setPhase('spinning')
      setWinner(null)

      const winnerIndex = members.findIndex((m) => m.id === winnerData.id)
      const startPosition = Math.floor(Math.random() * members.length)

      // Calculate how many steps needed to land exactly on winnerIndex
      const baseRotations = 4.5 + Math.random() * 2
      const totalBaseSteps = Math.floor(baseRotations * members.length)
      const naturalEnd = (startPosition + totalBaseSteps) % members.length

      // Add extra steps to reach winner from naturalEnd
      const stepsToWinner = (winnerIndex - naturalEnd + members.length) % members.length
      const exactTotalSteps = totalBaseSteps + stepsToWinner

      randomParamsRef.current = {
        totalDuration: 6000 + Math.random() * 2000,
        rotations: exactTotalSteps / members.length,
        easePower: 2 + Math.random() * 1.5,
        startPosition
      }

      setActiveIndex(startPosition)

      const animate = (timestamp: number) => {
        animationFrameRef.current = requestAnimationFrame(animate)
        if (!(animate as any).startTime) (animate as any).startTime = timestamp

        const progress = timestamp - (animate as any).startTime
        const { totalDuration, rotations, easePower, startPosition } = randomParamsRef.current

        if (progress >= totalDuration) {
          cancelAnimationFrame(animationFrameRef.current!)
          setActiveIndex(winnerIndex)
          setTimeout(() => {
            setWinner(winnerData as Member)
            setPhase('revealed')
          }, 400)
          return
        }

        const easedProgress = 1 - Math.pow(1 - progress / totalDuration, easePower)
        const newIndex = (startPosition + Math.floor(easedProgress * members.length * rotations)) % members.length

        // Only update if index actually changed — don't thrash state every frame
        setActiveIndex((prev) => (prev !== newIndex ? newIndex : prev))
      }

      requestAnimationFrame(animate)
    },
    [members]
  )

  useEffect(() => {
    const pusher = getPusherClient()
    const channel = pusher.subscribe('guiding-light')

    channel.bind('winner-selected', (data: { winner: Winner; judgedBy: { name: string } | null }) => {
      setJudgedByName(data.judgedBy?.name ?? null)
      startSpin(data.winner)
    })

    return () => {
      channel.unbind_all()
    }
  }, [startSpin])

  useEffect(() => {
    setJudgedByName(judgeName)
  }, [judgeName])

  async function handleReset() {
    if (!openRoundId) return
    setResetting(true)
    await resetGuidingLight(openRoundId)
    setResetting(false)
    setPhase('idle')
    setActiveIndex(null)
    setWinner(null)
    setJudgedByName(null)
  }

  async function handleManualSelect(memberId: string) {
    if (!openRoundId) return
    setManualSubmitting(true)
    await selectGuidingLightWinner(openRoundId, memberId)
    setManualSubmitting(false)
    setShowManualPicker(false)
  }

  async function handleNotifyJudge() {
    setNotifying(true)
    await notifyJudge()
    setNotifying(false)
  }

  async function handleChangeJudge(memberId: string) {
    if (!openRoundId) return
    setChangingJudge(true)
    const res = await changeJudge(openRoundId, memberId)
    setChangingJudge(false)
    setShowJudgePicker(false)

    if (res.success && res.data) {
      setNewJudge(res.data)
      setTimeout(() => setNewJudge(null), 3000)
    }

    router.refresh()
  }

  async function handleRefireReveal() {
    setRefiring(true)
    await refireReveal()
    setRefiring(false)
  }

  return (
    <>
      <SpotlightModal setSpotlightMember={setSpotlightMember} spotlightMember={spotlightMember} />

      <NewJudgeModal newJudge={newJudge} />

      <ManualPickerOverlay
        title="Manual Select"
        onSelect={handleManualSelect}
        submitting={manualSubmitting}
        members={members}
        onClose={() => setShowManualPicker(false)}
        show={showManualPicker}
      />

      <ManualPickerOverlay
        title="Change Judge"
        onSelect={handleChangeJudge}
        submitting={changingJudge}
        members={members}
        onClose={() => setShowJudgePicker(false)}
        show={showJudgePicker}
      />

      <div className="absolute top-6 left-6 gap-2 z-100">
        <Link
          href="/"
          className="flex items-center justify-center text-muted-dark font-mono text-[9px] tracking-[0.15em] uppercase hover:border-red-500/50 hover:text-red-400 transition-colors disabled:opacity-30"
        >
          Home
        </Link>
      </div>

      {isSuperUser && (
        <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 z-20">
          <button
            onClick={() => setShowJudgePicker(true)}
            disabled={!openRoundId}
            className="h-8 px-4 border border-border-dark text-muted-dark font-mono text-[9px] tracking-[0.15em] uppercase hover:border-cyan-500/50 hover:text-cyan-400 transition-colors disabled:opacity-30"
          >
            Change Judge
          </button>
          <button
            onClick={handleNotifyJudge}
            disabled={notifying || !openRoundId}
            className="h-8 px-4 border border-border-dark text-muted-dark font-mono text-[9px] tracking-[0.15em] uppercase hover:border-amber-500/50 hover:text-amber-400 transition-colors disabled:opacity-30"
          >
            {notifying ? 'Sending…' : 'Notify Judge'}
          </button>
          <button
            onClick={() => setShowManualPicker(true)}
            disabled={!openRoundId}
            className="h-8 px-4 border border-border-dark text-muted-dark font-mono text-[9px] tracking-[0.15em] uppercase hover:border-primary-dark/50 hover:text-primary-dark transition-colors disabled:opacity-30"
          >
            Manual Select
          </button>
          <button
            onClick={handleRefireReveal}
            disabled={refiring}
            className="h-8 px-4 border border-border-dark text-muted-dark font-mono text-[9px] tracking-[0.15em] uppercase hover:border-emerald-500/50 hover:text-emerald-400 transition-colors disabled:opacity-30"
          >
            {refiring ? 'Firing…' : 'Re-fire Reveal'}
          </button>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="h-8 px-4 border border-border-dark text-muted-dark font-mono text-[9px] tracking-[0.15em] uppercase hover:border-red-500/50 hover:text-red-400 transition-colors disabled:opacity-30"
          >
            {resetting ? 'Resetting…' : 'Reset'}
          </button>
        </div>
      )}

      <div className="h-screen w-screen overflow-hidden bg-bg-dark flex flex-col items-center justify-center relative">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-20 transition-all duration-1000"
            style={{
              background:
                phase === 'revealed'
                  ? 'radial-gradient(ellipse at center, #fbbf24 0%, transparent 60%)'
                  : phase === 'spinning'
                    ? 'radial-gradient(ellipse at center, #38bdf8 0%, transparent 60%)'
                    : 'none'
            }}
          />
        </div>

        {/* Top label */}
        <div className="absolute bottom-8 left-8 flex flex-col items-center gap-2 z-10">
          <div className="flex items-center gap-3">
            <span className="block w-8 h-px bg-primary-dark" aria-hidden="true" />
            <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-primary-dark">
              Coastal Referral Exchange · Guiding Light
            </p>
            <span className="block w-8 h-px bg-primary-dark" aria-hidden="true" />
          </div>
          {judgedByName && phase !== 'idle' && (
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-dark">
              Selected by {judgedByName}
            </p>
          )}
        </div>

        {/* Circle of members */}
        <div className="relative" style={{ width: radius * 2 + radius * 0.4, height: radius * 2 + radius * 0.4 }}>
          {members.map((member, i) => (
            <MemberOrb
              key={i}
              activeIndex={activeIndex}
              index={i}
              member={member}
              members={members}
              phase={phase}
              radius={radius}
              setSpotlightMember={setSpotlightMember}
              winner={winner}
            />
          ))}

          {/* Center — idle or winner reveal */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
            <AnimatePresence mode="wait">
              {phase === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3"
                >
                  <p className="font-sora font-black text-[32px] text-white/20 leading-none tracking-tight text-center">
                    60 Seconds
                  </p>
                  <motion.p
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-dark text-center"
                  >
                    {judgedByName
                      ? `${judgedByName.split(' ')[0]} will select when everyone has presented`
                      : 'Judge will select when everyone has presented'}
                  </motion.p>
                  {process.env.NODE_ENV === 'development' && (
                    <button
                      onClick={() => startSpin(members[Math.floor(Math.random() * members.length)])}
                      className="mt-2 h-8 px-4 border border-border-dark text-muted-dark font-mono text-[9px] tracking-[0.15em] uppercase hover:border-primary-dark hover:text-primary-dark transition-colors"
                    >
                      Test
                    </button>
                  )}
                </motion.div>
              )}

              {phase === 'spinning' && (
                <motion.div
                  key="spinning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-2"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 rounded-full border-2 border-primary-dark border-t-transparent"
                  />
                  <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-dark">Selecting…</p>
                </motion.div>
              )}

              {phase === 'revealed' && winner && (
                <motion.div
                  key="revealed"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
                  className="flex flex-col items-center gap-3 text-center"
                >
                  {/* Profile image */}
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 18 }}
                    className="relative w-60 h-60 rounded-full overflow-hidden border-4 border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.6)]"
                  >
                    {winner.profileImage ? (
                      <img src={winner.profileImage} alt={winner.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-amber-400/10 flex items-center justify-center">
                        <span className="font-sora font-black text-4xl text-amber-400">{getInitials(winner.name)}</span>
                      </div>
                    )}
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="font-sora font-black text-[28px] text-amber-400 leading-none tracking-tight"
                  >
                    {winner.name}
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="font-sora font-semibold text-[14px] text-amber-200/60"
                  >
                    {winner.company}
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-center gap-2 mt-1"
                  >
                    <span className="block w-8 h-px bg-amber-400/40" />
                    <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-amber-400/60">
                      This Week's Guiding Light
                    </p>
                    <span className="block w-8 h-px bg-amber-400/40" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  )
}
