'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/app/lib/constants/motion'
import { PLATFORM_FEATURES, WHY_IT_MATTERS_OPTS } from '@/app/lib/constants/public/platform.constants'
import { LogFeed } from '@/app/components/public/platform/LogFeed'

export default function PlatformPage() {
  return (
    <main className="bg-bg-light dark:bg-bg-dark min-h-screen">
      {/* Hero */}
      <section className="border-b border-border-light dark:border-border-dark relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
              <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
                The Platform Behind CORE
              </p>
            </div>

            <h1 className="font-sora font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-text-light dark:text-text-dark leading-[1.05] tracking-tight mb-6">
              Most networking groups
              <br />
              run on paper.
              <br />
              <span className="text-primary-light dark:text-primary-dark">We don't.</span>
            </h1>

            <p className="font-nunito text-base sm:text-lg md:text-xl text-muted-light dark:text-muted-dark max-w-2xl leading-relaxed">
              Walk into a CORE meeting and scan a QR code — your photo lights up on the TV at the front of the room, and
              you're checked in. That's just the start of how every referral, visitor, and dollar of closed business
              gets captured by a platform built specifically for us.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/visitors-welcome"
                className="inline-flex items-center gap-2 px-6 py-3 border border-primary-light dark:border-primary-dark bg-primary-light dark:bg-primary-dark text-bg-light dark:text-bg-dark font-mono text-f10 tracking-[0.2em] uppercase font-bold hover:opacity-90 transition-opacity"
              >
                Visit a Meeting →
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-mono text-f10 tracking-[0.2em] uppercase font-bold hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors"
              >
                See How It Works
              </Link>
            </div>
          </motion.div>

          <div
            className="absolute -bottom-6 sm:-bottom-10 right-0 pointer-events-none select-none overflow-hidden hidden md:block"
            aria-hidden="true"
          >
            <p className="text-[120px] lg:text-[200px] font-sora font-black text-text-light/4 dark:text-text-dark/4 leading-none whitespace-nowrap">
              Platform
            </p>
          </div>
        </div>
      </section>

      {/* Live log feed */}
      <LogFeed />

      {/* Stats */}
      <section className="border-b border-border-light dark:border-border-dark">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeInUp}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { label: 'Built In-House', value: '100%' },
              { label: 'Check-In Time', value: '<2s' },
              { label: 'Lost Referrals', value: 'Zero' },
              { label: 'Paper Sign-Ins', value: 'None' }
            ].map((stat) => (
              <div key={stat.label}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="block w-3 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
                  <p className="text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark">
                    {stat.label}
                  </p>
                </div>
                <p className="font-sora font-black text-4xl md:text-5xl text-primary-light dark:text-primary-dark">
                  {stat.value}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why It Matters */}
      <section className="border-b border-border-light dark:border-border-dark">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeInUp}
          >
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
              <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
                Why It Matters
              </p>
            </div>

            <h2 className="font-sora font-black text-3xl sm:text-4xl lg:text-5xl text-text-light dark:text-text-dark leading-[1.05] tracking-tight mb-6 max-w-3xl">
              Networking groups live or die on accountability. Ours is built in.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mt-12">
            {WHY_IT_MATTERS_OPTS.map((item, i) => (
              <motion.div
                key={item.num}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={fadeInUp}
                transition={{ delay: i * 0.1 }}
                className="border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark px-6 py-8"
              >
                <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-3">
                  {item.num} · {item.title}
                </p>
                <p className="font-nunito text-sm sm:text-base text-muted-light dark:text-muted-dark leading-relaxed">
                  {item.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature sections */}
      <section id="features">
        {PLATFORM_FEATURES.map((feature, idx) => {
          const Visual = feature.Visual
          return (
            <div
              key={feature.eyebrow}
              className={`border-b border-border-light dark:border-border-dark ${
                idx % 2 === 1 ? 'bg-bg-light dark:bg-surface-dark' : ''
              }`}
            >
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div
                  className={`grid md:grid-cols-2 gap-12 lg:gap-20 items-center ${
                    idx % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''
                  }`}
                >
                  {/* Copy */}
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                    variants={fadeInUp}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0"
                        aria-hidden="true"
                      />
                      <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
                        {String(idx + 1).padStart(2, '0')} · {feature.eyebrow}
                      </p>
                    </div>

                    <h2 className="font-sora font-black text-3xl sm:text-4xl lg:text-5xl text-text-light dark:text-text-dark leading-[1.05] tracking-tight mb-5">
                      {feature.title}
                    </h2>

                    <p className="font-nunito text-sm sm:text-base lg:text-lg text-muted-light dark:text-muted-dark leading-relaxed mb-6">
                      {feature.description}
                    </p>

                    <ul className="space-y-2">
                      {feature.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex items-start gap-3 font-nunito text-sm text-text-light dark:text-text-dark"
                        >
                          <span className="text-primary-light dark:text-primary-dark font-mono text-xs mt-1.5 shrink-0">
                            ▸
                          </span>
                          <span className="inline-block">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>

                  {/* Visual */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.8 }}
                    className="relative"
                  >
                    <div className="border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark min-h-60 xs:min-h-70 sm:min-h-80 flex items-center justify-center">
                      <Visual />
                    </div>
                    <p className="text-[9px] sm:text-f10 font-mono tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark mt-2 sm:mt-3">
                      Live · Running in your browser
                    </p>
                  </motion.div>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      {/* Closing CTA */}
      <section className="border-b border-border-light dark:border-border-dark relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeInUp}
          >
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
              <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
                See It In Person
              </p>
              <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
            </div>

            <h2 className="font-sora font-black text-4xl sm:text-5xl md:text-6xl text-text-light dark:text-text-dark leading-[1.05] tracking-tight mb-6">
              Come visit a meeting.
              <br />
              <span className="text-primary-light dark:text-primary-dark">Bring your phone.</span>
            </h2>

            <p className="font-nunito text-base sm:text-lg text-muted-light dark:text-muted-dark leading-relaxed mb-10 max-w-2xl mx-auto">
              The best way to understand CORE is to sit in. Thursdays at 7:00 AM in Lynn, MA. Coffee, food, and a room
              full of people who refer business to each other.
            </p>

            <Link
              href="/visitors-welcome"
              className="inline-flex items-center gap-2 px-8 py-4 border border-primary-light dark:border-primary-dark bg-primary-light dark:bg-primary-dark text-bg-light dark:text-bg-dark font-mono text-f10 tracking-[0.2em] uppercase font-bold hover:opacity-90 transition-opacity"
            >
              Visit a Meeting →
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  )
}
