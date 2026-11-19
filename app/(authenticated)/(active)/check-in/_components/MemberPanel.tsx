import Link from 'next/link'
import { LIFT, delay, shortDate } from '@/app/(authenticated)/(active)/check-in/_lib/motion'
import type { MissedMeeting } from '@/app/(authenticated)/(active)/check-in/_lib/types'
import { CtaLink } from './CtaLink'

// Routes for logging each one; point at your existing forms
const WEEK_ROWS = [
  { key: 'f2f', label: '1-2-1s', href: '/face-to-face/new' },
  { key: 'referrals', label: 'Referrals', href: '/referrals/new' },
  { key: 'tyfcb', label: 'Closed', href: '/thank-you/new' }
] as const

type Week = { f2f: number; referrals: number; tyfcb: number }

const SECTION = `border-t border-white/10 pt-4 opacity-0 ${LIFT}`
const EYEBROW = 'm-0 font-mono text-[10px] tracking-[0.18em] uppercase text-white/45'

function WeekTally({ week, settle }: { week: Week; settle: number }) {
  const total = week.f2f + week.referrals + week.tyfcb

  return (
    <div className={`mt-5 ${SECTION}`} style={delay(settle + 1.9)}>
      <p className={EYEBROW}>Your week · {total === 0 ? 'nothing logged yet' : 'logged so far'}</p>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {WEEK_ROWS.map((r) => {
          const n = week[r.key]
          return (
            <Link
              key={r.key}
              href={r.href}
              className={`flex h-16 flex-col items-center justify-center no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                n > 0
                  ? 'border border-white/15 bg-white/4 text-white'
                  : 'border border-dashed border-(--key)/60 text-(--key) hover:bg-white/4'
              }`}
            >
              <span className="font-sora text-[20px] font-black leading-none tabular-nums">{n > 0 ? n : '+'}</span>
              <span className="mt-1 font-mono text-[9px] tracking-[0.14em] uppercase opacity-80">{r.label}</span>
            </Link>
          )
        })}
      </div>
      <p className="mt-2 m-0 font-nunito text-[12px] text-white/45">
        Tap a dashed one to log it before the Activity Round, or skip it.
      </p>
    </div>
  )
}

function MissedList({
  missed,
  settle,
  onFix
}: {
  missed: MissedMeeting[]
  settle: number
  onFix: (m: MissedMeeting) => void
}) {
  return (
    <div className={`mt-5 ${SECTION}`} style={delay(settle + 1.95)}>
      <p className={EYEBROW}>
        {missed.length === 1 ? 'Missed Thursday' : 'Missed Thursdays'} · tap to reinstate
      </p>
      <div className="mt-2.5 flex justify-center gap-2">
        {missed.map((m) => (
          <button
            key={m.meetingId}
            type="button"
            onClick={() => onFix(m)}
            className="flex h-11 min-w-0 flex-1 basis-0 items-center justify-center border border-dashed border-white/30 bg-white/4 px-2 font-sora text-[13px] font-semibold tabular-nums text-white/85 transition-colors hover:border-(--key) hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 xs:text-[14px]"
          >
            {shortDate(m.date)}
          </button>
        ))}
      </div>
    </div>
  )
}

interface MemberPanelProps {
  settle: number
  presenterName: string | null
  week: Week | null
  missed: MissedMeeting[]
  exit: { href: string; label: string }
  onFix: (m: MissedMeeting) => void
}

// What everyone without a job today sees under the ring
export function MemberPanel({ settle, presenterName, week, missed, exit, onFix }: MemberPanelProps) {
  return (
    <>
      {presenterName && (
        <dl
          className={`mt-6 flex w-full flex-col items-center gap-1.25 border-t border-white/10 pt-4 opacity-0 ${LIFT}`}
          style={delay(settle + 1.85)}
        >
          <dt className={EYEBROW}>Presenting today</dt>
          <dd className="m-0 font-sora text-[15px] font-semibold tracking-[-0.01em]">{presenterName}</dd>
        </dl>
      )}

      {week && <WeekTally week={week} settle={settle} />}
      {missed.length > 0 && <MissedList missed={missed} settle={settle} onFix={onFix} />}

      <CtaLink href={exit.href} label={exit.label} variant="secondary" at={settle + 2.05} />
    </>
  )
}
