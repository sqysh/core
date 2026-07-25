'use client'

import { ApplicantModal } from '@/app/components/super/ApplicantModal'
import { useState } from 'react'

interface Applicant {
  id: string
  name: string
  email: string
  phone: string | null
  company: string
  title: string | null
  industry: string
  membershipStatus: string
  createdAt: Date
  profileImage: string | null
  hasCompletedApplication: boolean
  isBackgroudCheckCompleted: boolean
  isInitialReviewCompleted: boolean
  isFinalDecisionMade: boolean
}

function appliedLabel(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CheckCell({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded-sm text-[10px] font-mono font-bold
      ${
        active
          ? 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-400/20'
          : 'bg-surface-light dark:bg-surface-dark text-muted-light dark:text-muted-dark border border-border-light dark:border-border-dark'
      }`}
    >
      {active ? '✓' : '—'}
    </span>
  )
}

export default function SuperApplicationsClient({ applicants }: { applicants: Applicant[] }) {
  const [selected, setSelected] = useState<Applicant | null>(null)

  return (
    <>
      {/* ── Applicant modal ── */}
      <ApplicantModal selected={selected} setSelected={setSelected} />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
              Super · Admin
            </p>
            <h1 className="font-sora font-black text-[26px] text-text-light dark:text-text-dark tracking-tight">
              Applications
            </h1>
          </div>
          <span className="text-[11px] font-mono text-on-dark">{applicants.length} pending</span>
        </div>

        {applicants.length === 0 ? (
          <div className="border border-border-light dark:border-border-dark px-6 py-16 text-center">
            <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-on-dark">No pending applications</p>
          </div>
        ) : (
          <div className="border border-border-light dark:border-border-dark overflow-hidden">
            {/* Head */}
            <div className="grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark">
              {['Name', 'Email', 'Company', 'Applied', 'App Done', 'BG Check', 'Initial Review', 'Final Decision'].map(
                (h) => (
                  <span key={h} className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-on-dark">
                    {h}
                  </span>
                )
              )}
            </div>

            {/* Rows */}
            {applicants.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className="w-full grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3.5 items-center
                border-b border-border-light dark:border-border-dark last:border-0
                hover:bg-surface-light dark:hover:bg-surface-dark transition-colors text-left group"
              >
                {/* Name + avatar */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 shrink-0 bg-primary-light/10 dark:bg-primary-dark/10 border border-primary-light/20 dark:border-primary-dark/20 flex items-center justify-center overflow-hidden rounded-sm">
                    {a.profileImage ? (
                      <img src={a.profileImage} alt={a.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] font-mono font-bold text-primary-light dark:text-primary-dark">
                        {a.name
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
                      {a.name}
                    </p>
                    {a.industry && (
                      <p className="text-[11px] font-nunito text-muted-light dark:text-muted-dark truncate">
                        {a.industry}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <p className="text-[12px] font-mono text-muted-light dark:text-muted-dark truncate">{a.email}</p>

                {/* Company */}
                <p className="text-[12px] font-mono text-muted-light dark:text-muted-dark truncate">{a.company}</p>

                {/* Applied */}
                <p className="text-[11px] font-mono text-muted-light dark:text-muted-dark">
                  {appliedLabel(a.createdAt)}
                </p>

                {/* Progress checkboxes */}
                <CheckCell active={a.hasCompletedApplication} />
                <CheckCell active={a.isBackgroudCheckCompleted} />
                <CheckCell active={a.isInitialReviewCompleted} />
                <CheckCell active={a.isFinalDecisionMade} />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
