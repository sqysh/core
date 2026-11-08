import { pct } from '@/lib/utils/math.utils'
import { PollResults, PollView } from '@/types/poll.types'

export function Bars({ poll, live }: { poll: PollView; live: PollResults | null }) {
  const options = live?.options ?? poll.options
  const total = live?.totalVotes ?? poll.totalVotes
  const status = live?.status ?? poll.status
  const leader = Math.max(0, ...options.map((o) => o.votes))

  return (
    <div className="absolute inset-0 flex flex-col px-24 py-20">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[34px] tracking-[0.3em] uppercase text-primary-dark">Group vote</p>
        <p className="font-mono text-[34px] tabular-nums tracking-[0.2em] uppercase text-white/45">
          {status === 'OPEN' ? (
            <>
              <span
                className="mr-4 inline-block h-4 w-4 animate-pulse bg-primary-dark align-middle"
                aria-hidden="true"
              />
              live
            </>
          ) : (
            'final'
          )}{' '}
          · {total} {total === 1 ? 'vote' : 'votes'}
        </p>
      </div>
      <h1 className="mt-8 font-sora text-[104px] font-black leading-[1.05] tracking-[-0.035em] text-balance">
        {poll.question}
      </h1>

      <ul className="mt-16 flex flex-1 flex-col justify-center gap-10">
        {options.map((o) => {
          const p = pct(o.votes, total)
          const winning = status === 'CLOSED' && o.votes > 0 && o.votes === leader
          return (
            <li key={o.id}>
              <div className="mb-4 flex items-end justify-between gap-10">
                <p
                  className={`font-sora text-[64px] font-black leading-none tracking-[-0.03em] ${winning ? 'text-primary-dark' : ''}`}
                >
                  {o.label}
                </p>
                <p className="shrink-0 font-mono text-[56px] tabular-nums leading-none text-white/70">
                  {o.votes} <span className="text-[36px] text-white/40">· {p}%</span>
                </p>
              </div>
              <div className="h-7 w-full bg-white/10">
                <div
                  className={`h-full transition-[width] duration-700 ease-out ${winning ? 'bg-primary-dark' : 'bg-primary-dark/60'}`}
                  style={{ width: `${p}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      <p className="font-nunito text-[44px] text-white/60">
        {status === 'OPEN' ? 'Vote from your phone. Dashboard, then Polls.' : `Started by ${poll.createdBy.name}.`}
      </p>
    </div>
  )
}
