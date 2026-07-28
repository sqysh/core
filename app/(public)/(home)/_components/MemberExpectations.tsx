'use client'

import { motion } from 'framer-motion'
import { Users, Repeat2, Gift, BarChart3, UserPlus, MapPin, Shield } from 'lucide-react'

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, easing: [0.16, 1, 0.3, 1] } }
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } }
}

const EXPECTATIONS = [
  { icon: Repeat2, title: 'Attend Regularly', body: 'Maintain at least 90% attendance at weekly Thursday meetings.' },
  {
    icon: Users,
    title: 'Meet One-on-One',
    body: 'Meet regularly with fellow members to build relationships and improve referral quality.'
  },
  {
    icon: Gift,
    title: 'Give Referrals',
    body: 'Consistently look for and share referral opportunities with the group.'
  },
  {
    icon: BarChart3,
    title: 'Track Success',
    body: "Report closed business to show the group's impact and celebrate wins together."
  },
  {
    icon: UserPlus,
    title: 'Recruit Members',
    body: 'Invite qualified, growth-minded business leaders to strengthen the chapter.'
  },
  {
    icon: MapPin,
    title: 'North Shore Leader',
    body: 'Be a business owner, partner, or decision-maker in a North Shore-based organization.'
  },
  {
    icon: Shield,
    title: 'Be Professional',
    body: 'Represent yourself and the group with integrity, respect, and reliability.'
  }
]

export function MemberExpectations() {
  return (
    <motion.section
      className="py-12 sm:py-16 md:py-24 bg-bg-light dark:bg-bg-dark"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <motion.div variants={fadeInUp} className="mb-8 sm:mb-10 md:mb-14">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
            <span className="block w-4 sm:w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
            <p className="text-[9px] sm:text-f10 font-mono tracking-[0.15em] sm:tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
              Member Expectations
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
            <h2 className="font-sora font-black text-[1.75rem] xs:text-3xl sm:text-4xl lg:text-5xl text-text-light dark:text-text-dark leading-[1.1] sm:leading-[1.05] tracking-tight max-w-md">
              What it takes to be part of our network
            </h2>
            <p className="font-nunito text-xs sm:text-sm text-muted-light dark:text-muted-dark max-w-xs leading-relaxed">
              CORE members show up for each other. These are the standards that keep the group strong.
            </p>
          </div>
        </motion.div>

        {/* ── Divider ── */}
        <div className="h-px bg-border-light dark:bg-border-dark mb-0" />

        {/* ── Expectations list ── */}
        <motion.div variants={stagger}>
          {EXPECTATIONS.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              variants={fadeInUp}
              className="flex items-start gap-3 sm:gap-5 py-4 sm:py-5 border-b border-border-light dark:border-border-dark"
            >
              {/* Index + icon */}
              <div className="shrink-0 flex items-center gap-2 sm:gap-3 w-auto sm:w-40">
                <span className="text-[9px] sm:text-f10 font-mono text-muted-light dark:text-muted-dark w-4 sm:w-5 text-right">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shrink-0">
                  <Icon
                    size={12}
                    className="sm:w-3.5 sm:h-3.5 text-primary-light dark:text-primary-dark"
                    aria-hidden="true"
                  />
                </div>
                <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark leading-tight hidden sm:block">
                  {title}
                </p>
              </div>

              {/* Title on mobile */}
              <div className="flex-1 min-w-0">
                <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark leading-tight mb-1 sm:hidden">
                  {title}
                </p>
                <p className="font-nunito text-xs sm:text-sm text-muted-light dark:text-muted-dark leading-relaxed">
                  {body}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  )
}
