'use client'

import Link from 'next/link'
import { LinkBody } from '@/components/_shared/LinkBody'
import { motion } from 'framer-motion'
import { MapPin, Clock, Calendar } from 'lucide-react'

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, easing: [0.16, 1, 0.3, 1] } }
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
}

const SCHEDULE = [
  { time: '7:00 AM', label: 'Arrive', note: 'Doors open. Grab some food and get settled.' },
  { time: '7:00–7:15', label: 'Open Networking', note: 'Mingle with members before the meeting kicks off.' },
  {
    time: '7:15 AM',
    label: 'Meeting Starts',
    note: "Brendan opens the meeting. Leadership introductions, Guiding Light's memorable moment, and an Education Moment from Page."
  },
  {
    time: 'Commercials',
    label: '60-Second Commercials',
    note: "Each member shares a quick intro. Visitors go after — you'll have a moment to introduce yourself to the room."
  },
  {
    time: 'Feature',
    label: 'Feature Presentation',
    note: 'An invited guest takes the spotlight for an in-depth presentation on their business. Afterward, members share upcoming events from other groups they belong to.'
  },
  {
    time: 'Round Up',
    label: 'Group Round-Up',
    note: 'We go around the room and share recent wins — referrals passed, face-to-face meetings held, and thank-yous for closed business.'
  }
]

const STATS = [
  { value: '$194K', label: 'Closed Business' },
  { value: '32', label: 'Meetings Held' },
  { value: '17', label: 'Referrals Passed' },
  { value: '14', label: 'Active Members' }
]

export default function VisitorsWelcomeClient() {
  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      {/* ── Hero ── */}
      <section className="border-b border-border-light dark:border-border-dark">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeInUp} className="flex items-center gap-3 mb-6">
              <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
              <p className="text-f10 font-mono tracking-[0.25em] uppercase text-primary-light dark:text-primary-dark">
                Visitor Day · Coastal Referral Exchange
              </p>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="font-sora font-black text-4xl sm:text-5xl lg:text-6xl text-text-light dark:text-text-dark leading-[1.05] tracking-tight mb-6 max-w-2xl"
            >
              Come see what CORE is all about.
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="font-nunito text-base sm:text-lg text-muted-light dark:text-muted-dark leading-relaxed max-w-xl mb-10"
            >
              Every Thursday at 7 AM, 14 North Shore professionals sit down together, share referrals, and actually help
              each other grow. It's 7 AM and everyone actually shows up. Come find out why.
            </motion.p>

            {/* Meta cards */}
            <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
              {[
                { icon: Calendar, label: 'Date', value: 'Every Thursday' },
                { icon: Clock, label: 'Time', value: '7:00 AM – 8:30 AM' },
                { icon: MapPin, label: 'Location', value: '25 N Common St\nLynn, MA 01902' }
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-4 py-4"
                >
                  <Icon
                    size={14}
                    className="text-primary-light dark:text-primary-dark shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark mb-0.5">
                      {label}
                    </p>
                    <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark leading-snug whitespace-pre-line">
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.p
              variants={fadeInUp}
              className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark"
            >
              ✦ Food & refreshments provided
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10"
          >
            {STATS.map(({ value, label }) => (
              <motion.div key={label} variants={fadeInUp}>
                <p className="font-sora font-black text-3xl sm:text-4xl text-text-light dark:text-text-dark leading-none mb-1">
                  {value}
                </p>
                <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark">
                  {label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Schedule ── */}
      <section className="border-b border-border-light dark:border-border-dark">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="flex items-center gap-3 mb-10"
          >
            <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
            <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
              Meeting Schedule
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark"
          >
            {SCHEDULE.map(({ time, label, note }) => (
              <motion.div
                key={label}
                variants={fadeInUp}
                className="flex gap-4 sm:gap-8 px-4 sm:px-6 py-4 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
              >
                <div className="shrink-0 w-20 sm:w-28 pt-0.5">
                  <p className="text-f10 font-mono tracking-wide text-primary-light dark:text-primary-dark">{time}</p>
                </div>
                <div className="min-w-0">
                  <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark leading-tight mb-1">
                    {label}
                  </p>
                  <p className="font-nunito text-sm text-muted-light dark:text-muted-dark leading-relaxed">{note}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Soft CTA ── */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8"
          >
            <motion.div variants={fadeInUp} className="max-w-lg">
              <div className="flex items-center gap-3 mb-5">
                <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
                <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
                  Interested?
                </p>
              </div>
              <h2 className="font-sora font-black text-3xl sm:text-4xl text-text-light dark:text-text-dark leading-[1.05] tracking-tight mb-4">
                See who's already in the room.
              </h2>
              <p className="font-nunito text-base text-muted-light dark:text-muted-dark leading-relaxed">
                Browse our current members and see if your industry seat is open. If it is — we'd love to have you come
                visit.
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0"
            >
              <Link
                href="/members"
                className="inline-flex items-center h-12 px-8 bg-primary-light dark:bg-primary-dark text-white font-sora font-bold text-sm tracking-wide hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
              >
                <LinkBody>Meet the Members →</LinkBody>
              </Link>
              <Link
                href="/application"
                className="inline-flex items-center h-12 px-8 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark font-sora font-bold text-sm tracking-wide hover:text-primary-light dark:hover:text-primary-dark hover:border-primary-light dark:hover:border-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
              >
                <LinkBody>Apply to Join</LinkBody>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
