import type { RefObject } from 'react'
import Link from 'next/link'
import { delay } from '../_lib/motion'

interface AttendanceRingProps {
  pct: number
  settle: number
  numRef: RefObject<HTMLElement | null>
}

export function AttendanceRing({ pct, settle: S, numRef }: AttendanceRingProps) {
  return (
    <Link
      href="/attendance/history"
      className="group relative block h-52 w-52 text-inherit no-underline xs:h-58 xs:w-58 sm:h-64 sm:w-64 focus-visible:outline-none"
      aria-label={`View your full attendance, ${pct} percent`}
    >
      <span
        className="ci-sheen absolute inset-2.5 rounded-full opacity-0 animate-[ciFade_0.9s_ease_forwards,ciSpin_4.2s_linear_infinite]"
        style={delay(S + 1.75, S + 1.75)}
        aria-hidden="true"
      />

      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 168 168" aria-hidden="true">
        <circle
          className="fill-(--key) opacity-0 transition-opacity duration-200 group-hover:opacity-12 group-focus-visible:opacity-12 group-active:opacity-18"
          cx="84"
          cy="84"
          r="72"
        />
        <circle
          className="fill-none stroke-white/20 stroke-[2.6] [stroke-dasharray:1] [stroke-dashoffset:1] animate-[ciDraw_0.9s_cubic-bezier(0.65,0,0.35,1)_forwards]"
          style={delay(S + 0.25)}
          cx="84"
          cy="84"
          r="72"
          pathLength="1"
          transform="rotate(-90 84 84)"
        />
        <circle
          className="fill-none stroke-(--key) stroke-[4.5] [stroke-linecap:round] [stroke-dasharray:1] [stroke-dashoffset:1] animate-[ciArc_1s_cubic-bezier(0.65,0,0.35,1)_forwards]"
          style={delay(S + 0.75)}
          cx="84"
          cy="84"
          r="72"
          pathLength="1"
          transform="rotate(-90 84 84)"
        />
      </svg>

      <div
        className="absolute inset-0 flex flex-col items-center justify-center opacity-0 animate-[ciLift_0.6s_ease_forwards]"
        style={delay(S + 0.8)}
      >
        <span
          className="flex flex-col items-center animate-[ciPctMake_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards]"
          style={delay(S + 2.15)}
        >
          <b
            ref={numRef}
            className="font-sora text-[50px] font-extrabold leading-none tracking-[-0.04em] tabular-nums xs:text-[56px] sm:text-[60px]"
          >
            0%
          </b>
          <i className="mt-2 font-mono text-[11px] not-italic tracking-[0.2em] uppercase text-white/55 xs:text-[12px]">
            Attendance
          </i>
        </span>
        <u
          className="mt-0 max-h-0 overflow-hidden text-center font-mono text-[11px] leading-[1.4] tracking-[0.16em] uppercase text-(--key) xs:text-[12px] no-underline opacity-0 animate-[ciViewAll_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards]"
          style={delay(S + 2.15)}
        >
          View all →
        </u>
      </div>
    </Link>
  )
}
