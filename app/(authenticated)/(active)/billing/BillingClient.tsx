'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, CreditCard, Pencil } from 'lucide-react'
import { fmtDate } from '@/lib/utils/date.utils'
import { capitalize } from '@/lib/utils/string.utils'
import { useState } from 'react'
import { AttendanceCorrectionModal } from '@/components/member/attendance/AttendanceCorrectionModal'
import { isPaid } from '@/lib/utils/billing.utils'
import { Section } from '@/app/(authenticated)/(active)/billing/_components/Section'
import { OutstandingRow } from '@/app/(authenticated)/(active)/billing/_components/OutstandingRow'
import { SubscriptionRow } from '@/app/(authenticated)/(active)/billing/_components/SubscriptionRow'
import { CorrectionRow } from '@/app/(authenticated)/(active)/billing/_components/CorrectionRow'
import { LinkBody } from '@/components/_shared/LinkBody'
import { BillingClientProps } from '@/types/billing.types'
import { useAppStore } from '@/lib/store/appStore'

export default function BillingClient({
  subscriptions,
  corrections,
  missedMeetings,
  paymentMethod
}: BillingClientProps) {
  const [correctionRow, setCorrectionRow] = useState<{ meetingId: string; date: string } | null>(null)

  const paidSubscriptions = subscriptions.filter(isPaid)
  const totalPaid = [...paidSubscriptions, ...corrections].reduce((sum, o) => sum + o.amount, 0)

  const upcomingCharges = subscriptions
    .filter((s) => s.status === 'ACTIVE' && s.currentPeriodEnd)
    .map((s) => new Date(s.currentPeriodEnd!))
    .sort((a, b) => a.getTime() - b.getTime())

  const nextUpcomingCharge = upcomingCharges[0] ?? null

  const { openMembershipPaymentSetupModal } = useAppStore()

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
            className="inline-flex items-center gap-2 h-11 -mt-2 text-[14px] font-mono text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            <LinkBody icon={<ArrowLeft size={16} />} label="Dashboard" spinnerClass="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
            <p className="text-f10 font-mono tracking-[0.12em] uppercase text-primary-light dark:text-primary-dark">
              CORE
            </p>
          </div>
          <div className="flex items-end justify-between gap-4">
            <h1 className="font-sora font-black text-3xl text-text-light dark:text-text-dark tracking-tight">
              Billing
            </h1>
            <p className="text-[14px] font-mono text-muted-light dark:text-muted-dark pb-1">
              Total paid ·{' '}
              <span className="text-text-light dark:text-text-dark font-bold">${totalPaid.toFixed(2)}</span>
            </p>
          </div>
        </div>

        {/* Payment method */}
        {paymentMethod && (
          <div className="mt-6 border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-4 py-3 flex items-center gap-3">
            <CreditCard size={16} className="text-muted-light dark:text-muted-dark shrink-0" aria-hidden="true" />
            <p className="text-[14px] font-mono text-text-light dark:text-text-dark flex-1 min-w-0">
              {capitalize(paymentMethod.brand)} •••• {paymentMethod.last4} · expires {paymentMethod.expMonth}/
              {paymentMethod.expYear}
            </p>
            <button
              onClick={openMembershipPaymentSetupModal}
              aria-label="Update payment method"
              className="shrink-0 inline-flex items-center justify-center gap-1.5 h-11 px-3 -mr-3 text-[14px] font-mono text-primary-light dark:text-primary-dark hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
            >
              <Pencil size={14} aria-hidden="true" />
              Edit
            </button>
          </div>
        )}

        {/* Next charge callout */}
        {nextUpcomingCharge && (
          <div className="mt-3 border border-amber-500/30 dark:border-amber-400/30 bg-amber-500/5 dark:bg-amber-400/5 px-4 py-3.5 flex items-center gap-3">
            <Calendar size={18} className="text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-f10 font-mono tracking-[0.12em] uppercase text-amber-700 dark:text-amber-400 font-bold mb-1">
                Next charge
              </p>
              <p className="text-[15px] font-nunito text-text-light dark:text-text-dark leading-tight">
                {fmtDate(nextUpcomingCharge.toISOString())}
              </p>
            </div>
          </div>
        )}

        {/* Sections */}
        <div className="pt-8 flex flex-col gap-8">
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
              <p className="px-4 py-4 text-[15px] font-nunito text-muted-light dark:text-muted-dark">
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
              <p className="px-4 py-4 text-[15px] font-nunito text-muted-light dark:text-muted-dark">
                No contributions yet — perfect attendance means no reinstatements needed.
              </p>
            ) : (
              corrections.map((o) => <CorrectionRow key={o.id} order={o} />)
            )}
          </Section>
        </div>

        {/* Cancel */}
        <div className="mt-10 pt-6 border-t border-border-light dark:border-border-dark">
          <Link
            href="/membership/cancel"
            className="inline-flex items-center gap-1.5 h-12 text-[14px] font-mono text-red-600/80 hover:text-red-600 dark:text-red-400/70 dark:hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <LinkBody
              label="Cancel membership"
              icon={<span aria-hidden="true">→</span>}
              spinnerClass="w-4 h-4"
              iconAfter
            />
          </Link>
        </div>
      </main>
    </div>
  )
}
