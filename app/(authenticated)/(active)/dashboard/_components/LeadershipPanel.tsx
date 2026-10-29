'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LeadershipPosition } from '@prisma/client'
import { POSITIONS } from '@/lib/constants/leadership.constants'
import { getInitials } from '@/lib/utils/shared.utils'
import { LinkBody } from '@/components/_shared/LinkBody'

interface Seat {
  id: string
  position: LeadershipPosition
  holder: { id: string; name: string; company: string; profileImage: string | null }
}

const FEATURED: LeadershipPosition[] = ['HOST', 'CO_DIRECTOR']

function Avatar({ holder, size = 'sm' }: { holder: Seat['holder']; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-9 h-9 text-[11px]' : 'w-11 h-11 text-[13px]'
  return (
    <div
      className={`${dim} shrink-0 rounded-full overflow-hidden border border-primary-light/20 dark:border-primary-dark/20 bg-primary-light/10 dark:bg-primary-dark/10 flex items-center justify-center`}
    >
      {holder.profileImage ? (
        <img src={holder.profileImage} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="font-sora font-black text-primary-light dark:text-primary-dark">
          {getInitials(holder.name)}
        </span>
      )}
    </div>
  )
}

export default function LeadershipPanel({
  season,
  seats,
  totalSeats
}: {
  season: string | null
  seats: Seat[]
  totalSeats: number
}) {
  if (!season || seats.length === 0) return null

  const featured = seats.filter((s) => FEATURED.includes(s.position))
  const rest = seats.filter((s) => !FEATURED.includes(s.position)).slice(0, 3)
  const remaining = totalSeats - featured.length - rest.length

  return (
    <div className="border border-border-light dark:border-border-dark overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark">
        <span className="text-f10 font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">
          Leadership
        </span>
        <span className="text-[14px] font-mono text-primary-light dark:text-primary-dark">{season}</span>
      </div>

      <div className="px-4 py-4 bg-primary-light/5 dark:bg-primary-dark/5 border-b border-border-light dark:border-border-dark flex flex-col gap-4">
        {featured.map((s) => (
          <div key={s.id} className="flex items-center gap-3 min-w-0">
            <Avatar holder={s.holder} size="md" />
            <div className="min-w-0">
              <p className="text-f10 font-mono tracking-[0.12em] uppercase text-primary-light dark:text-primary-dark">
                {POSITIONS[s.position].label}
              </p>
              <p className="font-sora font-bold text-[16px] text-text-light dark:text-text-dark truncate mt-1">
                {s.holder.name}
              </p>
              <p className="text-[14px] font-mono text-muted-light dark:text-muted-dark truncate">{s.holder.company}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="divide-y divide-border-light dark:divide-border-dark">
        {rest.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3 min-w-0">
            <Avatar holder={s.holder} />
            <div className="min-w-0 flex-1">
              <p className="font-sora font-bold text-[15px] text-text-light dark:text-text-dark truncate">
                {s.holder.name}
              </p>
              <p className="text-[14px] font-mono text-muted-light dark:text-muted-dark truncate mt-0.5">
                {POSITIONS[s.position].label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/leadership"
        className="flex items-center justify-between gap-2 px-4 h-14 border-t border-border-light dark:border-border-dark text-[14px] font-mono text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
      >
        <LinkBody
          label={remaining > 0 ? `View all · ${remaining} more` : 'View all'}
          icon={<ArrowRight className="w-4 h-4" />}
          spinnerClass="w-4 h-4"
          iconAfter
        />
      </Link>
    </div>
  )
}
