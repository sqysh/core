import { motion } from 'framer-motion'
import { useState } from 'react'
import { ActivityItem } from '../../(authenticated)/dashboard/DashboardClient'
import { formatPhone } from '@/app/lib/utils/phone.utils'

// ─── Constants ─────────────────────────────────────────────────────────────────
const ACCENT = {
  meeting: '#38bdf8', // sky-400
  referral: '#22d3ee', // cyan-400
  closed: '#34d399' // emerald-400
} as const

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'MEETING', label: 'Meetings' },
  { key: 'REFERRAL', label: 'Referrals' },
  { key: 'CLOSED', label: 'Closed' }
] as const

const DOT_COLOR: Record<ActivityItem['type'], string> = {
  MEETING: ACCENT.meeting,
  REFERRAL: ACCENT.referral,
  CLOSED: ACCENT.closed
}

type Tab = (typeof TABS)[number]['key']

export function HistoryTabs({ recentActivity }: { recentActivity: ActivityItem[] }) {
  const [activeTab, setActiveTab] = useState<Tab>('ALL')

  const filtered = activeTab === 'ALL' ? recentActivity : recentActivity.filter((item) => item.type === activeTab)

  return (
    <div className="border border-border-light dark:border-border-dark">
      {/* tabs */}
      <div className="flex border-b border-border-light dark:border-border-dark">
        {TABS.map((tab) => {
          const count =
            tab.key === 'ALL' ? recentActivity.length : recentActivity.filter((i) => i.type === tab.key).length
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 h-9 text-f9 font-mono tracking-widest uppercase transition-colors border-b-2 focus-visible:outline-none ${
                activeTab === tab.key
                  ? 'border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark'
                  : 'border-transparent text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark'
              }`}
            >
              {tab.label}
              {count > 0 && <span className="ml-0.5 opacity-50">({count})</span>}
            </button>
          )
        })}
      </div>

      {/* list */}
      <ul className="divide-y divide-border-light dark:divide-border-dark max-h-100 overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="px-4 py-5 text-center text-[12px] font-nunito text-muted-light dark:text-muted-dark">
            No activity yet
          </li>
        ) : (
          filtered.map((item, i) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex items-start gap-2.5 px-3 py-3 bg-bg-light dark:bg-bg-dark"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                style={{ backgroundColor: DOT_COLOR[item.type] }}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-nunito font-medium text-text-light dark:text-text-dark truncate">
                  {item.label}
                </p>
                {item.type === 'REFERRAL' && item.clientPhone && (
                  <div className="flex items-center gap-2.5 mt-0.5">
                    <span className="text-f10 font-mono text-muted-light dark:text-muted-dark">
                      {formatPhone(item.clientPhone)}
                    </span>
                    <a
                      href={`tel:${item.clientPhone.replace(/\D/g, '')}`}
                      className="text-f10 font-mono uppercase tracking-widest text-primary-light dark:text-primary-dark hover:opacity-70 transition-opacity"
                    >
                      Call
                    </a>
                    <a
                      href={`sms:${item.clientPhone.replace(/\D/g, '')}`}
                      className="text-f10 font-mono uppercase tracking-widest text-primary-light dark:text-primary-dark hover:opacity-70 transition-opacity"
                    >
                      Text
                    </a>
                  </div>
                )}
                {item.type === 'CLOSED' && item.businessValue && (
                  <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-0.5">
                    ${Number(item.businessValue).toLocaleString()}
                  </p>
                )}
              </div>
              <span className="text-f10 font-mono text-muted-light dark:text-muted-dark whitespace-nowrap shrink-0 mt-0.5">
                {item.timeAgo}
              </span>
            </motion.li>
          ))
        )}
      </ul>
    </div>
  )
}
