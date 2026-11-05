import { motion } from 'framer-motion'
import { useState } from 'react'
import { formatPhone } from '@/lib/utils/phone.utils'
import { ActivityItem, Tab } from '@/types/dashboard.types'
import { DOT_COLOR, TABS } from '@/lib/constants/member/dashboard.constants'

const CONTACT =
  'inline-flex h-10 items-center px-1 font-mono text-[14px] text-primary-light transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:text-primary-dark dark:focus-visible:ring-primary-dark'

export function HistoryTabs({ recentActivity }: { recentActivity: ActivityItem[] }) {
  const [activeTab, setActiveTab] = useState<Tab>('ALL')

  const filtered = activeTab === 'ALL' ? recentActivity : recentActivity.filter((item) => item.type === activeTab)

  return (
    <div className="border border-border-light dark:border-border-dark">
      {/* Tabs share the width when they fit and scroll sideways when they don't */}
      <div
        className="no-scrollbar flex overflow-x-auto border-b border-border-light dark:border-border-dark"
        role="tablist"
      >
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
              className={`h-12 flex-1 shrink-0 basis-auto whitespace-nowrap border-b-2 px-3 font-mono text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark xs:text-[14px] sm:px-4 ${
                active
                  ? 'border-primary-light font-bold text-primary-light dark:border-primary-dark dark:text-primary-dark'
                  : 'border-transparent text-muted-light hover:text-text-light dark:text-muted-dark dark:hover:text-text-dark'
              }`}
            >
              {tab.label}
              {count > 0 && <span className="ml-1 text-[12px] opacity-70">({count})</span>}
            </button>
          )
        })}
      </div>

      <ul className="max-h-100 divide-y divide-border-light overflow-y-auto dark:divide-border-dark">
        {filtered.length === 0 ? (
          <li className="px-4 py-6 text-center font-nunito text-[15px] text-muted-light dark:text-muted-dark">
            No activity yet
          </li>
        ) : (
          filtered.map((item, i) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex items-start gap-2.5 bg-bg-light px-3 py-3.5 dark:bg-bg-dark sm:gap-3 sm:px-4"
            >
              <span
                className="mt-2 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: DOT_COLOR[item.type] }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-nunito text-[15px] font-medium text-text-light dark:text-text-dark">
                  {item.label}
                </p>
                {item.type === 'REFERRAL' && item.clientPhone && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0">
                    <span className="font-mono text-[14px] text-muted-light dark:text-muted-dark">
                      {formatPhone(item.clientPhone)}
                    </span>
                    <a href={`tel:${item.clientPhone.replace(/\D/g, '')}`} className={CONTACT}>
                      Call
                    </a>
                    <a href={`sms:${item.clientPhone.replace(/\D/g, '')}`} className={CONTACT}>
                      Text
                    </a>
                  </div>
                )}
                {item.type === 'CLOSED' && item.businessValue && (
                  <p className="mt-1 font-mono text-[14px] tabular-nums text-muted-light dark:text-muted-dark">
                    ${Number(item.businessValue).toLocaleString()}
                  </p>
                )}
              </div>
              <span className="mt-0.5 shrink-0 whitespace-nowrap font-mono text-[13px] text-muted-light dark:text-muted-dark sm:text-[14px]">
                {item.timeAgo}
              </span>
            </motion.li>
          ))
        )}
      </ul>
    </div>
  )
}
