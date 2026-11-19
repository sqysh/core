import { Avatar } from '@/components/_shared/Avatar'
import { Member } from '@/types/attendance.types'

// The harbor log: everyone in the chapter, lit once they've checked in
export function RosterStrip({ members, checkedIn }: { members: Member[]; checkedIn: Map<string, string> }) {
  const here = members.filter((m) => checkedIn.has(m.id)).length

  return (
    <div
      className="absolute left-6 top-6 z-20 max-w-[44vw] rounded-2xl px-4 pb-3 pt-2.5 shadow-[0_8px_24px_rgba(10,40,90,0.35)]"
      style={{
        background: 'rgba(246,236,210,0.94)',
        border: '3px solid #1d3767',
        boxShadow: 'inset 0 0 0 3px rgba(29,55,103,0.25)'
      }}
    >
      <p className="m-0 mb-2 flex items-baseline justify-between gap-6 font-sora text-[13px] font-black uppercase tracking-[0.2em] text-[#1d3767]">
        Harbor log
        <span className="tabular-nums tracking-widest">
          {here} / {members.length} in
        </span>
      </p>
      <div className="grid grid-flow-col grid-rows-[repeat(10,auto)] gap-x-4 gap-y-1">
        {members.map((m) => {
          const isIn = checkedIn.has(m.id)
          return (
            <div
              key={m.id}
              className={`flex min-w-0 items-center gap-1.5 transition-all duration-700 ${isIn ? 'opacity-100' : 'opacity-40 grayscale'}`}
            >
              <Avatar member={m} size="xs" />
              <span className="truncate font-sora text-[clamp(11px,0.85vw,14px)] font-bold text-[#1d3767]">
                {m.name.split(' ')[0]}
              </span>
              {isIn && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2f9e5e]" aria-hidden="true" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
