import type { Bubble } from './script'

export const JUDGE_HREF = '/stage/guiding-light/judge'
export const REMOTE_HREF = '/stage/remote'
export const SUPER_HREF = '/stage/super'
export const TREASURER_HREF = '/treasurer'

export type Role = 'super' | 'host' | 'treasurer' | 'gl'

interface RoleFlags {
  isSuper: boolean
  isHost: boolean
  isTreasurer: boolean
  isGuidingLight: boolean
}

// A member with several jobs gets the biggest one: super, then host, then treasurer, then judge.
// Only after a real check-in; a failed one falls back to the plain screen.
export function resolveRole(flags: RoleFlags, checkedIn: boolean): Role | null {
  if (!checkedIn) return null
  if (flags.isSuper) return 'super'
  if (flags.isHost) return 'host'
  if (flags.isTreasurer) return 'treasurer'
  if (flags.isGuidingLight) return 'gl'
  return null
}

// Where the bottom button leads when the screen has no role panel of its own
export function exitFor({ isSuper, isHost, isTreasurer }: Omit<RoleFlags, 'isGuidingLight'>) {
  if (isSuper) return { href: SUPER_HREF, label: 'Open the command deck' }
  if (isHost) return { href: REMOTE_HREF, label: 'Open the host remote' }
  if (isTreasurer) return { href: TREASURER_HREF, label: 'Open the treasurer page' }
  return { href: '/dashboard', label: 'Go to dashboard' }
}

const explain = (text: string, until = 7.6): Bubble => ({ at: 1.0, until, parked: true, text: () => text })

// Full literal strings so Tailwind can see them at build time.
export const ROLE_UI: Record<Role, { key: string; explain: Bubble; headline: string }> = {
  super: {
    key: '[--key:#22d3ee] [--key-soft:rgba(34,211,238,0.3)]',
    explain: explain('Command deck is ready. Open it when you want to run the room.'),
    headline: 'Command deck.'
  },
  host: {
    key: '[--key:#60a5fa] [--key-soft:rgba(96,165,250,0.3)]',
    explain: explain('And you’re hosting today. Open the remote when you’re ready and I’ll walk you through it.'),
    headline: 'You’re hosting today.'
  },
  treasurer: {
    key: '[--key:#818cf8] [--key-soft:rgba(129,140,248,0.3)]',
    explain: explain(
      'And you’ve got the Treasurer’s report. Open your screen now and keep it up, I’ll cue you when it’s your turn.'
    ),
    headline: 'You’ve got the report.'
  },
  gl: {
    key: '[--key:#f5c542] [--key-soft:rgba(245,197,66,0.3)]',
    explain: explain('And you’re the Guiding Light today. Keep this screen open, I’ll bring the shortlist up myself.'),
    headline: 'You’re the Guiding Light.'
  }
}
