import { fmtDate } from '@/lib/utils/date.utils'
import { capitalize } from '@/lib/utils/string.utils'
import { useSounds } from '@/lib/hooks/useSounds'
import { CheckCircle, CreditCard, Pencil, Receipt } from 'lucide-react'
import Link from 'next/link'
import { LinkBody } from '@/components/_shared/LinkBody'

export function ActiveMembershipCard({ membership, onEdit }: { membership: any; onEdit: () => void }) {
  const { annualOrder, quarterlyOrder, paymentMethod } = membership
  const { play } = useSounds({ enabled: true })

  return (
    <div className="border border-border-light dark:border-border-dark">
      {/* ── Header ── */}
      <div className="px-4 py-3.5 border-b border-border-light dark:border-border-dark flex items-center gap-2">
        <CheckCircle size={16} className="text-green-600 dark:text-green-400 shrink-0" aria-hidden="true" />
        <p className="text-f10 font-mono tracking-[0.12em] uppercase text-green-700 dark:text-green-400 flex-1">
          Membership active
        </p>
      </div>

      {/* ── Subscriptions ── */}
      <div className="divide-y divide-border-light dark:divide-border-dark">
        {annualOrder && (
          <div className="px-4 py-4">
            <p className="text-[16px] font-sora font-bold text-text-light dark:text-text-dark leading-tight">
              Annual Admission
            </p>
            <p className="text-[15px] font-nunito font-bold text-text-light dark:text-text-dark mt-1">$365 / year</p>
            <p className="text-[14px] font-mono text-muted-light dark:text-muted-dark mt-1.5">
              {annualOrder.currentPeriodEnd ? (
                <>Next renewal · {fmtDate(new Date(annualOrder.currentPeriodEnd).toISOString(), true)}</>
              ) : (
                <>Awaiting first charge</>
              )}
            </p>
          </div>
        )}
        {quarterlyOrder && (
          <div className="px-4 py-4">
            <p className="text-[16px] font-sora font-bold text-text-light dark:text-text-dark leading-tight">
              Room Dues
            </p>
            <p className="text-[15px] font-nunito font-bold text-text-light dark:text-text-dark mt-1">$60 / quarter</p>
            <p className="text-[14px] font-mono text-muted-light dark:text-muted-dark mt-1.5">
              {quarterlyOrder.currentPeriodEnd ? (
                <>Next charge · {fmtDate(new Date(quarterlyOrder.currentPeriodEnd).toISOString(), true)}</>
              ) : (
                <>First charge · Wednesday, July 1, 2026</>
              )}
            </p>
          </div>
        )}
      </div>

      {/* ── Payment method ── */}
      {paymentMethod && (
        <div className="border-t-2 border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-4 py-3 flex items-center gap-3">
          <CreditCard size={16} className="text-muted-light dark:text-muted-dark shrink-0" aria-hidden="true" />
          <p className="text-[14px] font-mono text-text-light dark:text-text-dark flex-1">
            {capitalize(paymentMethod.brand)} •••• {paymentMethod.last4} · expires {paymentMethod.expMonth}/
            {paymentMethod.expYear}
          </p>
          <button
            onClick={() => {
              play('se9')
              onEdit()
            }}
            aria-label="Update payment method"
            className="inline-flex items-center justify-center gap-1.5 h-11 px-3 -mr-3 text-[14px] font-mono text-primary-light dark:text-primary-dark hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark shrink-0"
          >
            <Pencil size={14} aria-hidden="true" />
            Edit
          </button>
        </div>
      )}

      {/* ── Secondary actions ── */}
      <div className="border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
        <Link
          href="/billing"
          className="flex items-center gap-3 px-4 h-14 hover:bg-bg-light dark:hover:bg-bg-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark group"
        >
          <LinkBody
            icon={<Receipt size={16} className="text-muted-light dark:text-muted-dark shrink-0" aria-hidden="true" />}
            spinnerClass="w-4 h-4 text-muted-light dark:text-muted-dark"
          >
            <p className="text-[14px] font-mono text-text-light dark:text-text-dark flex-1 group-hover:text-primary-light dark:group-hover:text-primary-dark transition-colors">
              View billing history
            </p>
            <span className="text-[14px] font-mono text-muted-light dark:text-muted-dark group-hover:text-primary-light dark:group-hover:text-primary-dark transition-colors">
              →
            </span>
          </LinkBody>
        </Link>

        {/* Cancel */}
        <div className="px-4 border-t border-border-light dark:border-border-dark">
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
      </div>
    </div>
  )
}
