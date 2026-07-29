'use client'

import { Users, Activity, DollarSign, Clock, FileText, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { AdminDashboardData } from '@/lib/actions/admin/getAdminDashboardData'
import { StatTile } from '@/app/(authenticated)/(active)/admin/_components/StatTile'
import { RecentActivityItem } from '@/app/(authenticated)/(active)/admin/_components/RecentActivityItem'
import { SectionLabel } from '@/components/_shared/SectionLabel'
import FadeUp from '@/components/_shared/FadeUp'

export default function AdminDashboardClient({ data }: { data: AdminDashboardData }) {
  const { stats, recentActivity } = data

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <main className="max-w-170 mx-auto px-4 pb-12">
        {/* ── Header ── */}
        <FadeUp className="pt-7 pb-5 border-b border-border-light dark:border-border-dark mb-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
                Admin
              </p>
              <h1 className="font-sora font-black text-[22px] xs:text-[28px] text-text-light dark:text-text-dark tracking-tight leading-none">
                Chapter Overview
              </h1>
            </div>
            <Link
              href="/dashboard"
              className="shrink-0 flex items-center gap-1.5 h-8 px-3 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark hover:border-primary-light dark:hover:border-primary-dark transition-colors text-f10 font-mono tracking-widest uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
            >
              <LayoutDashboard size={12} aria-hidden="true" />
              <span className="hidden xs:inline">Dashboard</span>
            </Link>
          </div>
        </FadeUp>

        {/* ── Stats ── */}
        <FadeUp delay={0.05} className="mb-6">
          <div className="grid grid-cols-3 border-t border-l border-border-light dark:border-border-dark">
            <StatTile value={stats.totalRevenue} label="Revenue" icon={DollarSign} delay={0.06} />
            <StatTile value={stats.totalParleys} label="Meetings" icon={Users} delay={0.09} />
            <StatTile value={stats.totalReferrals} label="Referrals" icon={Activity} delay={0.12} />
            <StatTile value={stats.totalAnchors} label="Closed" icon={Clock} delay={0.15} />
            <StatTile value={stats.activeMembers} label="Members" icon={Users} delay={0.18} />
            <StatTile value={stats.pendingApps} label="Pending" icon={FileText} delay={0.21} />
          </div>
        </FadeUp>

        {/* ── Recent activity ── */}
        <FadeUp delay={0.25}>
          <SectionLabel>Recent Activity</SectionLabel>
          <ul className="border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark max-h-100 overflow-y-auto">
            {recentActivity.length === 0 && (
              <li className="px-4 py-6 text-center text-[12.5px] font-nunito text-muted-light dark:text-muted-dark">
                No activity yet
              </li>
            )}
            {recentActivity.map((item, i) => {
              return <RecentActivityItem key={i} item={item} i={i} />
            })}
          </ul>
        </FadeUp>
      </main>
    </div>
  )
}
