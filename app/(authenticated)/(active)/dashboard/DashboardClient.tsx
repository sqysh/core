'use client'

import QuickActions from './_components/QuickActions'
import Link from 'next/link'
import PresenterSchedule from './_components/PresentersSchedule'
import { MemberList } from './_components/MemberList'
import { HistoryTabs } from './_components/HistoryTabs'
import FadeUp from '@/components/_shared/FadeUp'
import { SectionLabel } from '@/components/_shared/SectionLabel'
import { Greeting } from './_components/Greeting'
import { ActivityStats } from './_components/ActivityStats'
import { EventButton } from './_components/EventButton'
import { EventsList } from './_components/EventsList'
import VisitorPanel from './_components/VisitorPanel'
import { MemberDashboardProps, ModalKey } from '@/types/dashboard.types'
import { AttendancePanel } from '@/app/(authenticated)/(active)/dashboard/_components/AttendancePanel'
import MembershipSetupPanel from '@/app/(authenticated)/(active)/dashboard/_components/MembershipSetupPanel'
import { GuidingLightPanel } from './_components/GuidingLightPanel'
import { useCallback, useEffect, useRef, useState } from 'react'
import FloatingQuickActions from './_components/FloatingQuickActions'
import LeadershipPanel from './_components/LeadershipPanel'

const JUMP_LINKS = [
  { id: 'membership', label: 'Membership' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'activity', label: 'Activity' },
  { id: 'presenters', label: 'Presenters' },
  { id: 'guiding-light', label: 'Guiding Light' },
  { id: 'leadership', label: 'Leadership' },
  { id: 'events', label: 'Events' },
  { id: 'visitors', label: 'Visitors' },
  { id: 'history', label: 'History' },
  { id: 'members', label: 'Members' }
]

export function useActiveSection(ids: string[], offset = 120) {
  const [active, setActive] = useState(ids[0])
  const lockedRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const select = useCallback((id: string) => {
    lockedRef.current = id
    setActive(id)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      lockedRef.current = null
    }, 800)
  }, [])

  useEffect(() => {
    function onScroll() {
      if (lockedRef.current) return

      const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 2
      if (atBottom) {
        setActive(ids[ids.length - 1])
        return
      }

      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= offset) current = id
      }
      setActive(current)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [ids, offset])

  return { active, select }
}

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
  exclusions,
  guidingLight,
  leadership
}: MemberDashboardProps) {
  const [floatingModal, setFloatingModal] = useState<ModalKey>(null)

  const scheduleData = schedule.data ?? []
  const attendanceData = attendances.data ?? { rows: [], attended: 0, total: 0 }

  const membershipComplete = !!membership.annualOrder && !!membership.quarterlyOrder

  const jumpLinks = membershipComplete ? JUMP_LINKS.filter((l) => l.id !== 'membership') : JUMP_LINKS
  const ids = jumpLinks.map((l) => l.id)
  const { active: activeSection, select } = useActiveSection(ids)

  return (
    <main id="main-content" className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <div className="max-w-170 mx-auto px-4 pb-28">
        {/* ── Greeting ── */}
        <FadeUp delay={0.025} className="pt-7 pb-5">
          <Greeting currentUser={currentUser} showBilling={membershipComplete} />
        </FadeUp>

        <FadeUp delay={0.05}>
          <div className="h-px bg-border-light dark:bg-border-dark" role="separator" />
        </FadeUp>

        {/* ── Jump nav ── */}
        <nav
          className="sticky top-0 z-30 -mx-4 px-4 bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark"
          aria-label="Jump to section"
        >
          <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
            {jumpLinks.map(({ id, label }) => {
              const active = activeSection === id
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    select(id)
                    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  data-active={active || undefined}
                  aria-current={active ? 'true' : undefined}
                  ref={(el) => {
                    if (active && el) el.scrollIntoView({ block: 'nearest', inline: 'center' })
                  }}
                  className={`shrink-0 h-12 flex items-center text-[14px] font-mono border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark ${
                    active
                      ? 'text-primary-light dark:text-primary-dark border-primary-light dark:border-primary-dark font-bold'
                      : 'text-muted-light dark:text-muted-dark border-transparent hover:text-primary-light dark:hover:text-primary-dark'
                  }`}
                >
                  {label}
                </a>
              )
            })}
          </div>
        </nav>

        {/* ── Membership setup ── */}
        {!membershipComplete && (
          <FadeUp delay={0.1} className="pt-6 scroll-mt-16" id="membership">
            <MembershipSetupPanel membership={membership} />
          </FadeUp>
        )}

        {/* ── Quick actions ── */}
        <QuickActions
          members={members}
          variant="card"
          initialModal={floatingModal}
          onModalClose={() => setFloatingModal(null)}
        />

        <FloatingQuickActions onAction={(key: string) => setFloatingModal(key as ModalKey)} />

        {/* ── Your attendance ── */}
        <FadeUp delay={0.15} className="pt-8 scroll-mt-16" id="attendance">
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

        {/* ── Your activity ── */}
        <FadeUp delay={0.15} className="pt-8 scroll-mt-16" id="activity">
          <SectionLabel>Your Activity</SectionLabel>
          <ActivityStats stats={stats} />
        </FadeUp>

        {/* ── Presenter schedule ── */}
        <FadeUp delay={0.15} className="pt-8 scroll-mt-16" id="presenters">
          <SectionLabel>Presenter Schedule</SectionLabel>
          <PresenterSchedule schedule={scheduleData} />
        </FadeUp>

        {/* ── Guiding Light ── */}
        <FadeUp delay={0.15} className="pt-8 scroll-mt-16" id="guiding-light">
          <SectionLabel>Guiding Light</SectionLabel>
          <GuidingLightPanel currentJudge={guidingLight.currentJudge} records={guidingLight.records} />
        </FadeUp>

        {/* ── Leadership ── */}
        <FadeUp delay={0.15} className="pt-8 scroll-mt-16" id="leadership">
          <SectionLabel>Leadership Team</SectionLabel>
          <LeadershipPanel season={leadership.season} seats={leadership.seats} totalSeats={leadership.totalSeats} />
        </FadeUp>

        {/* ── Events ── */}
        <FadeUp delay={0.15} className="pt-8 scroll-mt-16" id="events">
          <SectionLabel>Events</SectionLabel>
          <EventButton />
          <EventsList events={events} />
          <div className="px-4 py-3 border-b border-x border-border-light dark:border-border-dark">
            <Link
              href="/events"
              className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
            >
              View Past →
            </Link>
          </div>
        </FadeUp>

        {/* ── Visitors ── */}
        <FadeUp delay={0.15} className="pt-8 scroll-mt-16" id="visitors">
          <SectionLabel>Visitors</SectionLabel>
          <VisitorPanel visitors={visitors} closestVisitorDay={closestVisitorDay} />
        </FadeUp>

        {/* ── History ── */}
        <FadeUp delay={0.15} className="pt-8 scroll-mt-16" id="history">
          <SectionLabel>History</SectionLabel>
          <HistoryTabs recentActivity={recentActivity} />
        </FadeUp>

        {/* ── Members ── */}
        <FadeUp delay={0.15} className="pt-8 scroll-mt-16" id="members">
          <SectionLabel>Members</SectionLabel>
          <MemberList members={members} />
        </FadeUp>
      </div>
    </main>
  )
}
