'use client'

import { useState } from 'react'
import QuickActions from '../../components/dashboard/QuickActions'
import Link from 'next/link'
import PresenterSchedule from '../../components/PresentersSchedule'
import { MemberList } from '../../components/dashboard/MemberList'
import LinkedRecordModal from '../../components/modals/LinkedRecordModal'
import { HistoryTabs } from '../../components/dashboard/HistoryTabs'
import { GmailPrompt } from '../../components/dashboard/GmailPrompt'
// import MembershipSetup from '../dashboard/MembershipSetup'
import FadeUp from '../../components/common/FadeUp'
import { SectionLabel } from '../../components/common/SectionLabel'
import { Greeting } from '../../components/dashboard/Greeting'
import { GmailConfirmation } from '../../components/dashboard/GmailConfirmation'
import { ActivityStats } from '../../components/dashboard/ActivityStats'
import { EventButton } from '../../components/dashboard/EventButton'
import { EventsList } from '../../components/dashboard/EventsList'
import VisitorPanel from '../../components/dashboard/VisitorPanel'
import { useSession } from 'next-auth/react'
import { PrimaryEmailPrompt } from '../../components/dashboard/PrimaryEmailPrompt'
import { MemberDashboardProps } from '@/types/dashboard.types'

export default function DashboardClient({
  currentUser,
  members,
  stats,
  recentActivity,
  schedule,
  linkedRecord,
  events,
  visitors,
  closestVisitorDay,
  membership
}: MemberDashboardProps) {
  const session = useSession()
  const signedInWith = session.data.user.signedInWith
  const [open, setOpen] = useState(linkedRecord ? true : false)

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <LinkedRecordModal record={linkedRecord} setOpen={setOpen} open={open} />
      <main className="max-w-170 mx-auto px-4 pb-12">
        {/* ── Greeting ── */}
        <FadeUp delay={0.025} className="pt-7 pb-5">
          <Greeting currentUser={currentUser} />
        </FadeUp>

        <FadeUp delay={0.5}>
          <div className="h-px bg-border-light dark:bg-border-dark" role="separator" />
        </FadeUp>

        {signedInWith === 'secondaryEmail' ? (
          <PrimaryEmailPrompt />
        ) : (
          <>
            {/* ── Gmail prompt ── */}
            {!currentUser.secondaryEmail ? (
              <FadeUp delay={0.1} className="pt-4">
                <GmailPrompt />
              </FadeUp>
            ) : (
              <FadeUp delay={0.1} className="pt-4">
                <GmailConfirmation />
              </FadeUp>
            )}
          </>
        )}

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

        {/* ── Membership setup ── */}
        {/* <FadeUp delay={0.15} className="pt-6">
          <MembershipSetup membership={membership} />
        </FadeUp> */}

        {/* ── Onboarding preview ── */}
        <FadeUp delay={0.15} className="pt-6">
          <div className="border border-border-light dark:border-border-dark px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-f10 font-mono tracking-[0.15em] uppercase text-primary-light dark:text-primary-dark mb-0.5">
                Coming Soon
              </p>
              <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark leading-tight truncate">
                New Member Payment Flow
              </p>
            </div>
            <Link
              href="/onboarding"
              className="shrink-0 h-8 px-3 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark hover:border-primary-light dark:hover:border-primary-dark transition-colors text-f10 font-mono tracking-widest uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark inline-flex items-center"
            >
              Preview →
            </Link>
          </div>
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
          <PresenterSchedule schedule={schedule ?? []} className="pt-6" />
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
