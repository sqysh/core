import { motion } from 'framer-motion'

export function LogFeed() {
  const logs = [
    { time: '07:02:14', event: 'check_in.received', meta: '{ method: "qr_scan" }' },
    { time: '07:14:38', event: 'visitor.invited', meta: '{ chapter: "lynn" }' },
    { time: '07:31:02', event: 'referral.created', meta: '{ status: "pending" }' },
    { time: '07:42:19', event: 'thank_you.submitted', meta: '{ amount: 8250 }' },
    { time: '07:55:41', event: 'f2f.logged', meta: '{ duration: 45 }' },
    { time: '08:03:07', event: 'attendance.committed', meta: '{ count: 13 }' }
  ]

  return (
    <div className="border-y border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="block w-2 h-2 rounded-full bg-primary-light dark:bg-primary-dark animate-pulse" />
          <p className="text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark">
            Live · Platform Event Stream
          </p>
        </div>
        <div className="space-y-1 font-mono text-[11px] sm:text-xs">
          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-baseline gap-3 sm:gap-4 text-text-light dark:text-text-dark"
            >
              <span className="text-muted-light dark:text-muted-dark shrink-0">[{log.time}]</span>
              <span className="text-primary-light dark:text-primary-dark shrink-0">{log.event}</span>
              <span className="text-muted-light dark:text-muted-dark truncate hidden sm:inline">{log.meta}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
