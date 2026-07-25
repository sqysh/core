'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/app/lib/constants/motion'

export function AboutSection() {
  return (
    <section className="py-16 md:py-24 bg-bg-light dark:bg-bg-dark">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* ── Left — main content ── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeInUp}
            className="relative col-span-1 lg:col-span-2 border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark px-6 py-8 sm:px-10 sm:py-10 overflow-hidden"
          >
            {/* Tag */}
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
              <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
                About CORE
              </p>
            </div>

            <h2 className="font-sora font-black text-3xl sm:text-4xl lg:text-5xl text-text-light dark:text-text-dark leading-[1.05] tracking-tight mb-5">
              Navigate opportunities with our coastal network
            </h2>

            <p className="font-nunito text-sm sm:text-base text-muted-light dark:text-muted-dark leading-relaxed max-w-lg">
              Every Thursday at 7 AM, 14 professionals from the North Shore sit down together, share referrals, and
              actually help each other grow. Nobody's here to work the room — they're here to build something. If yours
              is open, it might be yours.
            </p>

            {/* Large watermark text */}
            <div
              className="absolute -bottom-6 sm:-bottom-10 left-0 pointer-events-none select-none overflow-hidden"
              aria-hidden="true"
            >
              <p className="text-[80px] sm:text-[120px] lg:text-[180px] font-sora font-black text-text-light/5 dark:text-text-dark/5 leading-none whitespace-nowrap">
                Coastal
              </p>
            </div>
          </motion.div>

          {/* ── Right — cards ── */}
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Card 1 — CTA */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="border border-primary-light dark:border-primary-dark bg-primary-light dark:bg-primary-dark px-6 py-8 sm:px-8 sm:py-10 flex flex-col justify-between gap-6"
            >
              <div>
                <h3 className="font-sora font-black text-xl sm:text-2xl text-white leading-tight mb-3">
                  Meaningful connections for your business
                </h3>
                <p className="font-nunito text-sm sm:text-base text-white/80 leading-relaxed">
                  Strategic, high-quality networking has become essential for modern businesses looking to grow and
                  connect with the right opportunities.
                </p>
              </div>
              <Link
                href="/members"
                className="self-start inline-flex items-center gap-2 h-10 px-4 bg-white/20 border border-white/30 text-white font-sora font-bold text-sm hover:bg-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Explore Members →
              </Link>
            </motion.div>

            {/* Card 2 — stat */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              transition={{ delay: 0.1 }}
              className="border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark px-6 py-8 sm:px-8 sm:py-10 flex flex-col justify-between gap-4"
            >
              <p className="text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark">
                Seamless Networking
              </p>
              <div>
                <motion.p
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="font-sora font-black text-5xl sm:text-6xl text-primary-light dark:text-primary-dark leading-none"
                >
                  14
                </motion.p>
                <p className="text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark mt-2">
                  Active Members
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
