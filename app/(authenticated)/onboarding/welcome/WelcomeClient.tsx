'use client'

import Link from 'next/link'
import { CheckCircle, Map, Users, Calendar, ArrowRight } from 'lucide-react'
import FadeUp from '@/app/components/_shared/FadeUp'
import { getNextQuarterlyDueDate } from '@/app/lib/utils/billing.utils'

interface WelcomeClientProps {
  firstName: string
}

export default function WelcomeClient({ firstName }: WelcomeClientProps) {
  const nextRoomDuesDate = getNextQuarterlyDueDate()

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      {/* ── Header ── */}
      <header className="border-b border-border-light dark:border-border-dark">
        <div className="max-w-160 mx-auto px-4 xs:px-6 h-12 flex items-center justify-between">
          <span className="font-sora font-black text-[18px] tracking-tight">
            <span className="text-text-light dark:text-text-dark">CORE</span>
            <span className="text-primary-light dark:text-primary-dark">.</span>
          </span>
          <span className="text-f10 font-mono tracking-widest uppercase text-primary-light dark:text-primary-dark border border-primary-light/30 dark:border-primary-dark/30 px-2.5 py-1">
            Member
          </span>
        </div>
      </header>

      <div className="max-w-160 mx-auto px-4 xs:px-6 pb-16">
        {/* ── Hero ── */}
        <FadeUp className="pt-12 pb-10 border-b border-border-light dark:border-border-dark text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 border border-primary-light dark:border-primary-dark mb-5">
            <CheckCircle
              size={24}
              className="text-primary-light dark:text-primary-dark"
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </div>

          <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-3">
            You're in
          </p>
          <h1 className="font-sora font-black text-[32px] xs:text-[40px] text-text-light dark:text-text-dark tracking-tight leading-[1.05] mb-4">
            Welcome, {firstName}.
          </h1>
          <p className="font-nunito text-[15px] text-muted-light dark:text-muted-dark leading-relaxed max-w-md mx-auto">
            Your membership is active. Here is everything you need to get started.
          </p>
        </FadeUp>

        {/* ── Membership receipt ── */}
        <FadeUp delay={0.1} className="pt-8 pb-8 border-b border-border-light dark:border-border-dark">
          <p className="text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark mb-4">
            Your Membership
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-border-light dark:border-border-dark">
              <div>
                <p className="font-sora font-bold text-[14px] text-text-light dark:text-text-dark">
                  Annual Admission · Paid
                </p>
                <p className="text-[12px] font-nunito text-muted-light dark:text-muted-dark">
                  Renews automatically next year
                </p>
              </div>
              <p className="font-sora font-black text-[15px] text-text-light dark:text-text-dark tabular-nums">$365</p>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-sora font-bold text-[14px] text-text-light dark:text-text-dark">
                  Room Dues · Scheduled
                </p>
                <p className="text-[12px] font-nunito text-muted-light dark:text-muted-dark">
                  First charge {nextRoomDuesDate}, then every 3 months
                </p>
              </div>
              <p className="font-sora font-bold text-[15px] text-muted-light dark:text-muted-dark tabular-nums">$60</p>
            </div>
          </div>
        </FadeUp>

        {/* ── Next steps ── */}
        <FadeUp delay={0.2} className="pt-8 pb-8 border-b border-border-light dark:border-border-dark">
          <p className="text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark mb-4">
            Get Started
          </p>

          <div className="space-y-px bg-border-light dark:bg-border-dark">
            <NextStep
              href="/profile"
              icon={<Users size={18} aria-hidden="true" />}
              title="Complete your profile"
              description="Add your business, what you do, and what kind of referrals you're looking for"
            />
            <NextStep
              href="/directory"
              icon={<Map size={18} aria-hidden="true" />}
              title="Explore the directory"
              description="Meet the rest of the chapter and find members to connect with"
            />
            <NextStep
              href="/meetings"
              icon={<Calendar size={18} aria-hidden="true" />}
              title="Book your first one-on-one"
              description="One-on-one meetings are where the real referrals happen"
            />
          </div>
        </FadeUp>

        {/* ── CTA ── */}
        <FadeUp delay={0.3} className="pt-8">
          <Link
            href="/dashboard"
            className="w-full h-14 bg-primary-light dark:bg-button-dark text-white dark:text-primary-dark font-sora font-black text-[15px] tracking-wide flex items-center justify-center gap-2.5 hover:bg-primary-light/90 dark:hover:bg-button-dark/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            Go to Dashboard
            <ArrowRight size={16} aria-hidden="true" />
          </Link>

          <p className="text-f10 font-mono text-muted-light dark:text-muted-dark text-center mt-4">
            A receipt has been emailed to you
          </p>
        </FadeUp>
      </div>
    </div>
  )
}

function NextStep({
  href,
  icon,
  title,
  description
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 px-4 py-4 bg-bg-light dark:bg-bg-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
    >
      <div className="shrink-0 w-9 h-9 border border-border-light dark:border-border-dark flex items-center justify-center text-muted-light dark:text-muted-dark group-hover:text-primary-light dark:group-hover:text-primary-dark group-hover:border-primary-light dark:group-hover:border-primary-dark transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-sora font-bold text-[14px] text-text-light dark:text-text-dark mb-0.5">{title}</p>
        <p className="text-[12.5px] font-nunito text-muted-light dark:text-muted-dark leading-relaxed">{description}</p>
      </div>
      <ArrowRight
        size={14}
        className="shrink-0 mt-2 text-muted-light dark:text-muted-dark group-hover:text-primary-light dark:group-hover:text-primary-dark group-hover:translate-x-0.5 transition-all"
        aria-hidden="true"
      />
    </Link>
  )
}
