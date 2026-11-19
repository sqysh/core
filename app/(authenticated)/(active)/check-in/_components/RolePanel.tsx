import { LIFT, delay } from '@/app/(authenticated)/(active)/check-in/_lib/motion'
import { REMOTE_HREF, SUPER_HREF, TREASURER_HREF, type Role } from '@/app/(authenticated)/(active)/check-in/_lib/roles'
import { CtaLink } from './CtaLink'

interface RoleContent {
  eyebrow: string
  title: string
  body: string
  cta?: { href: string; label: string }
}

const CONTENT: Record<Role, RoleContent> = {
  super: {
    eyebrow: 'Command deck · online',
    title: 'You have full control.',
    body: 'Every screen, the teleprompter, the poll and the guiding light, all from your phone. Jump the TV anywhere, anytime.',
    cta: { href: SUPER_HREF, label: 'Open the command deck' }
  },
  host: {
    eyebrow: 'Host · today',
    title: 'You’re running the meeting.',
    body: 'The remote walks you through every step, from the opening script to the closing quotes. Open it when you’re ready.',
    cta: { href: REMOTE_HREF, label: 'Open the host remote' }
  },
  treasurer: {
    eyebrow: 'Treasurer · today',
    title: 'You’re giving the Treasurer’s report.',
    body: 'Open your treasurer screen now and keep it up. Type in the bank balance and anything the chapter owes. When it’s your turn, your numbers go on the TV.',
    cta: { href: TREASURER_HREF, label: 'Open the treasurer screen' }
  },
  gl: {
    eyebrow: 'Guiding Light · today',
    title: 'Keep this screen open. Don’t lock your phone.',
    body: 'Do your 60 seconds, sit down, and look here. When the round opens, the shortlist appears on its own. Sqysh handles the rest.'
  }
}

interface RolePanelProps {
  role: Role
  settle: number
  /** The judge's round has opened and Sqysh is sending them to the shortlist */
  sendOff: boolean
}

export function RolePanel({ role, settle, sendOff }: RolePanelProps) {
  const { eyebrow, title, body, cta } = CONTENT[role]

  return (
    <div className={`mt-6 border-t border-white/10 pt-4 opacity-0 ${LIFT}`} style={delay(settle + 1.85)}>
      <p className="m-0 font-mono text-[10px] tracking-[0.18em] uppercase text-(--key)">{eyebrow}</p>
      <p className="mt-2 font-sora text-[17px] font-bold leading-snug tracking-[-0.02em] text-balance xs:text-[18px]">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-[36ch] font-nunito text-[14px] leading-relaxed text-white/70">{body}</p>

      {cta ? (
        <CtaLink href={cta.href} label={cta.label} />
      ) : (
        <p
          className="mt-4 inline-flex items-center gap-2 border border-(--key)/30 bg-(--key)/8 px-3 py-2 font-mono text-[11px] tracking-[0.12em] uppercase text-(--key)"
          role="status"
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--key) opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-(--key)" />
          </span>
          {sendOff ? 'Round open' : 'Waiting for the round to open'}
        </p>
      )}
    </div>
  )
}
