'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar } from 'lucide-react'
import { fmtDate } from '@/app/lib/utils/date.utils'
import { useState } from 'react'
import { AttendanceCorrectionModal } from '@/app/components/member/attendance/AttendanceCorrectionModal'
import { BillingClientProps } from '@/types/billing.types'
import { isPaid } from '@/app/lib/utils/billing.utils'
import { Section } from '@/app/components/member/billing/Section'
import { OutstandingRow } from '@/app/components/member/billing/OutstandingRow'
import { SubscriptionRow } from '@/app/components/member/billing/SubscriptionRow'
import { CorrectionRow } from '@/app/components/member/billing/CorrectionRow'

export default function BillingClient({ subscriptions, corrections, missedMeetings }: BillingClientProps) {
  const [correctionRow, setCorrectionRow] = useState<{ meetingId: string; date: string } | null>(null)

  // Calculate total of actually-paid orders only
  const paidSubscriptions = subscriptions.filter(isPaid)
  const totalPaid = [...paidSubscriptions, ...corrections].reduce((sum, o) => sum + o.amount, 0)

  // Get the next upcoming charge across all active subscriptions
  const upcomingCharges = subscriptions
    .filter((s) => s.status === 'ACTIVE' && s.currentPeriodEnd)
    .map((s) => new Date(s.currentPeriodEnd!))
    .sort((a, b) => a.getTime() - b.getTime())

  const nextUpcomingCharge = upcomingCharges[0] ?? null

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <AttendanceCorrectionModal
        open={correctionRow !== null}
        onClose={() => setCorrectionRow(null)}
        meetingId={correctionRow?.meetingId ?? ''}
        date={correctionRow?.date ?? ''}
      />

      <main className="max-w-170 mx-auto px-4 pb-12">
        {/* Header */}
        <div className="pt-7 pb-6 border-b border-border-light dark:border-border-dark">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            <ArrowLeft size={11} />
            Dashboard
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
            <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
              CORE
            </p>
          </div>
          <div className="flex items-end justify-between gap-4">
            <h1 className="font-sora font-black text-3xl text-text-light dark:text-text-dark tracking-tight">
              Billing
            </h1>
            <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark pb-1">
              Total paid · <span className="text-text-light dark:text-text-dark">${totalPaid.toFixed(2)}</span>
            </p>
          </div>
        </div>

        {/* Next charge callout */}
        {nextUpcomingCharge && (
          <div className="mt-6 border border-amber-500/30 dark:border-amber-400/30 bg-amber-500/5 dark:bg-amber-400/5 px-4 py-3 flex items-center gap-3">
            <Calendar size={14} className="text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-f10 font-mono tracking-[0.18em] uppercase text-amber-700 dark:text-amber-400 font-bold mb-0.5">
                Next Charge
              </p>
              <p className="text-[12px] font-nunito text-text-light dark:text-text-dark leading-tight">
                {fmtDate(nextUpcomingCharge.toISOString())}
              </p>
            </div>
          </div>
        )}

        {/* Sections */}
        <div className="pt-6 flex flex-col gap-8">
          {/* Available to reinstate (optional) */}
          {missedMeetings.length > 0 && (
            <Section
              label={`Available to Reinstate · ${missedMeetings.length}`}
              description="Optional — chip in $150 per missed meeting to support the chapter outing. You're never required to reinstate."
            >
              {missedMeetings.map((m) => (
                <OutstandingRow key={m.meetingId} row={m} onReinstate={setCorrectionRow} />
              ))}
            </Section>
          )}

          <Section label="Your Subscriptions" description="Your active membership plans and when they renew.">
            {subscriptions.length === 0 ? (
              <p className="px-4 py-4 text-xs font-nunito text-muted-light dark:text-muted-dark">
                No subscriptions yet.
              </p>
            ) : (
              subscriptions.map((o) => <SubscriptionRow key={o.id} order={o} />)
            )}
          </Section>

          <Section
            label="Your Outing Fund Contributions"
            description="Reinstatement payments you've made toward the annual chapter outing."
          >
            {corrections.length === 0 ? (
              <p className="px-4 py-4 text-xs font-nunito text-muted-light dark:text-muted-dark">
                No contributions yet — perfect attendance means no reinstatements needed.
              </p>
            ) : (
              corrections.map((o) => <CorrectionRow key={o.id} order={o} />)
            )}
          </Section>
        </div>
      </main>
    </div>
  )
}
