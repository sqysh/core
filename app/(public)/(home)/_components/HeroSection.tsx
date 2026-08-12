'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { AnimatedHeadline } from './hero/AnimatedHeadline'
import EmbeddedHeader from './hero/EmbeddedHeader'
import OceanSpline from './hero/OceanSpline'
import { Stats } from './hero/Stats'
import { RightSidebar } from './hero/RightSidebar'

export default function HeroSection({ isLoggedIn }) {
  return (
    <section className="relative min-h-screen">
      {/* ── Ocean Spline — full screen ── */}
      <OceanSpline />

      {/* ── Header — embedded ── */}
      <EmbeddedHeader />

      {/* ── Content — bottom on mobile, centered on lg ── */}
      <div className="relative z-20 min-h-screen flex flex-col justify-end lg:justify-center px-4 sm:px-12 lg:px-20 max-w-7xl pointer-events-none pt-20 pb-10 sm:pb-12">
        {/* Tag */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6"
        >
          <span className="block w-4 sm:w-5 h-px bg-white/60 shrink-0" aria-hidden="true" />
          <p className="text-[9px] sm:text-f10 font-mono tracking-[0.2em] sm:tracking-[0.25em] uppercase text-white/60 leading-tight">
            <span className="inline-block whitespace-nowrap">Coastal Referral Exchange</span>
            <span className="mx-1 sm:mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className="inline-block whitespace-nowrap">Boston's North Shore</span>
          </p>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-4 sm:mb-5"
        >
          <h1 className="font-sora font-black text-[1.7rem] xs:text-[2.25rem] sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight drop-shadow-lg">
            <AnimatedHeadline />
          </h1>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="font-nunito text-sm sm:text-base lg:text-lg text-white/70 leading-relaxed max-w-sm mb-6 sm:mb-8 drop-shadow"
        >
          North Shore professionals meeting every Thursday at 7 AM. One seat per industry. No competition — only
          collaboration.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col xs:flex-row items-stretch xs:items-center gap-3 xs:gap-4 mb-8 sm:mb-12 pointer-events-auto"
        >
          <Link
            href={isLoggedIn ? '/dashboard' : '/login'}
            className="h-11 sm:h-12 px-6 sm:px-8 bg-white text-bg-dark font-bold text-xs sm:text-sm tracking-wide hover:bg-white/90 active:bg-white/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 inline-flex items-center justify-center"
          >
            {isLoggedIn ? 'Dashboard' : 'Launch App'}
          </Link>
          <Link
            href="/application"
            className="h-11 sm:h-12 px-6 sm:px-8 border border-white/40 text-white/80 font-bold text-xs sm:text-sm tracking-wide hover:bg-white/10 hover:border-white/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white inline-flex items-center justify-center"
          >
            Apply to Join →
          </Link>
        </motion.div>

        {/* Stats */}
        <Stats />
      </div>

      {/* ── Right sidebar (desktop only) ── */}
      <RightSidebar />

      <div className="absolute inset-x-0 h-[20%] sm:h-[50%] bottom-0 bg-linear-to-t from-white dark:from-bg-dark via-transparent to-transparent/0 pointer-events-none z-10" />
    </section>
  )
}
