export const POLL_MIN_OPTIONS = 2
export const POLL_MAX_OPTIONS = 6
export const POLL_QUESTION_MAX = 140
export const POLL_OPTION_MAX = 80

export const pollChannel = (pollId: string) => `poll-${pollId}`
export const POLL_EVENT = 'results'

// Chapter-wide channel for pushing a poll onto every member's phone at once when
// the host launches it from the remote. (Per-poll tallies still ride pollChannel.)
export const POLL_LIVE_CHANNEL = 'poll-live'
export const POLL_LAUNCH_EVENT = 'launch'
export const POLL_CLEAR_EVENT = 'clear'
export interface PollLaunch {
  pollId: string
}
