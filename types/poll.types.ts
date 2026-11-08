import { pollSchema } from '@/lib/schemas/poll.schema'
import { z } from 'zod'

export type PollInput = z.input<typeof pollSchema>

export interface PollOptionResult {
  id: string
  label: string
  votes: number
}

export interface PollView {
  id: string
  question: string
  status: 'OPEN' | 'CLOSED'
  createdAt: string
  closedAt: string | null
  createdBy: { id: string; name: string }
  options: PollOptionResult[]
  totalVotes: number
  myOptionId: string | null
  /** The viewer created it or holds a host role, so they may close it */
  canClose: boolean
}

/** What goes over Pusher on every vote: just the tallies */
export interface PollResults {
  pollId: string
  status: 'OPEN' | 'CLOSED'
  options: PollOptionResult[]
  totalVotes: number
}

export type PollRow = {
  id: string
  question: string
  status: 'OPEN' | 'CLOSED'
  createdAt: Date
  closedAt: Date | null
  createdBy: { id: string; name: string | null }
  options: { id: string; label: string; _count: { votes: number } }[]
  votes: { userId: string; optionId: string }[]
}
