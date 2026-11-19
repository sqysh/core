'use client'

import { useState } from 'react'
import { AttendanceCorrectionModal } from '@/components/member/attendance/AttendanceCorrectionModal'
import { useCheckInTime } from './_hooks/useCheckInTime'
import { useCountUp } from './_hooks/useCountUp'
import { useIntro } from './_hooks/useIntro'
import { useRoundSendOff } from './_hooks/useRoundSendOff'
import { useSqyshAct } from './_hooks/useSqyshAct'
import { useSqyshStage } from './_hooks/useSqyshStage'
import { useWakeLock } from './_hooks/useWakeLock'
import { AttendanceRing } from './_components/AttendanceRing'
import { MemberPanel } from './_components/MemberPanel'
import { RolePanel } from './_components/RolePanel'
import { SpeechBubbles } from './_components/SpeechBubbles'
import { SqyshActor } from './_components/SqyshActor'
import { TourBubble } from './_components/TourBubble'
import { UpdatesPanel } from './_components/UpdatesPanel'
import { LIFT, delay } from './_lib/motion'
import { ROLE_UI, exitFor, resolveRole } from './_lib/roles'
import { EXPLAIN, KEY_VARS, SCRIPT, stateKeyFor } from './_lib/script'
import type { CheckInClientProps, MissedMeeting } from './_lib/types'

export type { MissedMeeting, SqyshUpdate } from './_lib/types'

export default function CheckInClient({
  result,
  userName,
  attendance,
  presenterName,
  missed,
  updates = [],
  week = null,
  isGuidingLight = false,
  isHost = false,
  isTreasurer = false,
  previewOpen = false,
  isSuper = false
}: CheckInClientProps) {
  const firstName = userName.split(' ')[0]
  const [fixing, setFixing] = useState<MissedMeeting | null>(null)

  const stateKey = stateKeyFor(result)
  const script = SCRIPT[stateKey]
  const S = script.settle
  const checkedIn = stateKey === 'ok' || stateKey === 'again'
  const pct = attendance.total > 0 ? Math.round((attendance.attended / attendance.total) * 100) : 0

  const role = resolveRole({ isSuper, isHost, isTreasurer, isGuidingLight }, checkedIn)
  const roleUi = role ? ROLE_UI[role] : null
  const exit = exitFor({ isSuper, isHost, isTreasurer })

  const stage = useSqyshStage()
  const { mode, setMode, reduce } = useSqyshAct(script)
  const sendOff = useRoundSendOff({
    active: role === 'gl',
    previewOpen,
    settle: S,
    setSpot: stage.setSpot,
    setMode,
    jumpToCorner: stage.jumpToCorner
  })
  useWakeLock(role === 'gl')

  // Only after a real check-in, only when there's something to show, never for someone with a job today
  const hasTour = updates.length > 0 && checkedIn && !role
  const [tour, setTour] = useIntro({
    hasTour,
    settle: S,
    setSpot: stage.setSpot,
    setMode,
    jumpToCorner: stage.jumpToCorner
  })

  const numRef = useCountUp(pct, S)
  const stamp = useCheckInTime()

  const subText = script.clock ? `${script.sub}${stamp}` : script.sub || (result.error ?? 'Please try again.')
  const bubbles = checkedIn ? [...script.bubbles, roleUi?.explain ?? EXPLAIN] : script.bubbles

  return (
    <div
      className={`ci-scene fixed inset-0 flex flex-col overflow-hidden bg-[#09090f] text-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${
        roleUi?.key ?? KEY_VARS[stateKey]
      }`}
    >
      <div className="ci-grain pointer-events-none absolute inset-0 opacity-5 mix-blend-overlay" aria-hidden="true" />

      <p
        className={`relative z-4 shrink-0 px-4 pt-7 text-center font-mono text-[10px] tracking-[0.22em] uppercase text-white/35 opacity-0 animate-[ciFade_0.9s_ease_0.4s_forwards] transition-opacity duration-300 ${
          tour === 'hidden' ? '' : 'opacity-0!'
        }`}
      >
        Coastal Referral Exchange
      </p>

      {/* Stage: takes whatever height is left and centres the badge in it */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
        <div
          ref={stage.riserRef}
          className="relative translate-y-22 animate-[ciUp_0.85s_cubic-bezier(0.65,0,0.35,1)_forwards]"
          style={delay(S)}
        >
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2"
            aria-hidden="true"
          >
            <div className="h-full w-full rounded-full bg-[radial-gradient(circle,var(--key-soft)_0%,transparent_62%)] opacity-0 animate-[ciHalo_5.4s_ease_forwards]" />
          </div>

          <SpeechBubbles
            bubbles={bubbles}
            firstName={firstName}
            settle={S}
            reduce={reduce.current}
            sendOff={sendOff}
          />
          <AttendanceRing pct={pct} settle={S} numRef={numRef} />
          {stage.sq && (
            <SqyshActor sq={stage.sq} spot={stage.spot} corner={stage.corner} mode={mode} reduce={reduce.current} />
          )}
        </div>
      </div>

      {/* Resting content */}
      <div className="relative z-4 mx-auto w-full max-w-105 shrink-0 pb-6.5 pl-[max(24px,env(safe-area-inset-left))] pr-[max(24px,env(safe-area-inset-right))] text-center">
        <h1 className="m-0 font-sora text-[26px] font-black leading-[1.04] tracking-[-0.04em] text-balance xs:text-[30px]">
          <span className="block overflow-hidden pb-[0.09em]">
            <em
              className="block translate-y-[112%] not-italic animate-[ciReveal_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]"
              style={delay(S + 1.25)}
            >
              {roleUi?.headline ?? script.headline}
            </em>
          </span>
        </h1>

        <p
          className={`mt-3 font-mono text-[11px] tracking-widest tabular-nums text-white/55 opacity-0 ${LIFT}`}
          style={delay(S + 1.65)}
        >
          {subText}
        </p>

        {role ? (
          <RolePanel role={role} settle={S} sendOff={sendOff} />
        ) : (
          <MemberPanel
            settle={S}
            presenterName={presenterName}
            week={week}
            missed={missed}
            exit={exit}
            onFix={setFixing}
          />
        )}
      </div>

      {/* Top bar: Sqysh lands at the right edge, the bubble gets everything to his left */}
      <div
        ref={stage.slotRef}
        className="pointer-events-none absolute left-4 z-6 right-[calc(1rem+64px+12px)] top-[calc(env(safe-area-inset-top)+16px)] xs:right-[calc(1rem+72px+12px)]"
      >
        {tour === 'ask' && (
          <TourBubble reduce={reduce.current} onShow={() => setTour('open')} onDismiss={() => setTour('dismissed')} />
        )}
      </div>
      {tour === 'open' && <UpdatesPanel updates={updates} onClose={() => setTour('dismissed')} />}

      <AttendanceCorrectionModal
        open={fixing !== null}
        onClose={() => setFixing(null)}
        date={fixing?.date ?? ''}
        meetingId={fixing?.meetingId ?? ''}
      />
    </div>
  )
}
