'use client'

import { Users, Activity, DollarSign, Clock, LogOut, LayoutDashboard, Logs } from 'lucide-react'
import { signOut } from 'next-auth/react'
import PresenterQueueManager from '../../../components/super-dash/PresenterQueueManager'
import { AnchorsPanel } from '../../../components/super-dash/AnchorsPanel'
import VisitorDaysPanel from '../../../components/super-dash/VisitorDaysPanel'
import { ReferralsPanel } from '../../../components/super-dash/ReferralsPanel'
import { CancelledMeetingsPanel } from '../../../components/super-dash/CancelledMeetingsPanel'
import { Face2FacePanel } from '../../../components/super-dash/Face2FacePanel'
import { MembersPanel } from '../../../components/super-dash/MembersPanel'
import Link from 'next/link'
import { StatTile } from '../../../components/super-dash/StatTitle'
import FadeUp from '../../../components/common/FadeUp'
import { ApplicantsPanel } from '../../../components/super-dash/ApplicantsPanel'
import { createTestUser } from '@/app/lib/actions/user/createTestUser'
import { useRouter } from 'next/navigation'
import { ChapterSettingsPanel } from '../../../components/super-dash/ChapterSettingsPanel'
import { Chapter } from '@/types/user.types'
import { QueueMember } from '@/types/presenter-queue.types'
import { VisitorPanel } from '../../../components/super-dash/VisitorPanel'
import { EventsPanel } from '../../../components/super-dash/EventsPanel'
import { SuperUserDashboardData, SuperUserEvent } from '@/types/super.types'

type TSuperDashClient = {
  data: SuperUserDashboardData
  queue: QueueMember[]
  availableMembers: { id: string; name: string; company: string }[]
  cancelledMeetings: { id: string; date: string; reason: string }[]
  visitorDays: { id: string; date: string }[]
  dates: string[]
  startIndex: number
  chapter: Chapter
  events: SuperUserEvent[]
}

export default function SuperDashClient({
  data,
  queue,
  availableMembers,
  cancelledMeetings,
  visitorDays,
  dates,
  startIndex,
  chapter,
  events
}: TSuperDashClient) {
  const router = useRouter()
  const { stats, members, applicants, parleys, referrals, anchors, visitors } = data

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <div className="max-w-480 w-full mx-auto px-4 xs:px-6 pb-12">
        {/* ── Header ── */}
        <FadeUp className="pt-5 sm:pt-7 pb-5 sm:pb-6 border-b border-border-light dark:border-border-dark mb-5 sm:mb-6">
          {/* Title */}
          <div className="mb-4">
            <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
              Superuser
            </p>
            <h1 className="font-sora font-black text-2xl sm:text-[28px] text-text-light dark:text-text-dark tracking-tight leading-none">
              Chapter Overview
            </h1>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={async () => {
                await createTestUser()
                router.refresh()
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-border-light dark:border-border-dark text-[10px] font-mono tracking-[0.15em] uppercase text-text-light dark:text-text-dark hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors"
            >
              Add Test User
            </button>
            <Link
              href="/super/attendance-history"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-border-light dark:border-border-dark text-[10px] font-mono tracking-[0.15em] uppercase text-text-light dark:text-text-dark hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors"
            >
              <Users size={11} aria-hidden="true" />
              Attendance
            </Link>
            <Link
              href="/super/logs"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-border-light dark:border-border-dark text-[10px] font-mono tracking-[0.15em] uppercase text-text-light dark:text-text-dark hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors"
            >
              <Logs size={11} aria-hidden="true" />
              Logs
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-border-light dark:border-border-dark text-[10px] font-mono tracking-[0.15em] uppercase text-text-light dark:text-text-dark hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors"
            >
              <LayoutDashboard size={11} aria-hidden="true" />
              Dashboard
            </Link>
            <button
              onClick={() => signOut({ redirectTo: '/login' })}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-border-light dark:border-border-dark text-[10px] font-mono tracking-[0.15em] uppercase text-text-light dark:text-text-dark hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors"
            >
              <LogOut size={11} aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </FadeUp>

        {/* ── Stats strip ── */}
        <FadeUp delay={0.05} className="mb-6">
          <div className="grid grid-cols-2 1000:grid-cols-4 border border-border-light dark:border-border-dark">
            <StatTile value={stats.activeMembers} label="Active members" icon={Users} delay={0.06} />
            <StatTile value={stats.meetingsTotal} label="Meetings" icon={Clock} delay={0.09} />
            <StatTile value={stats.referralsOpen} label="Open referrals" icon={Activity} delay={0.12} />
            <StatTile value={stats.closedTotal} label="Closed" icon={DollarSign} delay={0.15} />
          </div>
        </FadeUp>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 1000:grid-cols-[1fr_1fr] gap-5 mb-5">
          <div className="flex flex-col gap-5">
            <FadeUp delay={0.18}>
              <MembersPanel members={members} />
            </FadeUp>
            {applicants.length > 0 && (
              <FadeUp delay={0.22}>
                <ApplicantsPanel applicants={applicants} />
              </FadeUp>
            )}
            {visitors.length > 0 && (
              <FadeUp delay={0.24}>
                <VisitorPanel visitors={visitors} />
              </FadeUp>
            )}
            <FadeUp delay={0.26}>
              <ChapterSettingsPanel chapter={chapter} />
            </FadeUp>
          </div>
          <div className="flex flex-col gap-5">
            <FadeUp delay={0.2}>
              <EventsPanel events={events} />
            </FadeUp>
            <FadeUp delay={0.22}>
              <Face2FacePanel parleys={parleys} />
            </FadeUp>
            <FadeUp delay={0.24}>
              <ReferralsPanel referrals={referrals} />
            </FadeUp>
            <FadeUp delay={0.28}>
              <AnchorsPanel anchors={anchors} />
            </FadeUp>
          </div>
        </div>

        {/* ── Presenter management ── */}
        <FadeUp delay={0.32}>
          <div className="grid grid-cols-1 1000:grid-cols-3 gap-5">
            <PresenterQueueManager
              initialQueue={queue}
              availableMembers={availableMembers}
              dates={dates}
              startIndex={startIndex}
            />
            <CancelledMeetingsPanel cancelledMeetings={cancelledMeetings} />
            <VisitorDaysPanel visitorDays={visitorDays} cancelledDates={cancelledMeetings.map((c) => c.date)} />
          </div>
        </FadeUp>
      </div>
    </div>
  )
}
