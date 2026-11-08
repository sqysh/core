import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
import { LinkBody } from '@/components/_shared/LinkBody'
import { PollView } from '@/types/poll.types'

export function OpenPollsCard({ polls, me }: { polls: PollView[]; me: string }) {
  const open = polls.filter((p) => p.status === 'OPEN')
  if (open.length === 0) return null
  const waiting = open.filter((p) => p.myOptionId === null)
  const first = waiting[0] ?? open[0]

  return (
    <div className="border border-primary-light/40 dark:border-primary-dark/40">
      <div className="px-4 pt-4 pb-3">
        <p className="text-f10 font-mono tracking-[0.12em] uppercase text-primary-light dark:text-primary-dark">
          {waiting.length > 0
            ? `${waiting.length === 1 ? 'A poll needs' : `${waiting.length} polls need`} your vote`
            : 'Group vote'}
        </p>
        <p className="mt-1 font-sora text-[18px] font-black leading-snug tracking-tight text-text-light dark:text-text-dark text-balance">
          {first.question}
        </p>
        <p className="mt-2 font-nunito text-f12 text-muted-light dark:text-muted-dark">
          {first.createdBy.id === me ? 'You started this' : `${first.createdBy.name.split(' ')[0]} started this`} ·{' '}
          {first.totalVotes} {first.totalVotes === 1 ? 'vote' : 'votes'} so far
        </p>
      </div>
      <Link
        href="/polls"
        className="flex h-12 w-full items-center justify-center gap-2 bg-primary-light font-sora text-[15px] font-black text-white dark:bg-primary-dark"
      >
        <LinkBody
          label={waiting.length > 0 ? 'Vote now' : 'See results'}
          icon={<BarChart3 size={16} aria-hidden="true" />}
        />
      </Link>
    </div>
  )
}
