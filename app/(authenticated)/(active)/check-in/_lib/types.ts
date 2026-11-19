import type { SqyshMode } from '@/components/_shared/SqyshVector'

export interface SqyshUpdate {
  title: string
  detail?: string
}

export interface MissedMeeting {
  meetingId: string
  date: string // YYYY-MM-DD
}

export interface CheckInResult {
  success: boolean
  alreadyCheckedIn?: boolean
  error?: string
}

export type StateKey = 'ok' | 'again' | 'window' | 'fail'

export type Spot = 'below' | 'centre' | 'park' | 'corner' | 'hover'

export type TourState = 'hidden' | 'ask' | 'open' | 'dismissed'

export type Corner = { x: number; y: number; scale: number }

export type { SqyshMode }

export interface CheckInClientProps {
  result: CheckInResult
  userName: string
  attendance: { attended: number; total: number }
  presenterName: string | null
  /** Newest first, at most three. Empty when there's nothing to reinstate. */
  missed: MissedMeeting[]
  /** What shipped this week. Empty and Sqysh skips the tour. */
  updates?: SqyshUpdate[]
  /** This week's counts, with links to log more before the Activity Round */
  week?: { f2f: number; referrals: number; tyfcb: number } | null
  /** True when this member is judging today's Guiding Light round */
  isGuidingLight?: boolean
  /** True when this member is hosting today's meeting (drives the stage from the remote) */
  isHost?: boolean
  /** True when this member is the treasurer (gives the report from the treasurer screen) */
  isTreasurer?: boolean
  /** Preview only: run the round-opened send-off on a timer instead of waiting for Pusher */
  previewOpen?: boolean
  /** True when this member is a super user (gets the command deck) */
  isSuper?: boolean
}
