import { useState } from 'react'
import { Panel } from '../common/Panel'
import { SectionLabel } from '../common/SectionLabel'
import { SuperDashStatusBadge } from './SuperDashStatusBadge'
import { MotionLink } from '../common/MotionLink'
import { SuperUserMember } from '@/types/super.types'
import { lastSeenColor, lastSeenLabel } from '@/app/lib/utils/date.utils'

export function MembersPanel({ members }: { members: SuperUserMember[] }) {
  const [sort, setSort] = useState<'lastLogin' | 'activity' | 'name'>('lastLogin')

  const sorted = [...members].sort((a, b) => {
    if (sort === 'lastLogin') {
      if (!a.lastLoginAt && !b.lastLoginAt) return 0
      if (!a.lastLoginAt) return 1
      if (!b.lastLoginAt) return -1
      return new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime()
    }
    if (sort === 'activity') {
      const scoreA = a.parleyCount + a.referralCount + a.closedCount
      const scoreB = b.parleyCount + b.referralCount + b.closedCount
      return scoreB - scoreA
    }
    return a.name.localeCompare(b.name)
  })

  return (
    <Panel>
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark">
        <SectionLabel>Members</SectionLabel>
        <div className="flex items-center gap-1">
          {(['lastLogin', 'activity', 'name'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`h-6 px-2.5 text-f9 font-mono tracking-widest uppercase transition-colors focus-visible:outline-none ${
                sort === s
                  ? 'bg-primary-light dark:bg-primary-dark text-white dark:text-bg-dark'
                  : 'text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark'
              }`}
            >
              {s === 'lastLogin' ? 'Recent' : s === 'activity' ? 'Active' : 'A–Z'}
            </button>
          ))}
        </div>
      </div>

      {/* list */}
      <div className="divide-y divide-border-light dark:divide-border-dark max-h-130 overflow-y-auto">
        {sorted.map((m, i) => (
          <MotionLink
            href={`/super/members/${m.id}`}
            key={m.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.03, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex items-center gap-3 px-4 py-3 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
          >
            {/* avatar */}
            <div className="w-8 h-8 shrink-0 bg-primary-light/10 dark:bg-primary-dark/10 border border-primary-light/20 dark:border-primary-dark/20 flex items-center justify-center overflow-hidden">
              {m.profileImage ? (
                <img src={m.profileImage} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-f10 font-mono font-bold text-primary-light dark:text-primary-dark">
                  {m.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
              )}
            </div>

            {/* info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
                <span className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark truncate">
                  {m.name}
                </span>
                <SuperDashStatusBadge status={m.membershipStatus === 'INACTIVE' && 'INACTIVE'} />
                {m.role === 'ADMIN' && (
                  <span className="text-f9 font-mono tracking-widest uppercase px-1.5 py-0.5 bg-fuchsia-50 dark:bg-fuchsia-400/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-200 dark:border-fuchsia-400/20">
                    Admin
                  </span>
                )}
                {m.isMembership && (
                  <span className="text-f9 font-mono tracking-widest uppercase px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-emerald-400/20">
                    Membership
                  </span>
                )}
              </div>
              <p className="text-[11.5px] font-nunito text-muted-light dark:text-muted-dark truncate">
                {[m.title, m.company, m.industry].filter(Boolean).join(' · ')}
              </p>
            </div>

            {/* activity counts */}
            <div className="hidden xs:flex items-center gap-3 shrink-0">
              <div className="text-center">
                <p className="font-mono text-[11px] font-bold text-text-light dark:text-text-dark">{m.parleyCount}</p>
                <p className="text-f9 font-mono text-muted-light dark:text-muted-dark uppercase tracking-widest">F2F</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-[11px] font-bold text-text-light dark:text-text-dark">{m.referralCount}</p>
                <p className="text-f9 font-mono text-muted-light dark:text-muted-dark uppercase tracking-widest">Ref</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-[11px] font-bold text-text-light dark:text-text-dark">{m.closedCount}</p>
                <p className="text-f9 font-mono text-muted-light dark:text-muted-dark uppercase tracking-widest">$</p>
              </div>
              <div className="text-center">
                <p
                  className={`font-mono text-[11px] font-bold ${m.hasAnnualSubscription ? 'text-emerald-500' : 'text-rose-400'}`}
                >
                  {m.hasAnnualSubscription ? '✓' : '✗'}
                </p>
                <p className="text-f9 font-mono text-muted-light dark:text-muted-dark uppercase tracking-widest">Ann</p>
              </div>
              <div className="text-center">
                <p
                  className={`font-mono text-[11px] font-bold ${m.hasQuarterlySubscription ? 'text-emerald-500' : 'text-rose-400'}`}
                >
                  {m.hasQuarterlySubscription ? '✓' : '✗'}
                </p>
                <p className="text-f9 font-mono text-muted-light dark:text-muted-dark uppercase tracking-widest">Qtr</p>
              </div>
            </div>

            {/* last seen */}
            <div className="shrink-0 text-right min-w-14">
              <p className={`text-[11px] font-mono ${lastSeenColor(m.lastLoginAt)}`}>{lastSeenLabel(m.lastLoginAt)}</p>
            </div>
          </MotionLink>
        ))}
      </div>
    </Panel>
  )
}
