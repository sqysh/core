import { DOT_COLOR } from '@/lib/constants/admin.constants'
import { timeAgo } from '@/lib/utils/date.utils'
import { motion } from 'framer-motion'

export function RecentActivityItem({ item, i }) {
  return (
    <motion.li
      key={item.id}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.27 + i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex items-center gap-3 px-4 py-3.5 bg-bg-light dark:bg-bg-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: DOT_COLOR[item.type] }}
        aria-hidden="true"
      />
      <span className="flex-1 min-w-0 text-[13px] font-nunito font-medium text-text-light dark:text-text-dark truncate">
        {item.label}
      </span>
      <span className="text-f10 font-mono text-muted-light dark:text-muted-dark whitespace-nowrap shrink-0">
        {timeAgo(item.createdAt)}
      </span>
    </motion.li>
  )
}
