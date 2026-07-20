'use client'

import FadeUp from '@/app/components/common/FadeUp'
import OnboardingForm from '@/app/components/forms/OnboardingForm'
import { getNextQuarterlyDueDate } from '@/app/lib/utils/billing.utils'
import { useSession } from 'next-auth/react'

export default function OnboardingClient() {
  const nextRoomDuesDate = getNextQuarterlyDueDate()
  const session = useSession()
  const firstName = session.data?.user?.name?.split(' ')[0]

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      {/* ── Header ── */}
      <header className="border-b border-border-light dark:border-border-dark">
        <div className="max-w-160 mx-auto px-4 xs:px-6 h-12 flex items-center justify-between">
          <span className="font-sora font-black text-[18px] tracking-tight">
            <span className="text-text-light dark:text-text-dark">CORE</span>
            <span className="text-primary-light dark:text-primary-dark">.</span>
          </span>
          <span className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark border border-border-light dark:border-border-dark px-2.5 py-1">
            Secure Checkout
          </span>
        </div>
      </header>

      <div className="max-w-160 mx-auto px-4 xs:px-6 pb-16">
        {/* ── Hero ── */}
        <FadeUp className="pt-10 pb-8 border-b border-border-light dark:border-border-dark">
          <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-2">
            Welcome to the chapter
          </p>
          <h1 className="font-sora font-black text-[28px] xs:text-[34px] text-text-light dark:text-text-dark tracking-tight leading-tight mb-3">
            One last step, {firstName}.
          </h1>
          <p className="font-nunito text-[14px] text-muted-light dark:text-muted-dark leading-relaxed">
            Set up your membership below. Your card will be saved for automatic renewal — you will not need to do
            anything after this.
          </p>
        </FadeUp>

        {/* ── What you're paying ── */}
        <FadeUp delay={0.08} className="pt-8 pb-8 border-b border-border-light dark:border-border-dark">
          {/* Annual */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-sora font-bold text-[14px] text-text-light dark:text-text-dark">Annual Admission</p>
              <p className="text-[12px] font-nunito text-muted-light dark:text-muted-dark">
                Due today · renews every year
              </p>
            </div>
            <p className="font-sora font-black text-[22px] text-primary-light dark:text-primary-dark tabular-nums">
              $365
            </p>
          </div>

          {/* Room dues */}
          <div className="flex items-center justify-between pb-6 border-b border-border-light dark:border-border-dark">
            <div>
              <p className="font-sora font-bold text-[14px] text-muted-light dark:text-muted-dark">Room Dues</p>
              <p className="text-[12px] font-nunito text-muted-light dark:text-muted-dark">
                Starts {nextRoomDuesDate} · every 3 months after that
              </p>
            </div>
            <p className="font-sora font-bold text-[16px] text-muted-light dark:text-muted-dark tabular-nums">$60</p>
          </div>

          {/* Note */}
          <div className="border-l-2 border-violet-500 dark:border-violet-400 bg-violet-50 dark:bg-violet-400/5 px-4 py-3 mt-6">
            <p className="text-[12.5px] font-nunito text-text-light dark:text-text-dark leading-relaxed">
              <strong>Only $365 is charged today.</strong> Room dues begin automatically on {nextRoomDuesDate} — nothing
              else is due right now.
            </p>
          </div>
        </FadeUp>

        {/* ── Payment ── */}
        <FadeUp delay={0.18} className="pt-8">
          <OnboardingForm />
        </FadeUp>
      </div>
    </div>
  )
}
