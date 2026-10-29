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
  const dim = size === 'sm' ? 'w-7 h-7 text-[9px]' : 'w-10 h-10 text-[11px]'
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
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark">
        <span className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-on-dark">Leadership</span>
        <span className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-primary-light dark:text-primary-dark">
          {season}
        </span>
      </div>

      <div className="px-4 py-3 bg-primary-light/5 dark:bg-primary-dark/5 border-b border-border-light dark:border-border-dark flex flex-col gap-3">
        {featured.map((s) => (
          <div key={s.id} className="flex items-center gap-3 min-w-0">
            <Avatar holder={s.holder} size="md" />
            <div className="min-w-0">
              <p className="text-[9px] font-mono tracking-[0.15em] uppercase text-primary-light dark:text-primary-dark">
                {POSITIONS[s.position].label}
              </p>
              <p className="font-sora font-bold text-[14px] text-text-light dark:text-text-dark truncate mt-0.5">
                {s.holder.name}
              </p>
              <p className="text-[10px] font-mono text-muted-light dark:text-muted-dark truncate">{s.holder.company}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="divide-y divide-border-light dark:divide-border-dark">
        {rest.map((s) => (
          <div key={s.id} className="flex items-center gap-2.5 px-4 py-3 min-w-0">
            <Avatar holder={s.holder} />
            <div className="min-w-0 flex-1">
              <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark truncate">
                {s.holder.name}
              </p>
              <p className="text-[10px] font-mono text-muted-light dark:text-muted-dark truncate">
                {POSITIONS[s.position].label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/leadership"
        className="flex items-center justify-between px-4 py-3 border-t border-border-light dark:border-border-dark text-[10px] font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors"
      >
        <LinkBody
          label={remaining > 0 ? `View all · ${remaining} more` : 'View all'}
          icon={<ArrowRight className="w-3 h-3" />}
          iconAfter
        />
      </Link>
    </div>
  )
}
