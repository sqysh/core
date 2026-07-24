'use client'

import QuickActions from '../../../components/dashboard/QuickActions'
import Link from 'next/link'
import PresenterSchedule from '../../../components/PresentersSchedule'
import { MemberList } from '../../../components/dashboard/MemberList'
import { HistoryTabs } from '../../../components/dashboard/HistoryTabs'
import FadeUp from '../../../components/common/FadeUp'
import { SectionLabel } from '../../../components/common/SectionLabel'
import { Greeting } from '../../../components/dashboard/Greeting'
import { ActivityStats } from '../../../components/dashboard/ActivityStats'
import { EventButton } from '../../../components/dashboard/EventButton'
import { EventsList } from '../../../components/dashboard/EventsList'
import VisitorPanel from '../../../components/dashboard/VisitorPanel'
import { MemberDashboardProps } from '@/types/dashboard.types'
import { AttendancePanel } from '@/app/components/dashboard/AttendancePanel'
import MembershipSetupPanel from '@/app/components/dashboard/MembershipSetupPanel'

export default function DashboardClient({
  currentUser,
  members,
  stats,
  recentActivity,
  schedule,
  events,
  visitors,
  closestVisitorDay,
  membership,
  attendances,
  exclusions
}: MemberDashboardProps) {
  // Unwrap action results into clean shapes for child components
  const scheduleData = schedule.data ?? []
  const attendanceData = attendances.data ?? {
    rows: [],
    attended: 0,
    total: 0
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <main className="max-w-170 mx-auto px-4 pb-12">
        {/* ── Greeting ── */}
        <FadeUp delay={0.025} className="pt-7 pb-5">
          <Greeting currentUser={currentUser} />
        </FadeUp>

        <FadeUp delay={0.05}>
          <div className="h-px bg-border-light dark:bg-border-dark" role="separator" />
        </FadeUp>

        {/* ── Membership setup ── */}
        <FadeUp delay={0.1} className="pt-6">
          <MembershipSetupPanel membership={membership} />
        </FadeUp>

        {/* ── Quick actions ── */}
        <FadeUp delay={0.15} className="pt-6">
          <SectionLabel>Quick Actions</SectionLabel>
          <QuickActions members={members} variant="card" />
        </FadeUp>

        {/* Activity Stats */}
        <FadeUp delay={0.15} className="pt-6">
          <SectionLabel>Your Activity</SectionLabel>
          <ActivityStats stats={stats} />
        </FadeUp>

        <FadeUp delay={0.15} className="pt-6">
          <SectionLabel>Your Attendance</SectionLabel>
          <AttendancePanel
            attended={attendanceData.attended}
            rows={attendanceData.rows}
            total={attendanceData.total}
            exclusions={exclusions}
            membership={membership}
            memberCreatedAt={currentUser.createdAt}
          />
        </FadeUp>

        {/* ── Events ── */}
        <FadeUp delay={0.15} className="pt-6">
          <SectionLabel>Events</SectionLabel>
          <EventButton />
          <EventsList events={events} />
          <Link
            href="/events"
            className="mt-2 inline-flex items-center gap-1.5 text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            View Past →
          </Link>
        </FadeUp>

        {/* ── Visitors ── */}
        <FadeUp delay={0.15} className="pt-6">
          <SectionLabel>Visitors</SectionLabel>
          <VisitorPanel visitors={visitors} closestVisitorDay={closestVisitorDay} />
        </FadeUp>

        {/* ── History ── */}
        <FadeUp delay={0.15} className="pt-6">
          <SectionLabel>History</SectionLabel>
          <HistoryTabs recentActivity={recentActivity} />
        </FadeUp>

        {/* Presenter Schedle */}
        <FadeUp delay={0.15} className="pt-6">
          <PresenterSchedule schedule={scheduleData} className="pt-6" />
        </FadeUp>

        {/* ── Members ── */}
        <FadeUp delay={0.15} className="pt-6">
          <SectionLabel>Members</SectionLabel>
          <MemberList members={members} />
        </FadeUp>
      </main>
    </div>
  )
}
