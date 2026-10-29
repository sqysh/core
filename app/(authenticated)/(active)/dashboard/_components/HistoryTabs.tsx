import { motion } from 'framer-motion'
import { useState } from 'react'
import { formatPhone } from '@/lib/utils/phone.utils'
import { ActivityItem, Tab } from '@/types/dashboard.types'
import { DOT_COLOR, TABS } from '@/lib/constants/member/dashboard.constants'

export function HistoryTabs({ recentActivity }: { recentActivity: ActivityItem[] }) {
  const [activeTab, setActiveTab] = useState<Tab>('ALL')

  const filtered = activeTab === 'ALL' ? recentActivity : recentActivity.filter((item) => item.type === activeTab)

  return (
    <div className="border border-border-light dark:border-border-dark">
      {/* tabs */}
      <div className="flex border-b border-border-light dark:border-border-dark" role="tablist">
        {TABS.map((tab) => {
          const count =
            tab.key === 'ALL' ? recentActivity.length : recentActivity.filter((i) => i.type === tab.key).length
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 h-12 text-[14px] font-mono transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark ${
                active
                  ? 'border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark font-bold'
                  : 'border-transparent text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark'
              }`}
            >
              {tab.label}
              {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </button>
          )
        })}
      </div>

      {/* list */}
      <ul className="divide-y divide-border-light dark:divide-border-dark max-h-100 overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="px-4 py-6 text-center text-[15px] font-nunito text-muted-light dark:text-muted-dark">
            No activity yet
          </li>
        ) : (
          filtered.map((item, i) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex items-start gap-3 px-4 py-3.5 bg-bg-light dark:bg-bg-dark"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0 mt-2"
                style={{ backgroundColor: DOT_COLOR[item.type] }}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-nunito font-medium text-text-light dark:text-text-dark truncate">
                  {item.label}
                </p>
                {item.type === 'REFERRAL' && item.clientPhone && (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[14px] font-mono text-muted-light dark:text-muted-dark">
                      {formatPhone(item.clientPhone)}
                    </span>
                    <a
                      href={`tel:${item.clientPhone.replace(/\D/g, '')}`}
                      className="inline-flex items-center h-10 px-1 text-[14px] font-mono text-primary-light dark:text-primary-dark hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                    >
                      Call
                    </a>
                    <a
                      href={`sms:${item.clientPhone.replace(/\D/g, '')}`}
                      className="inline-flex items-center h-10 px-1 text-[14px] font-mono text-primary-light dark:text-primary-dark hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                    >
                      Text
                    </a>
                  </div>
                )}
                {item.type === 'CLOSED' && item.businessValue && (
                  <p className="text-[14px] font-mono text-muted-light dark:text-muted-dark mt-1">
                    ${Number(item.businessValue).toLocaleString()}
                  </p>
                )}
              </div>
              <span className="text-[14px] font-mono text-muted-light dark:text-muted-dark whitespace-nowrap shrink-0 mt-0.5">
                {item.timeAgo}
              </span>
            </motion.li>
          ))
        )}
      </ul>
    </div>
  )
}
