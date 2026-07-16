'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { store } from '@/app/lib/redux/store'
import { setOpenNavigationDrawer } from '@/app/lib/redux/slices/appSlice'
import { Menu } from 'lucide-react'
import { LaunchAppButton } from '../common/LaunchAppButton'
import { AnimatedHeadline } from './AnimatedHeadline'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { announceGame } from '@/app/lib/actions/games/wheel/announceGame'
import { createGame } from '@/app/lib/actions/games/createGame'

const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false })

const navLinkCls = (active: boolean) =>
  `text-f10 font-mono tracking-[0.2em] uppercase transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
    active ? 'text-white' : 'text-white/50 hover:text-white'
  }`

export default function HeroSection() {
  const { data: session } = useSession()
  const router = useRouter()
  const [launching, setLaunching] = useState(false)
  const isSuperUser = session?.user?.role === 'SUPER_USER'

  async function launchGame() {
    if (launching) return
    setLaunching(true)
    await createGame('WHEEL') // 1. create the game FIRST
    await announceGame() // 2. then tell everyone to go to /games
    router.push('/games?view=tv') // 3. host to the TV
  }

  return (
    <section className="relative min-h-screen">
      {/* ── Ocean Spline — full screen ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Spline
          scene="https://prod.spline.design/2IXftBG73k86x6wG/scene.splinecode"
          style={{
            background: 'transparent',
            width: '100%',
            height: '100%'
          }}
        />
        <div className="absolute inset-0 bg-black/30 pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-bg-dark to-transparent pointer-events-none z-10" />
      </div>

      {/* ── Header — embedded ── */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 sm:px-6 h-14 sm:h-18.5">
        <Link
          href="/"
          className="font-sora font-black text-lg sm:text-xl text-white tracking-tight hover:text-white/80 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Coastal Referral Exchange — Home"
        >
          CORE<span className="text-primary-dark">.</span>
        </Link>

        <nav
          className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-8"
          aria-label="Main navigation"
        >
          <Link href="/" className={navLinkCls(true)}>
            Home
          </Link>
          <Link href="/platform" className={navLinkCls(true)}>
            Platform
          </Link>
          <Link href="/members" className={navLinkCls(false)}>
            Members
          </Link>
          <Link href="/visitors-welcome" className={navLinkCls(false)}>
            Visitors
          </Link>
          <Link href="/application" className={navLinkCls(false)}>
            Apply
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-5">
          <button
            onClick={() => store.dispatch(setOpenNavigationDrawer())}
            className="block md:hidden text-white hover:text-white/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <LaunchAppButton />
        </div>
      </div>

      {/* ── Content — bottom on mobile, centered on lg ── */}
      <div className="relative z-20 min-h-screen flex flex-col justify-end lg:justify-center px-4 sm:px-12 lg:px-20 max-w-3xl lg:max-w-none lg:w-1/2 pointer-events-none pt-20 pb-10 sm:pb-12">
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
            href="/login"
            className="h-11 sm:h-12 px-6 sm:px-8 bg-white text-bg-dark font-bold text-xs sm:text-sm tracking-wide hover:bg-white/90 active:bg-white/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 inline-flex items-center justify-center"
          >
            Launch App
          </Link>
          <Link
            href="/application"
            className="h-11 sm:h-12 px-6 sm:px-8 border border-white/40 text-white/80 font-bold text-xs sm:text-sm tracking-wide hover:bg-white/10 hover:border-white/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white inline-flex items-center justify-center"
          >
            Apply to Join →
          </Link>
          {isSuperUser && (
            <button
              onClick={launchGame}
              disabled={launching}
              aria-label="Launch Sqyeel of Fortune"
              className="group relative h-11 sm:h-12 px-6 sm:px-8 inline-flex items-center justify-center overflow-hidden border border-amber-300/60 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-dark"
              style={{
                background: 'radial-gradient(120% 160% at 50% 0%, #1e4fa3 0%, #0a2a6b 55%, #041845 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 10px rgba(4,24,69,0.5)'
              }}
            >
              <span
                className="font-black text-xs sm:text-sm tracking-[0.08em] uppercase text-center"
                style={{
                  background: 'linear-gradient(180deg, #FFF4C2 0%, #FFD54A 42%, #E8A11C 62%, #B8760E 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 1px 0 rgba(0,0,0,0.35)',
                  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))'
                }}
              >
                {launching ? 'Starting…' : 'Sqyeel of Fortune'}
              </span>
            </button>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="flex items-center gap-4 xs:gap-6 sm:gap-12 pointer-events-none"
        >
          {[
            { value: '14', label: 'Active Members' },
            { value: '1', label: 'Seat Per Industry' },
            { value: '7AM', label: 'Every Thursday' }
          ].map(({ value, label }, i) => (
            <Fragment key={i}>
              <div className="min-w-0">
                <p className="font-sora font-black text-xl xs:text-2xl sm:text-3xl text-white leading-none drop-shadow">
                  {value}
                </p>
                <p className="text-[8px] xs:text-[9px] sm:text-f10 font-mono tracking-[0.15em] sm:tracking-widest uppercase text-white sm:text-white/50 mt-1 leading-tight">
                  {label}
                </p>
              </div>
              {i < 2 && <span key={`sep-${i}`} className="w-px h-7 sm:h-8 bg-white/20 shrink-0" aria-hidden="true" />}
            </Fragment>
          ))}
        </motion.div>
      </div>

      {/* ── Right sidebar (desktop only) ── */}
      <div className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 z-20 hidden lg:flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <p className="text-[9px] font-mono tracking-[0.3em] uppercase text-white/40 rotate-90 mb-4">Scroll</p>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-12 bg-linear-to-b from-white/40 to-transparent"
          />
        </div>

        <div className="w-px h-8 bg-white/20" />

        <a
          href="https://facebook.com/coastalreferralexchange"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          className="text-white/40 hover:text-white/80 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        </a>
      </div>

      <div className="absolute inset-x-0 h-[20%] sm:h-[50%] bottom-0 bg-linear-to-t from-white dark:from-bg-dark via-transparent to-transparent/0 pointer-events-none z-10" />
    </section>
  )
}
