'use client'

import { useRouter } from 'next/navigation'
import { MembershipStatus, UserRole } from '@prisma/client'
import { lastSeenColor, lastSeenLabel } from '@/app/lib/utils/date.utils'
import { formatPhone } from '@/app/lib/utils/phone.utils'

interface Member {
  id: string
  name: string
  email: string
  phone: string | null
  lastLoginAt: Date | null
  membershipStatus: MembershipStatus
  role: UserRole
  hasAnnualSubscription: boolean
  hasQuarterlySubscription: boolean
  profileImage: string | null
  company: string
  title: string | null
}

const STATUS_STYLES: Record<MembershipStatus, string> = {
  ACTIVE:
    'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-400/20',
  APPROVED: 'bg-sky-50 dark:bg-sky-400/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-400/20',
  PENDING:
    'bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-400/20',
  CANCELLED: 'bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-400/20',
  REJECTED:
    'bg-slate-50 dark:bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-400/20',
  INACTIVE:
    'bg-slate-50 dark:bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-400/20',
  SUSPENDED:
    'bg-orange-50 dark:bg-orange-400/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-400/20',
  EXPIRED:
    'bg-slate-50 dark:bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-400/20',
  INITIAL_REVIEW:
    'bg-violet-50 dark:bg-violet-400/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-400/20',
  BACKGROUND_CHECK:
    'bg-violet-50 dark:bg-violet-400/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-400/20',
  FINAL_DECISION:
    'bg-violet-50 dark:bg-violet-400/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-400/20',
  FLAGGED: 'bg-red-50 dark:bg-red-400/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-400/20'
}

const COLS = 'grid grid-cols-[2fr_2fr_1.2fr_1fr_1fr_auto] gap-4 px-4'
const HEADS = ['Name', 'Email', 'Phone', 'Status', 'Last Seen', 'Ann · Qtr']

function SubDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded-sm text-[10px] font-mono font-bold
      ${
        active
          ? 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-400/20'
          : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-slate-700'
      }`}
    >
      {active ? '✓' : '✗'}
    </span>
  )
}

function TableHead() {
  return (
    <div className={`${COLS} py-2.5 bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark`}>
      {HEADS.map((h) => (
        <span key={h} className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-on-dark">
          {h}
        </span>
      ))}
    </div>
  )
}

function MemberRow({ m, onClick }: { m: Member; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full ${COLS} py-3.5 items-center border-b border-border-light dark:border-border-dark last:border-0 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors text-left group`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 shrink-0 bg-primary-light/10 dark:bg-primary-dark/10 border border-primary-light/20 dark:border-primary-dark/20 flex items-center justify-center overflow-hidden rounded-sm">
          {m.profileImage ? (
            <img src={m.profileImage} alt={m.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[9px] font-mono font-bold text-primary-light dark:text-primary-dark">
              {m.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark truncate group-hover:text-primary-light dark:group-hover:text-primary-dark transition-colors">
            {m.name}
          </p>
          {m.title && (
            <p className="text-[11px] font-nunito text-muted-light dark:text-muted-dark truncate">{m.title}</p>
          )}
        </div>
      </div>

      <p className="text-[12px] font-mono text-muted-light dark:text-muted-dark truncate">{m.email}</p>

      <p className="text-[12px] font-mono text-muted-light dark:text-muted-dark">
        {formatPhone(m.phone) ?? <span className="text-on-dark">—</span>}
      </p>

      <span
        className={`inline-block text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 border ${STATUS_STYLES[m.membershipStatus] ?? ''}`}
      >
        {m.membershipStatus.toLowerCase().replace('_', ' ')}
      </span>

      <p className={`text-[11px] font-mono ${lastSeenColor(m.lastLoginAt ? String(m.lastLoginAt) : null)}`}>
        {lastSeenLabel(m.lastLoginAt ? String(m.lastLoginAt) : null)}
      </p>

      <div className="flex items-center gap-1.5">
        <SubDot active={m.hasAnnualSubscription} />
        <SubDot active={m.hasQuarterlySubscription} />
      </div>
    </button>
  )
}

export default function SuperMembersClient({
  activeMembers,
  approvedMembers
}: {
  activeMembers: Member[]
  approvedMembers: Member[]
}) {
  const router = useRouter()
  const push = (id: string) => router.push(`/super/members/${id}`)

  return (
    <div className="p-6">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
            Super · Admin
          </p>
          <h1 className="font-sora font-black text-[26px] text-text-light dark:text-text-dark tracking-tight">
            Members
          </h1>
        </div>
        <span className="text-[11px] font-mono text-on-dark">{activeMembers.length} active</span>
      </div>

      {/* Active */}
      <div className="border border-border-light dark:border-border-dark overflow-hidden">
        <TableHead />
        {activeMembers.map((m) => (
          <MemberRow key={m.id} m={m} onClick={() => push(m.id)} />
        ))}
      </div>

      {/* Approved — awaiting payment */}
      {approvedMembers.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-[9.5px] font-mono tracking-[0.2em] uppercase text-amber-500 dark:text-amber-400">
              Approved · Awaiting Payment
            </p>
            <span className="text-[11px] font-mono text-on-dark">{approvedMembers.length}</span>
          </div>
          <div className="border border-amber-200 dark:border-amber-400/20 overflow-hidden">
            <TableHead />
            {approvedMembers.map((m) => (
              <MemberRow key={m.id} m={m} onClick={() => push(m.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
