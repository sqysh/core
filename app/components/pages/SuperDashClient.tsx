'use client'

import { Users, Activity, DollarSign, Clock, LogOut, LayoutDashboard, Logs } from 'lucide-react'
import { SuperUserDashboardData, SuperUserEvent } from '@/app/lib/actions/super-user/superUserActions'
import { signOut } from 'next-auth/react'
import PresenterQueueManager from '../super-dash/PresenterQueueManager'
import { AnchorsPanel } from '../super-dash/AnchorsPanel'
import VisitorDaysPanel from '../super-dash/VisitorDaysPanel'
import { ReferralsPanel } from '../super-dash/ReferralsPanel'
import { CancelledMeetingsPanel } from '../super-dash/CancelledMeetingsPanel'
import { Face2FacePanel } from '../super-dash/Face2FacePanel'
import { MembersPanel } from '../super-dash/MembersPanel'
import Link from 'next/link'
import { StatTile } from '../super-dash/StatTitle'
import FadeUp from '../common/FadeUp'
import { ApplicantsPanel } from '../super-dash/ApplicantsPanel'
import { createTestUser } from '@/app/lib/actions/user/createTestUser'
import { useRouter } from 'next/navigation'
import { ChapterSettingsPanel } from '../super-dash/ChapterSettingsPanel'
import { Chapter } from '@/types/user'
import { QueueMember } from '@/types/presenter-queue'
import { VisitorPanel } from '../super-dash/VisitorPanel'
import { EventsPanel } from '../super-dash/EventsPanel'

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

const sharedBtnStyles = `shrink-0 mt-1 flex items-center gap-2 h-9 px-4 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark hover:border-primary-light dark:hover:border-primary-dark transition-colors text-f10 font-mono tracking-[0.15em] uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark`

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
        <FadeUp className="pt-7 pb-6 border-b border-border-light dark:border-border-dark mb-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
                Superuser
              </p>
              <h1 className="font-sora font-black text-[28px] text-text-light dark:text-text-dark tracking-tight leading-none">
                Chapter Overview
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  await createTestUser()
                  router.refresh()
                }}
                className={sharedBtnStyles}
              >
                Add Test User
              </button>
              <Link href="/super/attendance-history" className={sharedBtnStyles}>
                <Users size={13} aria-hidden="true" />
                Attendance History
              </Link>
              <Link href="/super/logs" className={sharedBtnStyles}>
                <Logs size={13} aria-hidden="true" />
                Logs
              </Link>
              <Link href="/dashboard" className={sharedBtnStyles}>
                <LayoutDashboard size={13} aria-hidden="true" />
                Dashboard
              </Link>
              <button onClick={() => signOut({ callbackUrl: '/auth/login' })} className={sharedBtnStyles}>
                <LogOut size={13} aria-hidden="true" />
                Sign Out
              </button>
            </div>
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
