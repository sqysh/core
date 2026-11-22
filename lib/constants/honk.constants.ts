import { MEETING_ATTENDANCE_CHANNEL } from '@/lib/constants/attendance-channel.constants'
// A member taps Honk on the check-in screen; their boat sounds its horn on the TV.
export const HONK_CHANNEL = MEETING_ATTENDANCE_CHANNEL
export const HONK_EVENT = 'honk'

/** Minimum gap between one member's honks, so a held thumb can't turn the TV to noise */
export const HONK_COOLDOWN_MS = 1500
