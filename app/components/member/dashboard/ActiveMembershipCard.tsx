import { fmtDate } from '@/app/lib/utils/date.utils'
import { capitalize } from '@/app/lib/utils/string.utils'
import { useSounds } from '@/app/lib/hooks/useSounds'
import { CheckCircle, CreditCard, Pencil, Receipt } from 'lucide-react'
import Link from 'next/link'

export function ActiveMembershipCard({ membership, onEdit }: { membership: any; onEdit: () => void }) {
  const { annualOrder, quarterlyOrder, paymentMethod } = membership
  const { play } = useSounds({ enabled: true })

  return (
    <div className="border border-border-light dark:border-border-dark">
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex items-center gap-2">
        <CheckCircle size={13} className="text-green-500 shrink-0" aria-hidden="true" />
        <p className="text-f10 font-mono tracking-widest uppercase text-green-600 dark:text-green-400 flex-1">
          Membership Active
        </p>
      </div>

      {/* ── Subscriptions ── */}
      <div className="divide-y divide-border-light dark:divide-border-dark">
        {annualOrder && (
          <div className="px-4 py-4">
            <p className="text-[14px] font-sora font-bold text-text-light dark:text-text-dark leading-tight">
              Annual Admission
            </p>
            <p className="text-[13px] font-nunito font-bold text-text-light dark:text-text-dark mt-1">$365 / year</p>
            <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-1">
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
            <p className="text-[14px] font-sora font-bold text-text-light dark:text-text-dark leading-tight">
              Room Dues
            </p>
            <p className="text-[13px] font-nunito font-bold text-text-light dark:text-text-dark mt-1">$60 / quarter</p>
            <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-1">
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
          <CreditCard size={13} className="text-muted-light dark:text-muted-dark shrink-0" aria-hidden="true" />
          <p className="text-f10 font-mono text-muted-light dark:text-muted-dark flex-1">
            {capitalize(paymentMethod.brand)} •••• {paymentMethod.last4} · expires {paymentMethod.expMonth}/
            {paymentMethod.expYear}
          </p>
          <button
            onClick={() => {
              play('se9')
              onEdit()
            }}
            aria-label="Update payment method"
            className="inline-flex items-center gap-1.5 text-f10 font-mono tracking-widest uppercase text-primary-light dark:text-primary-dark hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark shrink-0"
          >
            <Pencil size={10} aria-hidden="true" />
            Edit
          </button>
        </div>
      )}

      {/* ── Secondary actions ── */}
      <div className="border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
        <Link
          href="/billing"
          className="flex items-center gap-3 px-4 py-3 hover:bg-bg-light dark:hover:bg-bg-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark group"
        >
          <Receipt size={13} className="text-muted-light dark:text-muted-dark shrink-0" aria-hidden="true" />
          <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark flex-1 group-hover:text-primary-light dark:group-hover:text-primary-dark transition-colors">
            View Billing History
          </p>
          <span className="text-f10 font-mono text-muted-light dark:text-muted-dark group-hover:text-primary-light dark:group-hover:text-primary-dark transition-colors">
            →
          </span>
        </Link>

        {/* Cancel */}
        <div className="px-4 py-3 border-t border-border-light dark:border-border-dark">
          <Link
            href="/membership/cancel"
            className="text-f10 font-mono tracking-widest uppercase text-red-500/50 hover:text-red-500 dark:text-red-500/40 dark:hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Cancel Membership →
          </Link>
        </div>
      </div>
    </div>
  )
}
