'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  UserPlus,
  Eye,
  Settings,
  CalendarDays,
  Handshake,
  Share2,
  DollarSign,
  Mic,
  XCircle,
  CalendarX,
  ScrollText,
  ClipboardCheck,
  Layout,
  ArrowLeft
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard', href: '/super/dashboard', icon: Layout },
  { label: 'Members', href: '/super/members', icon: Users },
  { label: 'Applications', href: '/super/applications', icon: UserPlus },
  { label: 'Attendance', href: '/super/attendance', icon: ClipboardCheck },
  { label: 'Face to Face', href: '/super/face-to-face', icon: Handshake },
  { label: 'Referrals', href: '/super/referrals', icon: Share2 },
  { label: 'Closed Business', href: '/super/closed-business', icon: DollarSign },
  { label: 'Presenter Queue', href: '/super/presenter-queue', icon: Mic },
  { label: 'Events', href: '/super/events', icon: CalendarDays },
  { label: 'Visitors', href: '/super/visitors', icon: Eye },
  { label: 'Visitor Days', href: '/super/visitor-days', icon: CalendarX },
  { label: 'Cancelled Meetings', href: '/super/cancelled-meetings', icon: XCircle },
  { label: 'Logs', href: '/super/logs', icon: ScrollText },
  { label: 'Settings', href: '/super/settings', icon: Settings }
]

export function SuperSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="
      w-52 shrink-0 flex flex-col
      h-screen sticky top-0
      bg-white dark:bg-bg-dark
      border-r border-border-light dark:border-border-dark
    "
    >
      {/* Wordmark */}
      <Link
        href="/"
        className="h-12 flex items-center px-4 border-b border-border-light dark:border-border-dark shrink-0"
      >
        <span className="font-sora font-black text-[17px] tracking-tight text-[#0c1e2e] dark:text-[#f0f9ff]">
          CORE<span className="text-primary-light">.</span>
        </span>
        <span className="ml-2 text-[9px] font-mono tracking-[0.18em] uppercase text-muted-light dark:text-[#38bdf8]/60 mt-0.5">
          super
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-2.5 px-3 py-2 mb-0.5 rounded-[3px]
                font-mono text-[11.5px] tracking-[0.06em]
                transition-colors duration-150 group
                ${
                  active
                    ? 'bg-border-light dark:bg-primary-light/15 text-primary-light dark:text-[#38bdf8]'
                    : 'text-stat-label-light dark:text-muted-light hover:bg-[#f0f9ff] dark:hover:bg-[#0c1e2e] hover:text-[#0c1e2e] dark:hover:text-[#f0f9ff]'
                }
              `}
            >
              <Icon
                size={13}
                strokeWidth={active ? 2.2 : 1.8}
                className={`shrink-0 transition-colors ${
                  active
                    ? 'text-primary-light dark:text-[#38bdf8]'
                    : 'text-on-dark dark:text-stat-label-light group-hover:text-primary-light dark:group-hover:text-[#38bdf8]'
                }`}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border-light dark:border-border-dark shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-4 py-2.5 font-mono text-[11.5px] tracking-[0.06em] text-stat-label-light dark:text-muted-light hover:bg-[#f0f9ff] dark:hover:bg-[#0c1e2e] hover:text-[#0c1e2e] dark:hover:text-[#f0f9ff] transition-colors group"
        >
          <ArrowLeft
            size={13}
            strokeWidth={1.8}
            className="shrink-0 text-on-dark dark:text-stat-label-light group-hover:text-primary-light dark:group-hover:text-[#38bdf8] transition-colors"
          />
          Member Dashboard
        </Link>
        <div className="px-4 pb-3 pt-1 border-t border-border-light dark:border-border-dark">
          <p className="text-[9px] font-mono tracking-[0.12em] uppercase text-[#cbd5e1] dark:text-[#1e3a52]">
            coastalreferralxchange.com
          </p>
        </div>
      </div>
    </aside>
  )
}
