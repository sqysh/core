'use client'

import { useState } from 'react'
import { resetGuidingLight } from '@/lib/actions/guiding-light/resetGuidingLight'
import { selectGuidingLightWinner } from '@/lib/actions/guiding-light/selectGuidingLightWinner'
import { notifyJudge } from '@/lib/actions/guiding-light/notifyJudge'
import { changeJudge } from '@/lib/actions/guiding-light/changeJudge'
import { refireReveal } from '@/lib/actions/guiding-light/refireReveal'
import { Member } from '@/types/guiding-light.types'
import NewJudgeModal from './NewJudgeModal'
import ManualPickerOverlay from '@/components/_shared/ManualPickerOverlay'

export function GuidingLightControls({ members, openRoundId }: { members: Member[]; openRoundId: string | null }) {
  const [showManualPicker, setShowManualPicker] = useState(false)
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [showJudgePicker, setShowJudgePicker] = useState(false)
  const [changingJudge, setChangingJudge] = useState(false)
  const [newJudge, setNewJudge] = useState<{ name: string; company: string; profileImage: string | null } | null>(null)
  const [refiring, setRefiring] = useState(false)

  async function handleReset() {
    if (!openRoundId) return
    setResetting(true)
    await resetGuidingLight(openRoundId)
    setResetting(false)
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
  }
  async function handleRefireReveal() {
    setRefiring(true)
    await refireReveal()
    setRefiring(false)
  }

  const btn =
    'flex h-12 items-center justify-center border font-mono text-[10px] tracking-[0.15em] uppercase transition-colors active:translate-y-px disabled:opacity-30'

  return (
    <div className="border border-cyan-500/15 bg-white/2 p-3">
      <p className="mb-2.5 font-mono text-[9px] tracking-[0.3em] text-cyan-400/70 uppercase">Guiding Light ops</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShowJudgePicker(true)}
          disabled={!openRoundId}
          className={`${btn} border-cyan-500/30 text-cyan-300 active:bg-cyan-400/10`}
        >
          Change judge
        </button>
        <button
          type="button"
          onClick={handleNotifyJudge}
          disabled={notifying || !openRoundId}
          className={`${btn} border-amber-400/30 text-amber-300 active:bg-amber-400/10`}
        >
          {notifying ? 'Sending…' : 'Notify judge'}
        </button>
        <button
          type="button"
          onClick={() => setShowManualPicker(true)}
          disabled={!openRoundId}
          className={`${btn} border-cyan-500/30 text-cyan-300 active:bg-cyan-400/10`}
        >
          Manual select
        </button>
        <button
          type="button"
          onClick={handleRefireReveal}
          disabled={refiring}
          className={`${btn} border-emerald-400/30 text-emerald-300 active:bg-emerald-400/10`}
        >
          {refiring ? 'Firing…' : 'Re-fire reveal'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={resetting || !openRoundId}
          className={`${btn} col-span-2 border-red-500/30 text-red-400 active:bg-red-500/10`}
        >
          {resetting ? 'Resetting…' : 'Reset round'}
        </button>
      </div>

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
    </div>
  )
}
