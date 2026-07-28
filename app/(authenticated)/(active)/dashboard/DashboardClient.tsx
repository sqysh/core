'use client'

import QuickActions from './_components/QuickActions'
import Link from 'next/link'
import PresenterSchedule from './_components/PresentersSchedule'
import { MemberList } from './_components/MemberList'
import { HistoryTabs } from './_components/HistoryTabs'
import FadeUp from '../../../../components/_shared/FadeUp'
import { SectionLabel } from '../../../../components/_shared/SectionLabel'
import { Greeting } from './_components/Greeting'
import { ActivityStats } from './_components/ActivityStats'
import { EventButton } from './_components/EventButton'
import { EventsList } from './_components/EventsList'
import VisitorPanel from './_components/VisitorPanel'
import { MemberDashboardProps } from '@/types/dashboard.types'
import { AttendancePanel } from '@/app/(authenticated)/(active)/dashboard/_components/AttendancePanel'
import MembershipSetupPanel from '@/app/(authenticated)/(active)/dashboard/_components/MembershipSetupPanel'

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
