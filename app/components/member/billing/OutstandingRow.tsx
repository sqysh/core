import { motion } from 'framer-motion'
import { useSounds } from '@/app/lib/hooks/useSounds'
import { fadeInUp } from '@/app/lib/constants/motion'
import { fmtDate } from '@/app/lib/utils/date.utils'

export function OutstandingRow({
  row,
  onReinstate
}: {
  row: { meetingId: string; date: string }
  onReinstate: (row: { meetingId: string; date: string }) => void
}) {
  const { play } = useSounds({ enabled: true })
  return (
    <motion.div
      variants={fadeInUp}
      className="flex items-start justify-between gap-4 px-4 py-3.5 border-b border-border-light dark:border-border-dark last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark leading-tight">
          Missed Meeting
        </p>
        <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-1">{fmtDate(row.date)}</p>
        <button
          onClick={() => {
            play('se9')
            onReinstate(row)
          }}
          className="inline-flex items-center gap-1 text-f10 font-mono tracking-widest uppercase text-amber-600 dark:text-amber-400 hover:opacity-70 transition-opacity mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          Contribute $150 →
        </button>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark">Optional</p>
      </div>
    </motion.div>
  )
}
