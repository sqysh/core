import { fmtType } from '@/app/lib/utils/billing.utils'
import { fmtDate } from '@/app/lib/utils/date.utils'
import { BillingOrder } from '@/types/billing.types'
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'

export function CorrectionRow({ order }: { order: BillingOrder }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start justify-between gap-4 px-4 py-3.5 border-b border-border-light dark:border-border-dark last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark leading-tight">
          {fmtType(order.type)}
        </p>
        <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-1">
          {order.meetingDate ? `For ${fmtDate(order.meetingDate)}` : `Paid ${fmtDate(order.createdAt)}`}
        </p>
        {order.hostedInvoiceUrl && (
          <a
            href={order.hostedInvoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-f10 font-mono tracking-widest uppercase text-primary-light dark:text-primary-dark hover:opacity-70 transition-opacity mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            View Receipt
            <ExternalLink size={9} aria-hidden="true" />
          </a>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark">
          ${order.amount.toFixed(2)}
        </p>
        <p className="text-f10 font-mono tracking-widest uppercase mt-1 text-green-600 dark:text-green-400">Paid</p>
      </div>
    </motion.div>
  )
}
