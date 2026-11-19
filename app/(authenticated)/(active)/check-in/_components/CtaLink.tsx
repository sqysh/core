import Link from 'next/link'
import { LIFT, delay } from '../_lib/motion'

const ARROW = 'relative animate-[ciNudge_1.9s_ease-in-out_infinite]'
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'

interface CtaLinkProps {
  href: string
  label: string
  variant?: 'primary' | 'secondary'
  /** Secondary only: seconds in when the button lifts into view */
  at?: number
}

// The full-width button at the bottom of the screen. Primary is the role's call to action;
// secondary is the quieter way out that fades in last.
export function CtaLink({ href, label, variant = 'primary', at = 0 }: CtaLinkProps) {
  if (variant === 'primary') {
    return (
      <Link
        href={href}
        className={`relative mt-4 flex h-13 w-full items-center justify-center gap-2 overflow-hidden bg-(--key) font-sora text-[15px] font-black text-[#09090f] no-underline ${FOCUS}`}
      >
        <span
          className="absolute inset-y-0 left-[-45%] w-[36%] -skew-x-12 bg-linear-to-r from-transparent via-white/25 to-transparent animate-[ciSweep_5.5s_ease-in-out_infinite]"
          aria-hidden="true"
        />
        <span className="relative">{label}</span>
        <span className={ARROW} aria-hidden="true">
          →
        </span>
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className={`relative mt-5 flex h-13 w-full items-center justify-center gap-2 overflow-hidden border border-white/20 bg-white/6 font-sora text-[14.5px] font-bold text-white no-underline opacity-0 ${LIFT} ${FOCUS}`}
      style={delay(at)}
    >
      <span
        className="absolute inset-y-0 left-[-45%] w-[36%] -skew-x-12 bg-linear-to-r from-transparent via-white/15 to-transparent animate-[ciSweep_5.5s_ease-in-out_infinite]"
        style={delay(at + 1.05)}
        aria-hidden="true"
      />
      <span className="relative">{label}</span>
      <span className={`${ARROW} text-(--key)`} style={delay(at + 0.9)} aria-hidden="true">
        →
      </span>
    </Link>
  )
}
